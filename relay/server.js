/* VibeMap Relay v8.2 — خادم التوصيل (مع إصلاحات الأمان)
 * يحفظ الرسائل المشفّرة (لا يقدر يقرأها) حتى يستلمها الصديق، ويوقظ جواله بإشعار عبر Firebase Cloud Messaging.
 * بدون مكتبات خارجية: Node 18 أو أحدث فقط.
 * الإعدادات من متغيرات البيئة:
 *   PORT (8095)  DATA_DIR (/var/lib/vibemap-relay)  SA_FILE (/etc/vibemap/service-account.json)
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 8095;
const HOST = process.env.HOST || '127.0.0.1';
const DATA = process.env.DATA_DIR || '/var/lib/vibemap-relay';
const SA_FILE = process.env.SA_FILE || (process.env.CREDENTIALS_DIRECTORY ? path.join(process.env.CREDENTIALS_DIRECTORY, 'sa') : '/etc/vibemap/service-account.json');
const PIN_RE = /^VM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;
const B64_RE = /^[A-Za-z0-9+/=_-]+$/;
const MAX_BODY = 4.5 * 1024 * 1024;       // حجم الطلب
const BOX_MAX_ITEMS = 400;                 // رسائل معلّقة لكل مستخدم
const BOX_MAX_BYTES = 25 * 1024 * 1024;    // حجم الصندوق لكل مستخدم
const PAIR_MAX_BYTES = 8 * 1024 * 1024, PAIR_MAX_ITEMS = 120;     // من مرسل واحد لمستلم واحد
const STRANGER_MAX_BYTES = 1.5 * 1024 * 1024, STRANGER_MAX_ITEMS = 6; // من شخص مو في قائمة المستلم
const ITEM_MAX = 3.6e6;                    // أكبر رسالة
const DISK_MAX = +process.env.DISK_MAX || 2 * 1024 ** 3; // كل الصناديق مجتمعة
const CACHE_MAX = 160 * 1024 * 1024;       // ذاكرة الصناديق
const POST_MIN_AGE = process.env.POST_MIN_AGE != null ? +process.env.POST_MIN_AGE : 10 * 60e3;   // عمر الحساب قبل أول منشور
const REPORT_MIN_AGE = process.env.REPORT_MIN_AGE != null ? +process.env.REPORT_MIN_AGE : 24 * 3600e3; // عمر الحساب ليُحسب بلاغه
const TTL_MS = 7 * 24 * 3600e3;            // تُحذف الرسائل غير المستلمة بعد 7 أيام
const PUSH_KINDS = new Set(['sos', 'sosoff', 'msg', 'voice', 'photo', 'room', 'friend', 'accept', 'poke', 'react', 'shot', 'voicereq']);
const REQ_KINDS = new Set(['friend', 'voicereq', 'accept']); // تنبيهات مسموحة من غير الأصدقاء (بحدود أشد)
const DEMO_RE = /^VM-DEMO-/;
/* v8.2: IPv6 — نعدّ كل /64 كعنوان واحد عشان ما يتجاوزون الحدود بتغيير العنوان */
const ipKey = ip => { ip = String(ip || '').replace(/^::ffff:/, ''); return ip.includes(':') ? ip.split(':').slice(0, 4).join(':') : ip; };

fs.mkdirSync(path.join(DATA, 'box'), { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ─── التسجيل: رقم VibeMap ← بصمة المفتاح السري + رمز الإشعارات ─── */
const REG_FILE = path.join(DATA, 'reg.json');
let REG = {};
try { REG = JSON.parse(fs.readFileSync(REG_FILE, 'utf8')); } catch (e) { REG = {}; }
let regDirty = false;
/* v8.1: فهرس الجهاز ← الرقم (عشان يرجع نفس الرقم بعد إعادة التثبيت) */
const DEVS = new Map(); for (const p in REG) if (REG[p].dh) DEVS.set(REG[p].dh, p);
const saveReg = () => { regDirty = true; };
let regWriting = false;
setInterval(() => { if (!regDirty || regWriting) return; regDirty = false; regWriting = true; const tmp = REG_FILE + '.tmp';
  fs.promises.writeFile(tmp, JSON.stringify(REG)).then(() => fs.promises.rename(tmp, REG_FILE)).catch(e => log('reg write', e.message)).finally(() => { regWriting = false; }); }, 3000).unref();
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const eq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function auth(b) {
  const pin = typeof b.pin === 'string' ? b.pin.toUpperCase() : '';
  if (!PIN_RE.test(pin) || typeof b.key !== 'string' || b.key.length < 32 || b.key.length > 100) return null;
  const r = REG[pin]; if (!r || r.dead || !eq(r.kh, sha(b.key))) return null;
  const t = Date.now(); if (!r.seen || t - r.seen > 3600e3) { r.seen = t; saveReg(); } return pin;
}

/* ─── الصناديق ─── */
const BOX = new Map(); const boxDirty = new Set();
const size = x => x.ct.length + x.iv.length + 80;
const boxBytes = arr => arr.reduce((s, x) => s + size(x), 0);
let DISK_USED = 0; // حجم كل الصناديق على القرص (تقريبي)
const BOXSZ = new Map();
try { for (const f of fs.readdirSync(path.join(DATA, 'box'))) { if (!f.endsWith('.json')) continue; const st = fs.statSync(path.join(DATA, 'box', f)); BOXSZ.set(f.slice(0, -5), st.size); DISK_USED += st.size; } } catch (e) { }
let CACHE_USED = 0;
function box(pin) {
  if (BOX.has(pin)) { const a = BOX.get(pin); BOX.delete(pin); BOX.set(pin, a); return a; } // الأحدث استخداماً في الآخر
  let arr = []; try { arr = JSON.parse(fs.readFileSync(path.join(DATA, 'box', pin + '.json'), 'utf8')); } catch (e) { }
  const t = Date.now(); arr = arr.filter(x => t - x.ts < TTL_MS);
  BOX.set(pin, arr); CACHE_USED += boxBytes(arr); return arr;
}
function trimCache() {
  if (CACHE_USED <= CACHE_MAX) return;
  for (const [k, a] of BOX) { if (CACHE_USED <= CACHE_MAX * .8) break; if (boxDirty.has(k)) continue; CACHE_USED -= boxBytes(a); BOX.delete(k); }
}
setInterval(() => {
  for (const pin of boxDirty) {
    const arr = BOX.get(pin) || []; const f = path.join(DATA, 'box', pin + '.json');
    try { const old = BOXSZ.get(pin) || 0;
      if (!arr.length) { fs.rmSync(f, { force: true }); BOXSZ.delete(pin); DISK_USED -= old; }
      else { const j = JSON.stringify(arr); fs.writeFileSync(f + '.tmp', j); fs.renameSync(f + '.tmp', f); BOXSZ.set(pin, j.length); DISK_USED += j.length - old; } } catch (e) { log('box write', pin, e.message); }
  }
  boxDirty.clear(); trimCache();
}, 1500).unref();

/* ─── حدود الاستخدام (ضد الإزعاج) ─── */
const RL = new Map();
function limited(key, max, winMs) {
  const t = Date.now(); let e = RL.get(key);
  if (!e || t - e.s > winMs) { e = { s: t, n: 0 }; RL.set(key, e); }
  return ++e.n > max;
}
setInterval(() => { const t = Date.now(); for (const [k, e] of RL) if (t - e.s > 3600e3) RL.delete(k); }, 600e3).unref();

/* ─── Firebase Cloud Messaging (HTTP v1) ─── */
let SA = null; try { SA = JSON.parse(fs.readFileSync(SA_FILE, 'utf8')); } catch (e) { log('⚠️ لا يوجد ملف حساب الخدمة — الإشعارات متوقفة، التوصيل يعمل'); }
let TOK = { v: null, exp: 0 };
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
async function accessToken() {
  if (TOK.v && Date.now() < TOK.exp - 60e3) return TOK.v;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: SA.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = b64u(crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(SA.private_key));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + claim + '.' + sig });
  const j = await r.json(); if (!j.access_token) throw new Error('oauth ' + JSON.stringify(j).slice(0, 200));
  TOK = { v: j.access_token, exp: Date.now() + j.expires_in * 1000 }; return TOK.v;
}
async function push(to, data, urgent) {
  const r = REG[to]; if (!SA || !r || !r.fcm) return false;
  try {
    const t = await accessToken();
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${SA.project_id}/messages:send`, {
      method: 'POST', headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json' },
      body: JSON.stringify({ message: { token: r.fcm, data, android: { priority: 'HIGH', ttl: urgent ? '3600s' : '86400s' } } }) });
    if (res.status === 404 || res.status === 400) { const j = await res.json().catch(() => ({})); const st = JSON.stringify(j);
      if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(st)) { delete r.fcm; saveReg(); } return false; }
    return res.ok;
  } catch (e) { log('push', e.message); return false; }
}

/* ─── المسارات ─── */
const H = {};
H['/api/health'] = async () => ({ ok: true, v: '8.2', push: !!SA });

// v8.1: استرجاع الرقم المرتبط بهذا الجهاز
H['/api/whoami'] = async (b, ip) => {
  if (typeof b.dev !== 'string' || b.dev.length < 32 || b.dev.length > 100) return [400, { err: 'bad' }];
  if (limited('who:' + ipKey(ip), 200, 3600e3)) return [429, { err: 'slow' }];
  const pin = DEVS.get(sha('dev:' + b.dev)); return { ok: true, pin: pin || null };
};

// تسجيل الجهاز أو تحديث رمز الإشعارات
H['/api/reg'] = async (b, ip) => {
  const pin = typeof b.pin === 'string' ? b.pin.toUpperCase() : '';
  if (!PIN_RE.test(pin) || DEMO_RE.test(pin) || typeof b.key !== 'string' || b.key.length < 32 || b.key.length > 100) return [400, { err: 'bad' }];
  const kh = sha(b.key); let r = REG[pin];
  const dh = typeof b.dev === 'string' && b.dev.length >= 32 && b.dev.length <= 100 ? sha('dev:' + b.dev) : null;
  if (r && (r.dead || !eq(r.kh, kh))) {
    /* نفس الجهاز بعد إعادة التثبيت (أو بعد حذف الحساب): نسمح بتجديد المفتاح. رقم محذوف ما يرجع إلا لجهازه */
    if (dh && r.dh && eq(r.dh, dh)) { r.kh = kh; delete r.dead; } else return [403, { err: 'taken' }];
  }
  if (!r) { if (limited('reg:' + ipKey(ip), 300, 3600e3) || limited('reg:all', 3000, 3600e3)) return [429, { err: 'slow' }]; r = REG[pin] = { kh, ts: Date.now() }; }
  /* v8.2: قائمة أصدقائك (أرقام فقط) — التنبيهات تُقبل منهم بس، وغيرهم بحدود صغيرة */
  if (Array.isArray(b.allow)) r.allow = [...new Set(b.allow.filter(x => typeof x === 'string' && PIN_RE.test(x)))].slice(0, 1000);
  const fcm = typeof b.fcm === 'string' && b.fcm.length < 400 ? b.fcm : null;
  if (fcm) { for (const p in REG) if (p !== pin && REG[p].fcm === fcm) delete REG[p].fcm; r.fcm = fcm; } else if (b.fcm === '') delete r.fcm;
  if (dh && !r.dh) { const other = DEVS.get(dh); if (other && other !== pin && REG[other]) delete REG[other].dh; r.dh = dh; DEVS.set(dh, pin); }
  r.plat = ['android', 'ios', 'web'].includes(b.plat) ? b.plat : 'web'; r.seen = Date.now(); saveReg();
  return { ok: true, push: !!SA, fcm: !!r.fcm, pending: box(pin).length };
};

// إرسال رسائل مشفّرة لصديق
H['/api/send'] = async (b, ip) => {
  const from = auth(b); if (!from) return [401, { err: 'auth' }];
  const to = typeof b.to === 'string' ? b.to.toUpperCase() : '';
  if (!PIN_RE.test(to) || to === from) return [400, { err: 'to' }];
  const R = REG[to]; if (!R || R.dead) return [404, { err: 'noreg' }]; /* v8.2: ما نخزن لأرقام غير موجودة */
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 20) return [400, { err: 'items' }];
  if (limited('send:' + from, 120, 60e3) || limited('ip:' + ipKey(ip), 400, 60e3)) return [429, { err: 'slow' }];
  if (DISK_USED > DISK_MAX) { log('⚠️ disk budget full'); return [507, { err: 'full' }]; }
  const known = Array.isArray(R.allow) && R.allow.includes(from); // المرسل في قائمة أصدقاء المستلم
  const arr = box(to); const t = Date.now(); let added = 0;
  let total = boxBytes(arr), mine = 0, mineN = 0; for (const x of arr) if (x.f === from) { mine += size(x); mineN++; }
  for (const it of b.items) {
    if (!it || !ID_RE.test(it.id || '') || typeof it.iv !== 'string' || typeof it.ct !== 'string' || it.iv.length > 40 || it.ct.length > ITEM_MAX || !B64_RE.test(it.iv) || !B64_RE.test(it.ct)) return [400, { err: 'item' }];
    if (arr.some(x => x.f === from && x.id === it.id)) continue;
    const x = { f: from, id: it.id, iv: it.iv, ct: it.ct, ts: t }, sz = size(x);
    /* الصندوق ممتلئ: نرفض الجديد بدل ما نحذف رسائل قديمة (عشان أحد ما يقدر يمسح رسائلك بالإغراق) */
    const pairB = known ? PAIR_MAX_BYTES : STRANGER_MAX_BYTES, pairN = known ? PAIR_MAX_ITEMS : STRANGER_MAX_ITEMS;
    if (mine + sz > pairB || mineN + 1 > pairN || total + sz > BOX_MAX_BYTES || arr.length + 1 > BOX_MAX_ITEMS) { if (added) boxDirty.add(to); return [507, { err: 'box', queued: added }]; }
    arr.push(x); added++; mine += sz; mineN++; total += sz; CACHE_USED += sz;
  }
  if (added) boxDirty.add(to);
  let pushed = false;
  const k = b.push && PUSH_KINDS.has(b.push.k) ? b.push.k : null;
  /* v8.2: التنبيه فقط من أصدقاء المستلم. طلبات الصداقة من الغرباء بحد صغير، والاسم ما نرسله (الجوال يعرض الاسم المحفوظ عنده) */
  if (k && added && (known || REQ_KINDS.has(k))) {
    const urgent = k === 'sos' && known;
    const cap = !known ? (limited(`pr:${to}`, 10, 3600e3) || limited(`prs:${from}`, 30, 3600e3)) : urgent ? limited(`ps:${from}:${to}`, 6, 600e3) : limited(`pm:${from}:${to}`, 30, 600e3);
    const r = k === 'react' && /^(❤️|😂|😮|😢|🔥|👏)$/u.test(String(b.push.r || '')) ? b.push.r : '';
    if (!cap) pushed = await push(to, { t: 'vm', k: known ? k : (k === 'accept' ? 'accept' : 'friend'), f: from, n: known ? '' : String(b.push.n || '').replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, '').slice(0, 24), r }, urgent);
  }
  return { ok: true, queued: added, pushed };
};

// استلام الرسائل المعلّقة
H['/api/inbox'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  const arr = box(pin); const out = []; let bytes = 0;
  for (const x of arr) { if (bytes + size(x) > 6e6 && out.length) break; out.push(x); bytes += size(x); if (out.length >= 60) break; }
  return { ok: true, items: out, more: arr.length > out.length };
};

// تأكيد الاستلام (حذف من الصندوق)
H['/api/ack'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (!Array.isArray(b.ids) || b.ids.length > 200) return [400, { err: 'ids' }];
  const set = new Set(b.ids.filter(x => typeof x === 'string').map(String));
  const arr = box(pin); const keep = arr.filter(x => !set.has(x.f + '/' + x.id));
  if (keep.length !== arr.length) { CACHE_USED -= boxBytes(arr) - boxBytes(keep); BOX.set(pin, keep); boxDirty.add(pin); }
  return { ok: true, left: keep.length };
};

// إلغاء التسجيل (عند حذف كل شيء)
H['/api/unreg'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  /* v8.2: نترك «شاهد قبر» فيه بصمة الجهاز فقط — الرقم ما يقدر أحد ثاني يسجله، ويرجع لنفس الجهاز لو أعاد التثبيت */
  const old = REG[pin]; REG[pin] = { dead: true, ts: Date.now(), kh: '-', ...(old && old.dh ? { dh: old.dh } : {}) };
  PUB.delete(pin); saveReg(); const a = BOX.get(pin); if (a) CACHE_USED -= boxBytes(a); BOX.set(pin, []); boxDirty.add(pin); return { ok: true };
};

/* ═══ v8.1: الظهور للجميع — من يختار «ظاهر للجميع» يطلع للي حوله على الرادار ═══ */
const PUB = new Map();                 // pin → { n, c, lat, lng, pub, bio, lvl, rt, ts }
const PUB_TTL = 10 * 60e3, NEAR_M = 5000;
const clean = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, n) : '';
const JWK_RE = /^[A-Za-z0-9_-]{43}$/;
const distM = (a, b) => { const R = 6371e3, t = x => x * Math.PI / 180, dl = t(b.lat - a.lat), dn = t(b.lng - a.lng);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
setInterval(() => { const t = Date.now(); for (const [k, v] of PUB) if (t - v.ts > PUB_TTL) PUB.delete(k); }, 60e3).unref();
H['/api/pub/set'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (b.on !== true) { PUB.delete(pin); return { ok: true, on: false }; }
  const lat = +b.lat, lng = +b.lng; if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return [400, { err: 'loc' }];
  const pub = b.pub && JWK_RE.test(b.pub.x || '') && JWK_RE.test(b.pub.y || '') ? { kty: 'EC', crv: 'P-256', x: b.pub.x, y: b.pub.y } : null; if (!pub) return [400, { err: 'pub' }];
  if (limited('pubset:' + pin, 40, 600e3)) return [429, { err: 'slow' }];
  /* v8.2: ما نخزن الموقع الدقيق أبداً — نثبّته على شبكة ~250م (والتطبيق يرسله مثبّت أصلاً) */
  const G = 0.0025, snap = v => Math.round(v / G) * G;
  PUB.set(pin, { n: clean(b.name, 24) || 'مستخدم', c: /^#[0-9A-Fa-f]{6}$/.test(b.color || '') ? b.color : '#6A4DF5', lat: snap(lat), lng: snap(lng), pub,
    bio: clean(b.bio, 160), work: clean(b.work, 40), tags: clean(b.tags, 80), lvl: Math.max(0, Math.min(9, b.lvl | 0)), rt: Math.max(0, Math.min(5, +b.rt || 0)), ts: Date.now() });
  return { ok: true, on: true };
};
H['/api/pub/near'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  const me = { lat: +b.lat, lng: +b.lng }; if (!isFinite(me.lat) || !isFinite(me.lng)) return [400, { err: 'loc' }];
  if (limited('near:' + pin, 60, 600e3)) return [429, { err: 'slow' }];
  const t = Date.now(), out = [];
  for (const [p, v] of PUB) {
    if (p === pin || t - v.ts > PUB_TTL) continue;
    const d = distM(me, v); if (d > NEAR_M) continue;
    /* الموقع تقريبي (شبكة ~250م) والمسافة بشرائح عريضة — ما يقدر أحد يحدد مكانك بالتثليث */
    const band = d < 500 ? 250 : d < 1000 ? 750 : d < 2000 ? 1500 : d < 3500 ? 3000 : 5000;
    out.push({ pin: p, n: v.n, c: v.c, lat: v.lat, lng: v.lng, d: band, pub: v.pub, bio: v.bio, work: v.work, tags: v.tags, lvl: v.lvl, rt: v.rt, ago: Math.round((t - v.ts) / 1000) });
  }
  out.sort((a, b) => a.d - b.d);
  return { ok: true, items: out.slice(0, 60) };
};

/* ═══ v8.1: الساحة — منشورات عامة بالهاشتاقات (#جدة #اليوم_الوطني) ═══ */
const SQ_FILE = path.join(DATA, 'square.json'), SQ_IMG = path.join(DATA, 'sq');
fs.mkdirSync(SQ_IMG, { recursive: true });
const SQ_TTL = 72 * 3600e3, SQ_MAX = 5000;
let SQ = []; try { SQ = JSON.parse(fs.readFileSync(SQ_FILE, 'utf8')); } catch (e) { SQ = []; }
let sqDirty = false, sqWriting = false;
setInterval(() => {
  const t = Date.now(); const keep = [];
  for (const p of SQ) { if (t - p.ts < SQ_TTL) keep.push(p); else { if (p.img) fs.rm(path.join(SQ_IMG, p.id + '.jpg'), () => {}); sqDirty = true; } }
  SQ = keep;
  if (!sqDirty || sqWriting) return; sqDirty = false; sqWriting = true;
  fs.promises.writeFile(SQ_FILE + '.tmp', JSON.stringify(SQ)).then(() => fs.promises.rename(SQ_FILE + '.tmp', SQ_FILE)).catch(e => log('sq write', e.message)).finally(() => { sqWriting = false; });
}, 3000).unref();
const TAG_RE = /#([\p{L}\p{N}_]{2,30})/gu;
const tagsOf = s => [...new Set([...String(s).matchAll(TAG_RE)].map(m => m[1].toLowerCase()))].slice(0, 6);
const sqView = (p, me) => ({ id: p.id, pin: p.pin, n: p.n, c: p.c, lvl: p.lvl, rt: p.rt, text: p.text, tags: p.tags, img: !!p.img, ts: p.ts, likes: p.likes.length, liked: p.likes.includes(me), mine: p.pin === me, city: p.city || '' });
H['/api/sq/post'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (limited('sqpost:' + pin, 12, 3600e3) || limited('sqpost:all', 400, 3600e3)) return [429, { err: 'slow' }];
  if (Date.now() - (REG[pin].ts || 0) < POST_MIN_AGE) return [403, { err: 'new' }]; /* الحسابات الجديدة جداً تنتظر 10 دقائق */
  const text = clean(b.text, 500); if (!text && !b.photo) return [400, { err: 'empty' }];
  const tags = tagsOf(text + ' ' + clean(b.tags, 200)); if (!tags.length) return [400, { err: 'tag' }];
  const id = crypto.randomBytes(9).toString('base64url');
  let img = false;
  if (b.photo) {
    const m = /^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.photo)); if (!m || m[2].length > 600000) return [400, { err: 'photo' }];
    const buf = Buffer.from(m[2], 'base64');
    const ok = (buf[0] === 0xFF && buf[1] === 0xD8) || buf.slice(0, 4).toString() === 'RIFF' || buf.slice(1, 4).toString() === 'PNG'; if (!ok) return [400, { err: 'photo' }];
    fs.writeFileSync(path.join(SQ_IMG, id + '.jpg'), buf); img = m[1];
  }
  const u = REG[pin] || {};
  const p = { id, pin, n: clean(b.name, 24) || 'مستخدم', c: /^#[0-9A-Fa-f]{6}$/.test(b.color || '') ? b.color : '#6A4DF5', lvl: Math.max(0, Math.min(9, b.lvl | 0)), rt: Math.max(0, Math.min(5, +b.rt || 0)),
    text, tags, img, ts: Date.now(), likes: [], reports: [], city: clean(b.city, 30) };
  SQ.unshift(p); while (SQ.length > SQ_MAX) { const o = SQ.pop(); if (o.img) fs.rm(path.join(SQ_IMG, o.id + '.jpg'), () => {}); } sqDirty = true;
  return { ok: true, post: sqView(p, pin) };
};
H['/api/sq/feed'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  const tag = typeof b.tag === 'string' ? b.tag.replace(/^#/, '').toLowerCase().slice(0, 30) : '';
  const before = +b.before || Infinity; const blocked = new Set(Array.isArray(b.blocked) ? b.blocked.slice(0, 500) : []);
  const out = [];
  for (const p of SQ) { if (p.ts >= before || p.hidden || blocked.has(p.pin)) continue; if (tag && !p.tags.includes(tag)) continue; if (b.mine && p.pin !== pin) continue; out.push(sqView(p, pin)); if (out.length >= 30) break; }
  return { ok: true, items: out };
};
H['/api/sq/trends'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  const t = Date.now(), cnt = new Map();
  for (const p of SQ) { if (p.hidden || t - p.ts > 24 * 3600e3) continue; for (const g of p.tags) cnt.set(g, (cnt.get(g) || 0) + 1); }
  return { ok: true, tags: [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, n]) => ({ tag, n })) };
};
H['/api/sq/like'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (limited('like:' + pin, 120, 600e3)) return [429, { err: 'slow' }];
  const p = SQ.find(x => x.id === b.id); if (!p) return [404, { err: 'nf' }];
  const i = p.likes.indexOf(pin); if (i < 0 && p.likes.length >= 5000) return { ok: true, likes: p.likes.length, liked: false }; if (i >= 0) p.likes.splice(i, 1); else p.likes.push(pin); sqDirty = true;
  return { ok: true, likes: p.likes.length, liked: i < 0 };
};
H['/api/sq/report'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (limited('rep:' + pin, 20, 24 * 3600e3)) return [429, { err: 'slow' }];
  const p = SQ.find(x => x.id === b.id); if (!p) return [404, { err: 'nf' }];
  /* v8.2: البلاغ يُحسب فقط من حساب عمره يوم فأكثر (ضد الحسابات الوهمية) */
  const aged = Date.now() - (REG[pin].ts || 0) >= REPORT_MIN_AGE;
  if (pin !== p.pin && !p.reports.includes(pin)) { p.reports.push(pin); if (aged) p.rw = (p.rw || 0) + 1; }
  if ((p.rw || 0) >= 3) p.hidden = true; /* يختفي بعد 3 بلاغات من حسابات حقيقية */
  sqDirty = true; log('sq report', p.id, p.reports.length, clean(b.why, 60));
  return { ok: true };
};
H['/api/sq/del'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  const i = SQ.findIndex(x => x.id === b.id && x.pin === pin); if (i < 0) return [404, { err: 'nf' }];
  const [p] = SQ.splice(i, 1); if (p.img) fs.rm(path.join(SQ_IMG, p.id + '.jpg'), () => {}); sqDirty = true; return { ok: true };
};
function sqImage(res, id) {
  const p = /^[A-Za-z0-9_-]{12}$/.test(id) && SQ.find(x => x.id === id);
  if (!p || !p.img || p.hidden) { res.writeHead(404); return res.end(); }
  fs.readFile(path.join(SQ_IMG, id + '.jpg'), (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'image/' + (p.img === true ? 'jpeg' : p.img), 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET, OPTIONS', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(obj)); };
  const url = (req.url || '').split('?')[0].replace(/^\/relay/, '');
  if (req.method === 'OPTIONS') return send(204, {});
  if (req.method === 'GET' && url.startsWith('/api/sq/img/')) return sqImage(res, url.slice(12));
  const h = H[url]; if (!h) return send(404, { err: 'nf' });
  const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || '');
  if (req.method === 'GET') { if (url !== '/api/health') return send(405, { err: 'method' }); return h({}, ip).then(r => send(200, r)); }
  if (req.method !== 'POST') return send(405, { err: 'method' });
  let len = 0; const chunks = [];
  req.on('data', c => { len += c.length; if (len > MAX_BODY) { send(413, { err: 'big' }); req.destroy(); } else chunks.push(c); });
  req.on('end', async () => {
    if (len > MAX_BODY) return;
    let b; try { b = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return send(400, { err: 'json' }); }
    if (!b || typeof b !== 'object') return send(400, { err: 'json' });
    try { const r = await h(b, ip); if (Array.isArray(r)) send(r[0], r[1]); else send(200, r); } catch (e) { log('err', url, e.message); send(500, { err: 'server' }); }
  });
});
server.listen(PORT, HOST, () => log(`VibeMap relay on ${HOST}:${PORT} — push ${SA ? 'ON' : 'OFF'}`));
const bye = () => { try { fs.writeFileSync(REG_FILE, JSON.stringify(REG)); fs.writeFileSync(SQ_FILE, JSON.stringify(SQ)); for (const pin of boxDirty) { const arr = BOX.get(pin) || []; const f = path.join(DATA, 'box', pin + '.json'); if (!arr.length) fs.rmSync(f, { force: true }); else fs.writeFileSync(f, JSON.stringify(arr)); } } catch (e) { } process.exit(0); };
process.on('SIGTERM', bye); process.on('SIGINT', bye);
