/* VibeMap Relay v8.0 — خادم التوصيل
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
const SA_FILE = process.env.SA_FILE || '/etc/vibemap/service-account.json';
const PIN_RE = /^VM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;
const B64_RE = /^[A-Za-z0-9+/=_-]+$/;
const MAX_BODY = 4.5 * 1024 * 1024;       // حجم الطلب
const BOX_MAX_ITEMS = 400;                 // رسائل معلّقة لكل مستخدم
const BOX_MAX_BYTES = 40 * 1024 * 1024;    // حجم الصندوق لكل مستخدم
const TTL_MS = 7 * 24 * 3600e3;            // تُحذف الرسائل غير المستلمة بعد 7 أيام
const PUSH_KINDS = new Set(['sos', 'sosoff', 'msg', 'voice', 'photo', 'room', 'friend']);

fs.mkdirSync(path.join(DATA, 'box'), { recursive: true });
const log = (...a) => console.log(new Date().toISOString(), ...a);

/* ─── التسجيل: رقم VibeMap ← بصمة المفتاح السري + رمز الإشعارات ─── */
const REG_FILE = path.join(DATA, 'reg.json');
let REG = {};
try { REG = JSON.parse(fs.readFileSync(REG_FILE, 'utf8')); } catch (e) { REG = {}; }
let regDirty = false;
const saveReg = () => { regDirty = true; };
setInterval(() => { if (!regDirty) return; regDirty = false; const tmp = REG_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(REG)); fs.renameSync(tmp, REG_FILE); }, 2000).unref();
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const eq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function auth(b) {
  const pin = typeof b.pin === 'string' ? b.pin.toUpperCase() : '';
  if (!PIN_RE.test(pin) || typeof b.key !== 'string' || b.key.length < 32 || b.key.length > 100) return null;
  const r = REG[pin]; if (!r || !eq(r.kh, sha(b.key))) return null;
  r.seen = Date.now(); return pin;
}

/* ─── الصناديق ─── */
const BOX = new Map(); const boxDirty = new Set();
function box(pin) {
  if (BOX.has(pin)) return BOX.get(pin);
  let arr = []; try { arr = JSON.parse(fs.readFileSync(path.join(DATA, 'box', pin + '.json'), 'utf8')); } catch (e) { }
  const t = Date.now(); arr = arr.filter(x => t - x.ts < TTL_MS);
  BOX.set(pin, arr); return arr;
}
setInterval(() => {
  for (const pin of boxDirty) {
    const arr = BOX.get(pin) || []; const f = path.join(DATA, 'box', pin + '.json');
    try { if (!arr.length) fs.rmSync(f, { force: true }); else { fs.writeFileSync(f + '.tmp', JSON.stringify(arr)); fs.renameSync(f + '.tmp', f); } } catch (e) { log('box write', pin, e.message); }
  }
  boxDirty.clear();
  if (BOX.size > 2000) for (const k of [...BOX.keys()].slice(0, 1000)) if (!boxDirty.has(k)) BOX.delete(k);
}, 1500).unref();
const size = x => x.ct.length + x.iv.length + 80;

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
H['/api/health'] = async () => ({ ok: true, v: '8.0', push: !!SA });

// تسجيل الجهاز أو تحديث رمز الإشعارات
H['/api/reg'] = async (b, ip) => {
  const pin = typeof b.pin === 'string' ? b.pin.toUpperCase() : '';
  if (!PIN_RE.test(pin) || typeof b.key !== 'string' || b.key.length < 32 || b.key.length > 100) return [400, { err: 'bad' }];
  const kh = sha(b.key); let r = REG[pin];
  if (r && !eq(r.kh, kh)) return [403, { err: 'taken' }];
  if (!r) { if (limited('reg:' + ip, 30, 3600e3)) return [429, { err: 'slow' }]; r = REG[pin] = { kh, ts: Date.now() }; }
  const fcm = typeof b.fcm === 'string' && b.fcm.length < 400 ? b.fcm : null;
  if (fcm) { for (const p in REG) if (p !== pin && REG[p].fcm === fcm) delete REG[p].fcm; r.fcm = fcm; } else if (b.fcm === '') delete r.fcm;
  r.plat = ['android', 'ios', 'web'].includes(b.plat) ? b.plat : 'web'; r.seen = Date.now(); saveReg();
  return { ok: true, push: !!SA, fcm: !!r.fcm, pending: box(pin).length };
};

// إرسال رسائل مشفّرة لصديق
H['/api/send'] = async (b, ip) => {
  const from = auth(b); if (!from) return [401, { err: 'auth' }];
  const to = typeof b.to === 'string' ? b.to.toUpperCase() : '';
  if (!PIN_RE.test(to) || to === from) return [400, { err: 'to' }];
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 20) return [400, { err: 'items' }];
  if (limited('send:' + from, 120, 60e3) || limited('ip:' + ip, 400, 60e3)) return [429, { err: 'slow' }];
  const arr = box(to); const t = Date.now(); let added = 0;
  for (const it of b.items) {
    if (!it || !ID_RE.test(it.id || '') || typeof it.iv !== 'string' || typeof it.ct !== 'string' || it.iv.length > 40 || it.ct.length > 4e6 || !B64_RE.test(it.iv) || !B64_RE.test(it.ct)) return [400, { err: 'item' }];
    if (arr.some(x => x.f === from && x.id === it.id)) continue;
    arr.push({ f: from, id: it.id, iv: it.iv, ct: it.ct, ts: t }); added++;
  }
  let bytes = arr.reduce((s, x) => s + size(x), 0);
  while (arr.length > BOX_MAX_ITEMS || bytes > BOX_MAX_BYTES) { bytes -= size(arr.shift()); }
  boxDirty.add(to);
  let pushed = false;
  const k = b.push && PUSH_KINDS.has(b.push.k) ? b.push.k : null;
  if (k && added) {
    const urgent = k === 'sos';
    const cap = urgent ? limited(`ps:${from}:${to}`, 6, 600e3) : limited(`pm:${from}:${to}`, 30, 600e3);
    if (!cap) pushed = await push(to, { t: 'vm', k, f: from, n: String(b.push.n || '').slice(0, 40), r: String(b.push.r || '').slice(0, 40) }, urgent);
  }
  return { ok: true, queued: added, pushed, reg: !!REG[to] };
};

// استلام الرسائل المعلّقة
H['/api/inbox'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  const arr = box(pin); const out = []; let bytes = 0;
  for (const x of arr) { if (bytes + size(x) > 6e6 && out.length) break; out.push(x); bytes += size(x); if (out.length >= 60) break; }
  saveReg();
  return { ok: true, items: out, more: arr.length > out.length };
};

// تأكيد الاستلام (حذف من الصندوق)
H['/api/ack'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  if (!Array.isArray(b.ids) || b.ids.length > 200) return [400, { err: 'ids' }];
  const set = new Set(b.ids.filter(x => typeof x === 'string').map(String));
  const arr = box(pin); const keep = arr.filter(x => !set.has(x.f + '/' + x.id));
  if (keep.length !== arr.length) { BOX.set(pin, keep); boxDirty.add(pin); }
  return { ok: true, left: keep.length };
};

// إلغاء التسجيل (عند حذف كل شيء)
H['/api/unreg'] = async b => {
  const pin = auth(b); if (!pin) return [401, { err: 'auth' }];
  delete REG[pin]; saveReg(); BOX.set(pin, []); boxDirty.add(pin); return { ok: true };
};

const server = http.createServer((req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET, OPTIONS', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(obj)); };
  const url = (req.url || '').split('?')[0].replace(/^\/relay/, '');
  if (req.method === 'OPTIONS') return send(204, {});
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
const bye = () => { try { fs.writeFileSync(REG_FILE, JSON.stringify(REG)); for (const pin of boxDirty) { const arr = BOX.get(pin) || []; const f = path.join(DATA, 'box', pin + '.json'); if (!arr.length) fs.rmSync(f, { force: true }); else fs.writeFileSync(f, JSON.stringify(arr)); } } catch (e) { } process.exit(0); };
process.on('SIGTERM', bye); process.on('SIGINT', bye);
