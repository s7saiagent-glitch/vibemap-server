/* VibeMap Relay v8.4 — خادم التوصيل + لوحة التحكم
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
const NEWS_PIN = 'VM-NEWS-0000';
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
  const r = REG[pin]; if (!r || r.dead || r.banned || !eq(r.kh, sha(b.key))) return null;
  const t = Date.now(); if (!r.seen || t - r.seen > 3600e3) { r.seen = t; saveReg(); } noteIp(r, b._ip); return pin;
}
/* v8.7: سجل عناوين IP لكل حساب (آخر 30 عنوان، تنحذف بعد 180 يوم) — للرجوع له عند طلب رسمي من جهة مختصة فقط.
   محتوى الرسائل والصوت ما يوصل السيرفر (مشفّر بين الأجهزة)، فهذا كل اللي نقدر نحفظه. */
const LOG_KEEP = 180 * 864e5;
function noteIp(r, ip) {
  ip = String(ip || '').replace(/^::ffff:/, '').slice(0, 45); if (!ip || !r) return;
  const t = Date.now(); r.ips = (Array.isArray(r.ips) ? r.ips : []).filter(x => t - x.l < LOG_KEEP);
  const e = r.ips.find(x => x.ip === ip);
  if (e) { if (t - e.l > 600e3) { e.l = t; e.n = (e.n || 1) + 1; r.ips.sort((a, b) => b.l - a.l); saveReg(); } return; }
  r.ips.unshift({ ip, f: t, l: t, n: 1 }); if (r.ips.length > 30) r.ips.length = 30; saveReg();
}
function noteDev(r, d) {
  if (!d || typeof d !== 'object' || !r) return;
  const c = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, n) : typeof v === 'number' && isFinite(v) ? String(v).slice(0, n) : '';
  const x = { maker: c(d.maker, 40), model: c(d.model, 60), os: c(d.os, 20), osVer: c(d.osVer, 20), app: c(d.app, 12), lang: c(d.lang, 20), tz: c(d.tz, 40), scr: c(d.scr, 20), ua: c(d.ua, 250) };
  const k = [x.maker, x.model, x.os, x.osVer, x.app, x.ua].join('|'), t = Date.now();
  r.devs = (Array.isArray(r.devs) ? r.devs : []).filter(e => t - e.l < LOG_KEEP);
  const e = r.devs.find(e => e.k === k);
  if (e) { if (t - e.l > 600e3) { e.l = t; Object.assign(e, x); r.devs.sort((a, b) => b.l - a.l); saveReg(); } return; }
  r.devs.unshift({ ...x, k, f: t, l: t }); if (r.devs.length > 5) r.devs.length = 5; saveReg();
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
H['/api/health'] = async () => ({ ok: true, v: '8.7', push: !!SA, turn: !!TURN_SECRET });

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
  if (r && r.banned) return [403, { err: 'banned' }];
  if (r && (r.dead || !eq(r.kh, kh))) {
    /* نفس الجهاز بعد إعادة التثبيت (أو بعد حذف الحساب): نسمح بتجديد المفتاح. رقم محذوف ما يرجع إلا لجهازه */
    if (dh && r.dh && eq(r.dh, dh)) { r.kh = kh; delete r.dead; } else return [403, { err: 'taken' }];
  }
  if (!r) { if (!CONFIG.flags.register) return [403, { err: 'closed' }];
    if (limited('reg:' + ipKey(ip), 300, 3600e3) || limited('reg:all', 3000, 3600e3)) return [429, { err: 'slow' }]; r = REG[pin] = { kh, ts: Date.now() }; }
  /* v8.2: قائمة أصدقائك (أرقام فقط) — التنبيهات تُقبل منهم بس، وغيرهم بحدود صغيرة */
  if (Array.isArray(b.allow)) r.allow = [...new Set(b.allow.filter(x => typeof x === 'string' && PIN_RE.test(x)))].slice(0, 1000);
  const fcm = typeof b.fcm === 'string' && b.fcm.length < 400 ? b.fcm : null;
  if (fcm) { for (const p in REG) if (p !== pin && REG[p].fcm === fcm) delete REG[p].fcm; r.fcm = fcm; } else if (b.fcm === '') delete r.fcm;
  if (dh && !r.dh) { const other = DEVS.get(dh); if (other && other !== pin && REG[other]) delete REG[other].dh; r.dh = dh; DEVS.set(dh, pin); }
  r.plat = ['android', 'ios', 'web'].includes(b.plat) ? b.plat : 'web'; r.seen = Date.now(); noteIp(r, ip); noteDev(r, b.di); saveReg();
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
  if (b.on !== true || !CONFIG.flags.nearby) { PUB.delete(pin); return CONFIG.flags.nearby ? { ok: true, on: false } : [403, { err: 'off' }]; }
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
  if (!CONFIG.flags.nearby) return { ok: true, items: [], off: true };
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
  if (!CONFIG.flags.square) return [403, { err: 'off' }];
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
  if (!CONFIG.flags.square) return [403, { err: 'off' }];
  const tag = typeof b.tag === 'string' ? b.tag.replace(/^#/, '').toLowerCase().slice(0, 30) : '';
  const before = +b.before || Infinity; const blocked = new Set(Array.isArray(b.blocked) ? b.blocked.slice(0, 500) : []);
  const out = [];
  for (const p of SQ) { if (p.ts >= before || p.hidden || blocked.has(p.pin)) continue; if (tag && !p.tags.includes(tag)) continue; if (b.mine && p.pin !== pin) continue; out.push(sqView(p, pin)); if (out.length >= 30) break; }
  return { ok: true, items: out };
};
H['/api/sq/trends'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (!CONFIG.flags.square) return [403, { err: 'off' }];
  const t = Date.now(), cnt = new Map();
  for (const p of SQ) { if (p.hidden || t - p.ts > 24 * 3600e3) continue; for (const g of p.tags) cnt.set(g, (cnt.get(g) || 0) + 1); }
  return { ok: true, tags: [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, n]) => ({ tag, n })) };
};
H['/api/sq/like'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (!CONFIG.flags.square) return [403, { err: 'off' }];
  if (limited('like:' + pin, 120, 600e3)) return [429, { err: 'slow' }];
  const p = SQ.find(x => x.id === b.id); if (!p) return [404, { err: 'nf' }];
  const i = p.likes.indexOf(pin); if (i < 0 && p.likes.length >= 5000) return { ok: true, likes: p.likes.length, liked: false }; if (i >= 0) p.likes.splice(i, 1); else p.likes.push(pin); sqDirty = true;
  return { ok: true, likes: p.likes.length, liked: i < 0 };
};
H['/api/sq/report'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (!CONFIG.flags.square) return [403, { err: 'off' }];
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
  if (!p || !p.img || p.hidden || !CONFIG.flags.square) { res.writeHead(404); return res.end(); }
  fs.readFile(path.join(SQ_IMG, id + '.jpg'), (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'image/' + (p.img === true ? 'jpeg' : p.img), 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'" });
    res.end(buf);
  });
}

/* ═══════════ v8.4: الإعدادات العامة + لوحة التحكم ═══════════ */
const CRED = process.env.CREDENTIALS_DIRECTORY || '';
const readCred = (name, fallback) => { for (const f of [CRED && path.join(CRED, name), fallback]) { if (!f) continue; try { return fs.readFileSync(f, 'utf8').trim(); } catch (e) { } } return ''; };
const TURN_SECRET = process.env.TURN_SECRET || readCred('turn', '/etc/vibemap/turn.secret');
const TURN_HOST = process.env.TURN_HOST || '';
let ADMIN = null; try { ADMIN = JSON.parse(readCred('admin', '/etc/vibemap/admin.json') || 'null'); } catch (e) { ADMIN = null; }
if (!ADMIN) log('⚠️ لا توجد كلمة سر للوحة التحكم');

/* ─── إعدادات التطبيق (يتحكم فيها صاحب التطبيق من اللوحة) ─── */
const FLAG_KEYS = ['register', 'square', 'nearby', 'stories', 'rooms', 'poke', 'voice', 'photos', 'sos', 'bubble'];
const CFG_FILE = path.join(DATA, 'config.json');
let CONFIG = { flags: {}, ann: null, minVersion: '', maint: '' };
try { CONFIG = { ...CONFIG, ...JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')) }; } catch (e) { }
FLAG_KEYS.forEach(k => { if (typeof CONFIG.flags[k] !== 'boolean') CONFIG.flags[k] = true; });
const saveCfg = () => { try { fs.writeFileSync(CFG_FILE + '.tmp', JSON.stringify(CONFIG)); fs.renameSync(CFG_FILE + '.tmp', CFG_FILE); } catch (e) { log('cfg write', e.message); } };
const VER_RE = /^\d{1,2}(\.\d{1,2}){0,2}$/;
/* خادم التعارف الخاص (PeerJS) — يحدده أمر التثبيت، والتطبيق يتحول له تلقائياً */
const SIGNAL_URL = /^https:\/\/[a-z0-9.-]+(:\d+)?\/[\w\/-]*$/i.test(process.env.SIGNAL_URL || '') ? process.env.SIGNAL_URL : '';
H['/api/config'] = async () => ({ ok: true, flags: CONFIG.flags, ann: CONFIG.ann, minVersion: CONFIG.minVersion, maint: CONFIG.maint, signal: SIGNAL_URL });

/* ─── خادم TURN خاص: بيانات دخول مؤقتة (12 ساعة) لكل مستخدم ─── */
H['/api/turn'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (!TURN_SECRET || !TURN_HOST) return { ok: true, servers: [] };
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600, username = exp + ':' + pin;
  const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
  return { ok: true, ttl: 12 * 3600, servers: [{ urls: [`turn:${TURN_HOST}:3478?transport=udp`, `turn:${TURN_HOST}:3478?transport=tcp`], username, credential }] };
};

/* ─── v8.6: حسابات الإدارة (مالك / مدير / مشرف) ───
   المالك يدخل باسم admin، وكلمة سره الأولى من أمر التثبيت. يقدر يغيّرها ويضيف حسابات لغيره.
   لو شغّلت أمر التثبيت مع reset-admin تنعاد كلمة سر المالك. */
const ADM_FILE = path.join(DATA, 'admins.json');
const ROLES = ['owner', 'admin', 'mod'];
let ADMS = { users: [], audit: [] };
try { ADMS = JSON.parse(fs.readFileSync(ADM_FILE, 'utf8')); } catch (e) { }
if (!Array.isArray(ADMS.users)) ADMS.users = []; if (!Array.isArray(ADMS.audit)) ADMS.audit = [];
const saveAdms = () => { try { fs.writeFileSync(ADM_FILE + '.tmp', JSON.stringify(ADMS)); fs.renameSync(ADM_FILE + '.tmp', ADM_FILE); } catch (e) { log('admins write', e.message); } };
const hashPw = (pw, salt) => crypto.scryptSync(String(pw).slice(0, 200), Buffer.from(salt, 'hex'), 32).toString('hex');
const admOf = u => ADMS.users.find(x => x.u === u);
(function syncOwner() {
  if (!ADMIN || !ADMIN.salt || !ADMIN.hash) return;
  let o = ADMS.users.find(x => x.role === 'owner');
  if (!o) { o = { u: 'admin', name: 'المالك', role: 'owner', created: Date.now() }; ADMS.users.unshift(o); }
  if (o.credHash !== ADMIN.hash) { o.salt = ADMIN.salt; o.hash = ADMIN.hash; o.credHash = ADMIN.hash; o.pwTs = Date.now(); log('owner password from install credential'); }
  saveAdms();
})();
function audit(u, act, target) { ADMS.audit.unshift({ ts: Date.now(), u, act, t: String(target || '').slice(0, 80) }); if (ADMS.audit.length > 300) ADMS.audit.length = 300; saveAdms(); }
const SESS = new Map();
function sessOf(b) {
  const t = typeof b.token === 'string' ? b.token : ''; const e = t && SESS.get(t);
  if (!e || e.exp < Date.now() || !admOf(e.u)) { if (t) SESS.delete(t); return null; }
  e.exp = Date.now() + 12 * 3600e3; return e;
}
const USER_RE = /^[a-z0-9_.-]{3,24}$/;
H['/api/admin/login'] = async (b, ip) => {
  if (!ADMS.users.length) return [503, { err: 'noadmin' }];
  if (limited('adm:' + ipKey(ip), 8, 900e3)) return [429, { err: 'slow' }];
  const u = String(b.user || 'admin').trim().toLowerCase() || 'admin', a = admOf(u);
  const h = hashPw(b.password || '', a ? a.salt : '00'.repeat(16));
  if (!a || !a.hash || !eq(h, a.hash)) { log('⚠️ admin login failed', u, ipKey(ip)); return [401, { err: 'bad' }]; }
  const token = crypto.randomBytes(32).toString('hex'); SESS.set(token, { u, exp: Date.now() + 12 * 3600e3 });
  for (const [k, v] of SESS) if (v.exp < Date.now()) SESS.delete(k);
  a.last = Date.now(); saveAdms(); log('admin login', u, ipKey(ip));
  return { ok: true, token, me: { u, name: a.name, role: a.role } };
};
H['/api/admin/logout'] = async b => { SESS.delete(String(b.token || '')); return { ok: true }; };
/* A(fn, roles): يتأكد من الجلسة والصلاحية */
const A = (fn, roles) => async (b, ip) => { const e = sessOf(b); if (!e) return [401, { err: 'auth' }]; const a = admOf(e.u);
  if (roles && !roles.includes(a.role)) return [403, { err: 'role' }]; b._adm = a; return fn(b, ip); };
const OWN = ['owner'], MGR = ['owner', 'admin'];
H['/api/admin/me'] = A(async b => ({ ok: true, me: { u: b._adm.u, name: b._adm.name, role: b._adm.role } }));
H['/api/admin/password'] = A(async (b, ip) => {
  const a = b._adm;
  if (limited('admpw:' + a.u, 10, 3600e3)) return [429, { err: 'slow' }];
  if (!eq(hashPw(b.old || '', a.salt), a.hash)) return [400, { err: 'oldpw' }];
  const pw = String(b.new || ''); if (pw.length < 8 || pw.length > 200) return [400, { err: 'weak' }];
  a.salt = crypto.randomBytes(16).toString('hex'); a.hash = hashPw(pw, a.salt); a.pwTs = Date.now();
  for (const [k, v] of SESS) if (v.u === a.u && k !== b.token) SESS.delete(k); /* الأجهزة الثانية تطلع */
  audit(a.u, 'password', a.u); return { ok: true };
});
H['/api/admin/admins'] = A(async () => ({ ok: true, items: ADMS.users.map(x => ({ u: x.u, name: x.name, role: x.role, created: x.created, last: x.last || 0 })) }), OWN);
H['/api/admin/admins/save'] = A(async b => {
  const u = String(b.u || '').trim().toLowerCase(); if (!USER_RE.test(u)) return [400, { err: 'user' }];
  const role = ['admin', 'mod'].includes(b.role) ? b.role : null; const name = clean(b.name, 40);
  let a = admOf(u);
  if (a && a.role === 'owner') { if (name) a.name = name; saveAdms(); return { ok: true }; } /* المالك ما تتغير صلاحيته */
  if (!role) return [400, { err: 'role' }];
  const pw = typeof b.password === 'string' ? b.password : '';
  if (!a) { if (ADMS.users.length >= 50) return [400, { err: 'max' }]; if (pw.length < 8) return [400, { err: 'weak' }]; a = { u, created: Date.now() }; ADMS.users.push(a); }
  a.name = name || u; a.role = role;
  if (pw) { if (pw.length < 8 || pw.length > 200) return [400, { err: 'weak' }]; a.salt = crypto.randomBytes(16).toString('hex'); a.hash = hashPw(pw, a.salt); for (const [k, v] of SESS) if (v.u === u) SESS.delete(k); }
  audit(b._adm.u, 'admin-save', u + ':' + role); return { ok: true };
}, OWN);
H['/api/admin/admins/del'] = A(async b => {
  const u = String(b.u || '').toLowerCase(), i = ADMS.users.findIndex(x => x.u === u);
  if (i < 0) return [404, { err: 'nf' }]; if (ADMS.users[i].role === 'owner') return [400, { err: 'owner' }];
  ADMS.users.splice(i, 1); for (const [k, v] of SESS) if (v.u === u) SESS.delete(k);
  audit(b._adm.u, 'admin-del', u); return { ok: true };
}, OWN);
H['/api/admin/audit'] = A(async () => ({ ok: true, items: ADMS.audit.slice(0, 200) }), MGR);
const nameOf = pin => { const p = PUB.get(pin); if (p) return p.n; const q = SQ.find(x => x.pin === pin); return q ? q.n : ''; };
const START = Date.now();

H['/api/admin/stats'] = A(async () => {
  const t = Date.now(), day = 864e5; let users = 0, a1 = 0, a7 = 0, a30 = 0, newToday = 0, push = 0, banned = 0; const plat = { android: 0, ios: 0, web: 0 };
  const perDay = {}; for (let i = 29; i >= 0; i--) perDay[new Date(t - i * day).toISOString().slice(0, 10)] = 0;
  const today = new Date(t).toISOString().slice(0, 10);
  for (const p in REG) { const r = REG[p]; if (r.dead) continue; if (r.banned) { banned++; continue; } users++;
    const seen = r.seen || r.ts || 0; if (t - seen < day) a1++; if (t - seen < 7 * day) a7++; if (t - seen < 30 * day) a30++;
    const d = new Date(r.ts || 0).toISOString().slice(0, 10); if (d in perDay) perDay[d]++; if (d === today) newToday++;
    plat[r.plat] = (plat[r.plat] || 0) + 1; if (r.fcm) push++; }
  let active = 0, hidden = 0, reported = 0; for (const p of SQ) { if (p.hidden) hidden++; else active++; if ((p.reports || []).length) reported++; }
  const mem = process.memoryUsage();
  return { ok: true, users, banned, active24: a1, active7: a7, active30: a30, newToday, plat, push, publicNow: [...PUB.values()].filter(v => t - v.ts < PUB_TTL).length,
    perDay: Object.entries(perDay).map(([d, n]) => ({ d, n })), boxes: BOXSZ.size, diskMB: +(DISK_USED / 1048576).toFixed(1),
    posts: { active, hidden, reported }, uptimeH: +((t - START) / 3600e3).toFixed(1), memMB: Math.round(mem.rss / 1048576), turn: !!(TURN_SECRET && TURN_HOST), signal: !!SIGNAL_URL, fcm: !!SA };
});
H['/api/admin/users'] = A(async b => {
  const q = String(b.q || '').trim().toUpperCase(), page = Math.max(0, b.page | 0), t = Date.now();
  let list = Object.entries(REG).filter(([p, r]) => !r.dead).map(([p, r]) => ({ pin: p, name: nameOf(p), plat: r.plat || 'web', ts: r.ts || 0, seen: r.seen || r.ts || 0, friends: (r.allow || []).length, push: !!r.fcm, banned: !!r.banned, pub: PUB.has(p) }));
  if (q) list = list.filter(u => u.pin.includes(q) || u.name.toUpperCase().includes(q));
  const sort = b.sort === 'new' ? (x, y) => y.ts - x.ts : (x, y) => y.seen - x.seen; list.sort(sort);
  return { ok: true, total: list.length, page, items: list.slice(page * 50, page * 50 + 50) };
});
H['/api/admin/user'] = A(async b => {
  const pin = String(b.pin || '').toUpperCase(), r = REG[pin]; if (!r || r.dead) return [404, { err: 'nf' }];
  if (b.act === 'ban') { r.banned = true; PUB.delete(pin); for (const p of SQ) if (p.pin === pin) p.hidden = true; sqDirty = true; }
  else if (b.act === 'unban') { delete r.banned; }
  else if (b.act === 'wipe') { PUB.delete(pin); for (let i = SQ.length - 1; i >= 0; i--) if (SQ[i].pin === pin) { const [o] = SQ.splice(i, 1); if (o.img) fs.rm(path.join(SQ_IMG, o.id + '.jpg'), () => {}); } sqDirty = true;
    const a = BOX.get(pin); if (a) CACHE_USED -= boxBytes(a); BOX.set(pin, []); boxDirty.add(pin); }
  else return [400, { err: 'act' }];
  saveReg(); log('admin', b.act, pin); audit(b._adm.u, 'user-' + b.act, pin); return { ok: true };
});
/* v8.7: بيانات حساب للجهات المختصة — للمالك فقط، وكل عرض ينسجل في سجل النشاط */
H['/api/admin/user/info'] = A(async b => {
  const pin = String(b.pin || '').toUpperCase(), r = REG[pin]; if (!r) return [404, { err: 'nf' }];
  const t = Date.now();
  audit(b._adm.u, 'user-info', pin);
  return { ok: true, info: { pin, name: nameOf(pin), plat: r.plat || 'web', ts: r.ts || 0, seen: r.seen || 0, banned: !!r.banned, dead: !!r.dead, friends: (r.allow || []).length, push: !!r.fcm,
    posts: SQ.filter(x => x.pin === pin).length, pub: PUB.has(pin),
    ips: (r.ips || []).filter(x => t - x.l < LOG_KEEP), devs: (r.devs || []).filter(x => t - x.l < LOG_KEEP).map(({ k, ...x }) => x) } };
}, OWN);
H['/api/admin/sq'] = A(async b => {
  const f = b.filter === 'reported' ? p => (p.reports || []).length > 0 : b.filter === 'hidden' ? p => p.hidden : () => true;
  return { ok: true, items: SQ.filter(f).slice(0, 200).map(p => ({ id: p.id, pin: p.pin, n: p.n, text: p.text, tags: p.tags, img: !!p.img, ts: p.ts, likes: p.likes.length, reports: (p.reports || []).length, hidden: !!p.hidden })) };
});
H['/api/admin/sq/act'] = A(async b => {
  const i = SQ.findIndex(x => x.id === b.id); if (i < 0) return [404, { err: 'nf' }]; const p = SQ[i];
  if (b.act === 'hide') p.hidden = true; else if (b.act === 'show') { p.hidden = false; p.reports = []; p.rw = 0; }
  else if (b.act === 'del') { SQ.splice(i, 1); if (p.img) fs.rm(path.join(SQ_IMG, p.id + '.jpg'), () => {}); }
  else return [400, { err: 'act' }];
  sqDirty = true; log('admin sq', b.act, p.id); audit(b._adm.u, 'post-' + b.act, p.id); return { ok: true };
});
H['/api/admin/config'] = A(async b => {
  if (b.set && typeof b.set === 'object') {
    if (!MGR.includes(b._adm.role)) return [403, { err: 'role' }];
    const s = b.set;
    if (s.flags && typeof s.flags === 'object') FLAG_KEYS.forEach(k => { if (typeof s.flags[k] === 'boolean') CONFIG.flags[k] = s.flags[k]; });
    if ('ann' in s) { const txt = clean(s.ann && s.ann.text, 300); CONFIG.ann = txt ? { id: crypto.randomBytes(4).toString('hex'), text: txt, level: ['info', 'warn', 'ok'].includes(s.ann.level) ? s.ann.level : 'info', ts: Date.now() } : null; }
    if ('minVersion' in s) CONFIG.minVersion = VER_RE.test(String(s.minVersion || '')) ? String(s.minVersion) : '';
    if ('maint' in s) CONFIG.maint = clean(s.maint, 200);
    saveCfg(); log('admin config', JSON.stringify(CONFIG.flags)); audit(b._adm.u, 'config', Object.keys(s).join(','));
  }
  return { ok: true, config: CONFIG, flagKeys: FLAG_KEYS };
});
H['/api/admin/broadcast'] = A(async b => {
  const text = clean(b.text, 180); if (!text) return [400, { err: 'empty' }];
  if (!SA) return [503, { err: 'nopush' }];
  if (limited('broadcast', 5, 24 * 3600e3)) return [429, { err: 'slow' }];
  const targets = Object.entries(REG).filter(([p, r]) => !r.dead && !r.banned && r.fcm).map(([p]) => p);
  let sent = 0; const conc = 8;
  for (let i = 0; i < targets.length; i += conc) { const rs = await Promise.all(targets.slice(i, i + conc).map(p => push(p, { t: 'vm', k: 'news', f: NEWS_PIN, n: 'VibeMap', r: text }, false))); sent += rs.filter(Boolean).length; }
  log('admin broadcast', sent + '/' + targets.length); audit(b._adm.u, 'broadcast', text.slice(0, 60)); return { ok: true, sent, total: targets.length };
}, MGR);

const server = http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET, OPTIONS', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(obj)); };
  const url = (req.url || '').split('?')[0].replace(/^\/relay/, '');
  if (req.method === 'OPTIONS') return send(204, {});
  if (req.method === 'GET' && url.startsWith('/api/sq/img/')) return sqImage(res, url.slice(12));
  const h = H[url]; if (!h) return send(404, { err: 'nf' });
  const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || '');
  if (req.method === 'GET') { if (url !== '/api/health' && url !== '/api/config') return send(405, { err: 'method' }); return h({}, ip).then(r => send(200, r)); }
  if (req.method !== 'POST') return send(405, { err: 'method' });
  let len = 0; const chunks = [];
  req.on('data', c => { len += c.length; if (len > MAX_BODY) { send(413, { err: 'big' }); req.destroy(); } else chunks.push(c); });
  req.on('end', async () => {
    if (len > MAX_BODY) return;
    let b; try { b = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return send(400, { err: 'json' }); }
    if (!b || typeof b !== 'object') return send(400, { err: 'json' });
    b._ip = ip;
    try { const r = await h(b, ip); if (Array.isArray(r)) send(r[0], r[1]); else send(200, r); } catch (e) { log('err', url, e.message); send(500, { err: 'server' }); }
  });
});
server.listen(PORT, HOST, () => log(`VibeMap relay on ${HOST}:${PORT} — push ${SA ? 'ON' : 'OFF'}`));
const bye = () => { try { fs.writeFileSync(REG_FILE, JSON.stringify(REG)); fs.writeFileSync(SQ_FILE, JSON.stringify(SQ)); for (const pin of boxDirty) { const arr = BOX.get(pin) || []; const f = path.join(DATA, 'box', pin + '.json'); if (!arr.length) fs.rmSync(f, { force: true }); else fs.writeFileSync(f, JSON.stringify(arr)); } } catch (e) { } process.exit(0); };
process.on('SIGTERM', bye); process.on('SIGINT', bye);
