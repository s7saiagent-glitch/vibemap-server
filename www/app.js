'use strict';
/* ════════════════════════════════════════════════════════════
   VibeMap v7.0 — تطبيق لاسلكي حقيقي بين الجوالات (ويب + أندرويد + آيفون)
   WebRTC P2P (PeerJS) · ECDH P-256 + AES-GCM-256 · GPS · بوصلة · كاميرا
   ════════════════════════════════════════════════════════════ */
const VERSION = '8.4';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const now = () => Date.now();
const PIN_RE = /VM-[A-Z0-9]{4}-[A-Z0-9]{4}/i;
const PIN_STRICT = /^VM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

/* ════════ v7: فحص كل ما يصل من الشبكة (الحماية) ════════ */
const V = {
  num: (x, lo, hi) => { const n = Number(x); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; },
  str: (x, max) => typeof x === 'string' ? x.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, '').slice(0, max) : '',
  name: x => { const n = V.str(x, 24).trim(); return n || 'بدون اسم'; },
  color: x => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x) ? x : '#7C5CFF',
  id: x => typeof x === 'string' && /^[a-z0-9]{6,40}$/i.test(x) ? x : null,
  ttl: x => ['read','24h','keep'].includes(x) ? x : 'keep',
  pub: x => x && typeof x === 'object' && x.kty === 'EC' && x.crv === 'P-256' && /^[A-Za-z0-9_-]{43}$/.test(x.x || '') && /^[A-Za-z0-9_-]{43}$/.test(x.y || '') ? { kty:'EC', crv:'P-256', x:x.x, y:x.y } : null,
  rep: x => { if(!x || typeof x !== 'object') return null; const t = V.num(x.t, 0, 5), e = V.num(x.e, 0, 5), h = V.num(x.h, 0, 5), n = V.num(x.n, 1, 1e6);
    return t == null || e == null || h == null || n == null ? null : { t, e, h, n:Math.round(n) }; },
  audio: x => typeof x === 'string' && x.length < 2e6 && /^data:audio\/(webm|ogg|mp4|mpeg|aac|x-m4a)(;codecs=[a-z0-9.,"]+)?;base64,[A-Za-z0-9+\/]+={0,2}$/.test(x) ? x : null,
  photo: x => typeof x === 'string' && x.length < 3e6 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/]+={0,2}$/.test(x) ? x : null,
  loc: m => { const lat = V.num(m.lat, -90, 90), lng = V.num(m.lng, -180, 180); return lat == null || lng == null ? null : { lat, lng, acc: V.num(m.acc, 0, 1e5) || 0 }; },
};
/* حد لمعدل الرسائل من كل اتصال: يحمي من الإغراق */
const RATE = {};
function rateOk(pin, max = 80, win = 10000){ const t = now(); const r = RATE[pin] || (RATE[pin] = { s:t, n:0 }); if(t - r.s > win){ r.s = t; r.n = 0; } return ++r.n <= max; }
const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const PLATFORM = IS_NATIVE ? window.Capacitor.getPlatform() : 'web';
const NP = name => (IS_NATIVE && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null;
const PUBLIC_URL = (document.querySelector('meta[name=vibemap-public-url]') || {}).content || '';
const COLORS = ['#7C5CFF','#2DD4E8','#D24BF2','#12B886','#F2994A','#E5334A','#3B82F6','#A855F7'];
const FALLBACK = { lat: 21.5433, lng: 39.1728 }; // جدة — للعرض التجريبي فقط

/* ─── أيقونات ─── */
const I = {
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  radar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.8 3.1 2.6 3.5 5.2"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.7-1.2"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 4L3 11l7 2 2 7z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-4M14 21v-3"/></svg>',
  share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',
  compass:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  story:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3a9 9 0 1 1-8.2 5.3" stroke-dasharray="3 3"/><path d="M12 3a9 9 0 0 1 9 9"/><circle cx="12" cy="12" r="3.5"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l7 19-7-4-7 4z"/></svg>',
};

/* ════════ الحالة والتخزين ════════ */
const LS_KEY = 'vibemap.v7';
let S = null;
const RT = {
  peer:null, conns:{}, pending:{}, keys:{}, outCalls:{}, audios:{},
  talking:false, rxTalking:new Set(), target:null, tab:'radar', mode:'radar',
  myLoc:null, geoErr:null, heading:null, compassOn:false, chatWith:null,
  camStream:null, micTrack:null, micTimer:null, silent:null, ctx:null,
  lastLocSent:0, sosActive:false, sosFrom:null, siren:null, wake:null,
  echoRec:null, echoChunks:[], installEvt:null, net:'wait', sheetOnClose:null,
};
let MSG = {};

function defaults(){
  return { me:null, keys:null, friends:{}, ratingsIn:{}, blocked:{}, rooms:{}, leftRooms:{},
    settings:{ theme:'system', ttl:'keep', ghost:false, demo:false, wake:false, turnUrl:'', turnUser:'', turnPass:'', relayOnly:false, notifPreview:true, pttKey:'none', pttMode:'hold', storiesOn:true, bgMode:true, eco:true, bubble:false } };
}
function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){} try{ if(S && S.account) bkSoon(); }catch(e){} try{ contactsSoon(); }catch(e){} }
/* v8.2: الخادم يقبل التنبيهات من أصدقائك بس، والجوال يعرض الاسم المحفوظ عندك (مو اللي يكتبه المرسل) */
function allowList(){ return S && S.friends ? Object.values(S.friends).filter(f => (f.status === 'friend' || f.status === 'out') && !isDemo(f.pin)).map(f => f.pin).slice(0, 1000) : []; }
let contactsT = 0, contactsSig = '';
function contactsSoon(){ clearTimeout(contactsT); contactsT = setTimeout(() => {
  if(!S || !S.friends) return;
  const map = {}; Object.values(S.friends).forEach(f => { if(f.status === 'friend' && !isDemo(f.pin)) map[f.pin] = f.name; });
  const sig = JSON.stringify(map) + '|' + allowList().join(','); if(sig === contactsSig) return; const first = !contactsSig; contactsSig = sig;
  const P = NP('VibePush'); if(P && P.setContacts) P.setContacts({ json:JSON.stringify(map) }).catch(() => {});
  if(!first && typeof relayReg === 'function' && RL.ok) relayReg();
}, 1500); }
function load(){ try{
  let v = JSON.parse(localStorage.getItem(LS_KEY));
  if(!v){ v = JSON.parse(localStorage.getItem('vibemap.v6')); if(v && v.me){ localStorage.setItem(LS_KEY, JSON.stringify(v)); localStorage.removeItem('vibemap.v6'); } }
  if(!v || !v.me) return null;
  v.settings = { ...defaults().settings, ...(v.settings || {}) }; v.blocked = v.blocked || {}; v.rooms = v.rooms || {}; v.leftRooms = v.leftRooms || {};
  if(!v.m78){ v.m78 = 1; v.settings.demo = false; } /* v7.8: إخفاء التجريبي عن المستخدمين */
  return v;
}catch(e){ return null; } }

const idb = (() => {
  let p;
  const db = () => p || (p = new Promise((res, rej) => {
    try{ const r = indexedDB.open('vibemap', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }catch(e){ rej(e); }
  }));
  return {
    async get(k){ try{ const d = await db(); return await new Promise(res => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); }catch(e){ return undefined; } },
    async set(k, v){ try{ const d = await db(); await new Promise(res => { const tx = d.transaction('kv','readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = res; }); }catch(e){} },
    async clear(){ try{ const d = await db(); await new Promise(res => { const tx = d.transaction('kv','readwrite'); tx.objectStore('kv').clear(); tx.oncomplete = res; tx.onerror = res; }); }catch(e){} },
  };
})();
let msgSaveT;
function saveMsgs(){ clearTimeout(msgSaveT); msgSaveT = setTimeout(() => idb.set('msgs', MSG), 400); }

/* ════════ أدوات ════════ */
function toast(t){ const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2800); }
function vibrate(p){ try{ if(!navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return; navigator.vibrate(p); }catch(e){} }
function makePin(){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = new Uint8Array(8); crypto.getRandomValues(r);
  const c = [...r].map(b => A[b % A.length]).join('');
  return `VM-${c.slice(0,4)}-${c.slice(4)}`;
}
const peerId = pin => 'vibemap-' + pin.toLowerCase();
/* v8.2: المعرّف لازم يكون بالحروف الصغيرة بالضبط — كان «vibemap-VM-..» بحروف كبيرة يُقبل كأنه نفس الصديق (انتحال) */
const pinOf = id => { const m = /^vibemap-(vm-[a-z0-9]{4}-[a-z0-9]{4})$/.exec(id || ''); return m ? m[1].toUpperCase() : ''; };
/* v7.8: صورة المستخدم — إن وُجدت تظهر بدل الحرف */
const avCss = o => `background:${V.color(o && o.color)}` + (o && o.photo && V.photo(o.photo) ? `;background-image:url('${o.photo}');background-size:cover;background-position:center;color:transparent` : '');
const initial = n => (String(n || '?').trim()[0] || '?').toUpperCase();
const isDemo = pin => pin && pin.startsWith('VM-DEMO');
const isEcho = pin => pin === 'VM-DEMO-ECHO';
function fmtDist(m){ if(m == null || isNaN(m)) return '—'; return m < 1000 ? Math.round(m) + ' م' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' كم'; }
function fmtAgo(t){ if(!t) return 'لم يتصل بعد'; const s = Math.round((now() - t) / 1000);
  if(s < 60) return 'قبل لحظات'; if(s < 3600) return 'قبل ' + Math.round(s/60) + ' د'; if(s < 86400) return 'قبل ' + Math.round(s/3600) + ' س'; return 'قبل ' + Math.round(s/86400) + ' يوم'; }
function fmtTime(t){ const d = new Date(t); return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0'); }
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
function distance(a, b){ const R = 6371000, dφ = rad(b.lat - a.lat), dλ = rad(b.lng - a.lng);
  const x = Math.sin(dφ/2)**2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dλ/2)**2; return 2 * R * Math.asin(Math.sqrt(x)); }
function bearing(a, b){ const φ1 = rad(a.lat), φ2 = rad(b.lat), dλ = rad(b.lng - a.lng);
  const y = Math.sin(dλ) * Math.cos(φ2), x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ); return (deg(Math.atan2(y, x)) + 360) % 360; }
function dest(p, d, b){ const R = 6371000, δ = d / R, θ = rad(b), φ1 = rad(p.lat), λ1 = rad(p.lng);
  const φ2 = Math.asin(Math.sin(φ1)*Math.cos(δ) + Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1), Math.cos(δ) - Math.sin(φ1)*Math.sin(φ2)); return { lat: deg(φ2), lng: deg(λ2) }; }
const norm180 = a => ((a % 360) + 540) % 360 - 180;
function throttle(fn, ms){ let last = 0, t; return (...a) => { const d = now() - last; if(d >= ms){ last = now(); fn(...a); } else { clearTimeout(t); t = setTimeout(() => { last = now(); fn(...a); }, ms - d); } }; }

/* ─── base64 ─── */
function b64(buf){ const u = new Uint8Array(buf); let s = ''; for(let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s){ const b = atob(s), u = new Uint8Array(b.length); for(let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const TE = new TextEncoder(), TD = new TextDecoder();

/* ════════ التشفير E2E: ECDH P-256 → AES-GCM 256 ════════ */
let myPriv = null;
/* v7: المفتاح الخاص يُحفظ في IndexedDB ككائن CryptoKey غير قابل للاستخراج — لا يمكن لأي سكربت قراءته أو نسخه */
async function ensureKeys(){
  if(S.keys && S.keys.priv){ // ترحيل من v6: كان المفتاح نصاً في localStorage
    myPriv = await crypto.subtle.importKey('jwk', S.keys.priv, { name:'ECDH', namedCurve:'P-256' }, false, ['deriveKey']);
    await idb.set('privKey', myPriv); delete S.keys.priv; save(); return;
  }
  if(S.keys && S.keys.pub){ myPriv = await idb.get('privKey'); if(myPriv) return; }
  const kp = await crypto.subtle.generateKey({ name:'ECDH', namedCurve:'P-256' }, false, ['deriveKey']);
  S.keys = { pub: await crypto.subtle.exportKey('jwk', kp.publicKey) };
  myPriv = kp.privateKey; await idb.set('privKey', myPriv); save();
}
async function deriveFor(pin){
  const f = S.friends[pin]; if(!f || !f.pub) return null;
  try{
    const pub = await crypto.subtle.importKey('jwk', { kty:f.pub.kty, crv:f.pub.crv, x:f.pub.x, y:f.pub.y }, { name:'ECDH', namedCurve:'P-256' }, false, []);
    RT.keys[pin] = await crypto.subtle.deriveKey({ name:'ECDH', public:pub }, myPriv, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
    return RT.keys[pin];
  }catch(e){ console.warn('derive', e); return null; }
}
async function encryptFor(pin, obj){
  const key = RT.keys[pin]; if(!key) throw new Error('no key');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, TE.encode(JSON.stringify(obj)));
  return { iv: b64(iv), ct: b64(ct) };
}
async function decryptFrom(pin, iv, ct){
  const key = RT.keys[pin]; if(!key) throw new Error('no key');
  const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv: unb64(iv) }, key, unb64(ct));
  return JSON.parse(TD.decode(pt));
}
async function safetyCode(pin, useNew){
  const f = S.friends[pin]; const k = f && (useNew ? f.newPub : f.pub); if(!k) return null;
  const parts = [S.keys.pub.x + S.keys.pub.y, k.x + k.y].sort().join('|');
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', TE.encode(parts)));
  const g = []; for(let i = 0; i < 6; i++) g.push((((h[2*i] << 8) | h[2*i+1]) % 100000).toString().padStart(5, '0'));
  return g.join(' ');
}

/* ════════ الصوت: نغمات + مسار صامت ════════ */
function ctx(){ if(!RT.ctx){ const C = window.AudioContext || window.webkitAudioContext; RT.ctx = C ? new C() : null; } return RT.ctx; }
/* v7.5: محرك الصوت يتوقف بعد ثانيتين من آخر نغمة — كان يعمل طول الوقت ويسخّن الجوال */
function ctxIdle(ms = 2000){ clearTimeout(RT.ctxT); RT.ctxT = setTimeout(() => { const c = RT.ctx; if(c && c.state === 'running' && !RT.siren && !RT.talking) c.suspend().catch(() => {}); }, ms); }
function tone(seq, vol = .22){
  const c = ctx(); if(!c) return; if(c.state === 'suspended') c.resume().catch(() => {}); let t = c.currentTime + .01;
  ctxIdle(2000 + seq.reduce((a, x) => a + x[1], 0) * 1000);
  for(const [f, d] of seq){ const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .02); t += d; }
}
const BEEP = { start:[[880,.06],[1320,.09]], end:[[1320,.05],[990,.05],[660,.1]], rx:[[660,.06],[990,.08]], msg:[[1046,.07],[1318,.1]] };
function silentTrack(){
  const c = ctx(); if(!c) return null;
  if(!RT.silent || RT.silent.readyState !== 'live'){ const d = c.createMediaStreamDestination(); RT.silent = d.stream.getAudioTracks()[0]; }
  return RT.silent;
}
function unlockAudio(){
  const c = ctx(); if(c && c.state === 'suspended') c.resume().catch(() => {}); ctxIdle();
  let blocked = false;
  Object.entries(RT.audios).forEach(([pin, a]) => { if(IS_NATIVE && !RT.rxTalking.has(pin)) return; const p = a.play(); if(p) p.catch(() => { blocked = true; }); });
  setTimeout(() => { $('#tapAudio').hidden = !blocked; }, 50);
}

/* ════════ الشبكة: PeerJS WebRTC ════════ */
function setNet(s){ RT.net = s; const el = $('#net'); const off = S && S.settings && S.settings.offline;
  el.className = 'net ' + (off ? 'manual' : s === 'on' ? 'on' : s === 'wait' ? 'wait' : '');
  el.querySelector('span').textContent = off ? 'غير متصل' : s === 'on' ? 'متصل' : s === 'wait' ? 'يتصل…' : 'انقطع الاتصال';
  if(S && S.me && RT.tab === 'me') renderAll(); }
/* v7.1: كانت قائمتنا تستبدل خوادم TURN المجانية المدمجة في PeerJS، فيفشل الاتصال بين جوالين على شبكة الجوال.
   الآن: STUN + TURN المجاني من PeerJS دائماً، + خادمك الخاص إن أضفته */
function iceServers(){
  const list = [...turnOwn(), { urls:['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls:['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username:'peerjs', credential:'peerjsp' }];
  const st = S.settings;
  if(st.turnUrl) list.push({ urls: st.turnUrl.split(',').map(s => s.trim()).filter(u => /^turns?:/.test(u)), username: st.turnUser, credential: st.turnPass });
  return list;
}
/* v8.4: خادم TURN خاص (من سيرفر VibeMap) — بيانات دخول مؤقتة تتجدد تلقائياً */
function turnOwn(){ const t = RT.turn; return t && t.exp > now() && Array.isArray(t.servers) ? t.servers.filter(x => x && Array.isArray(x.urls) && x.urls.every(u => /^turns?:/.test(u))) : []; }
async function turnFetch(){
  if(!RELAY || S.settings.offline) return;
  if(RT.turn && RT.turn.exp - now() > 3600e3) return;
  const j = await relayPost('/api/turn', {});
  if(j && j.ok && Array.isArray(j.servers)){ RT.turn = { servers:j.servers, exp:now() + (j.ttl || 43200) * 1000 - 600e3 };
    if(RT.peer && RT.peer.options && RT.peer.options.config) RT.peer.options.config.iceServers = iceServers(); }
}
/* خادم التعارف: v8.4 خادم VibeMap الخاص (يوصل من إعدادات السيرفر) — لو تعطّل نرجع مؤقتاً للخادم العام */
function sigParse(v){ try{ if(!v) return {}; const u = new URL(v); if(u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return {};
  return { host:u.hostname, port:+(u.port || (u.protocol === 'https:' ? 443 : 80)), secure:u.protocol === 'https:', path:u.pathname || '/' }; }catch(e){ return {}; } }
function sigOpts(){
  if(RT.sigFallback && now() < RT.sigFallback) return {};
  return sigParse(S.settings.signal || (document.querySelector('meta[name=vibemap-signal]') || {}).content || '');
}
const relayOnly = () => !!(S.settings.relayOnly && S.settings.turnUrl);
function startPeer(){
  if(S.settings.offline){ setNet('off'); return; }
  if(typeof Peer === 'undefined'){ setNet('off'); toast('تعذّر تحميل مكتبة الاتصال'); return; }
  if(RT.peer && !RT.peer.destroyed) RT.peer.destroy();
  setNet('wait');
  const sig = sigOpts(); RT.sigOwn = !!sig.host;
  const peer = new Peer(peerId(S.me.pin), { debug:0, ...sig, pingInterval:20000, config:{ iceServers: iceServers(), iceTransportPolicy: relayOnly() ? 'relay' : 'all' } });
  RT.peer = peer;
  peer.on('open', () => { RT.idRetry = 0; RT.sigFails = 0; RT.netTry = 0; setNet('on'); connectAll(); });
  peer.on('connection', c => setupConn(c, false));
  peer.on('call', onCall);
  peer.on('disconnected', () => { if(peer.destroyed) return; setNet('wait'); setTimeout(() => { try{ if(!peer.destroyed && peer.disconnected) peer.reconnect(); }catch(e){} }, 2500); });
  peer.on('close', () => setNet('off'));
  peer.on('error', e => {
    RT.lastErr = { type:e.type, ts:now() };
    if(e.type === 'peer-unavailable'){
      const m = String(e.message).match(/vibemap-[a-z0-9-]+/); if(m) delete RT.pending[pinOf(m[0])];
    }else if(e.type === 'unavailable-id'){
      /* v7.1: بعد إغلاق التطبيق وفتحه بسرعة يبقى رقمك محجوزاً في الخادم حتى دقيقة تقريباً — نعيد المحاولة بدل التوقف */
      RT.idRetry = (RT.idRetry || 0) + 1; setNet('wait');
      if(RT.idRetry === 7) toast('رقمك مفتوح في جهاز أو نافذة أخرى؟ أغلقها وسيتصل تلقائياً');
      setTimeout(() => { if(RT.peer === peer) startPeer(); }, 8000);
    }else if(e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed'){
      setNet(navigator.onLine === false ? 'down' : 'wait');
      /* خادمنا ما يرد 3 مرات ورا بعض والإنترنت شغال؟ نستخدم الخادم العام 5 دقائق ونرجع نجرب */
      if(RT.sigOwn && navigator.onLine !== false && ++RT.sigFails >= 3){ RT.sigFails = 0; RT.sigFallback = now() + 300e3; }
      setTimeout(() => { if(RT.peer === peer && (peer.destroyed || peer.disconnected)) startPeer(); }, Math.min(30000, 3000 * (1 + (RT.netTry = (RT.netTry || 0) + 1))));
    }else console.warn('peer', e.type, e);
  });
}
/* v8.2: «متصل» فقط عبر اتصال أثبت مفتاح الصديق — ما نرسل صوت لمنتحل */
function isOnline(pin){ if(isDemo(pin)) return !!S.settings.demo; const c = RT.conns[pin]; return !!(c && c.open && c._ok); }
function connectAll(){
  if(!RT.peer || RT.peer.disconnected || RT.peer.destroyed) return;
  for(const pin in S.friends){ const f = S.friends[pin]; if(isDemo(pin) || f.status === 'in') continue; connectTo(pin); }
}
function connectTo(pin){
  if(!RT.peer || RT.peer.disconnected || isDemo(pin)) return;
  if(RT.conns[pin] && RT.conns[pin].open) return;
  if(RT.pending[pin] && now() - RT.pending[pin] < 12000) return;
  RT.pending[pin] = now();
  const c = RT.peer.connect(peerId(pin), { reliable:true });
  c._init = S.me.pin;
  setupConn(c, true);
  /* إذا لم يفتح الاتصال خلال 20 ثانية فالغالب أن الشبكة تمنع الاتصال المباشر */
  setTimeout(() => { if(!c.open){ const st = c.peerConnection && c.peerConnection.iceConnectionState; if(st && st !== 'new') (RT.iceFail || (RT.iceFail = {}))[pin] = { st, ts:now() }; try{ c.close(); }catch(e){} delete RT.pending[pin]; } }, 20000);
}
/* نوع الطريق المستخدم مع كل صديق: مباشر أو عبر TURN */
async function routeOf(pin){
  const c = RT.conns[pin], pc = c && c.peerConnection; if(!pc || !pc.getStats) return null;
  try{ const st = await pc.getStats(); let pair = null, loc = {};
    st.forEach(r => { if(r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
    if(!pair) st.forEach(r => { if(r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') pair = r; });
    if(!pair) return null; st.forEach(r => { if(r.id === pair.localCandidateId) loc = r; });
    return loc.candidateType === 'relay' ? 'relay' : loc.candidateType === 'host' ? 'lan' : 'direct';
  }catch(e){ return null; }
}
function setupConn(c, outgoing){
  const pin = pinOf(c.peer);
  if(!PIN_STRICT.test(pin) || c.peer !== peerId(pin) || isDemo(pin) || pin === S.me.pin || S.blocked[pin] || S.settings.offline){ try{ c.close(); }catch(e){} return; }
  if(!outgoing) c._init = pin; c._t = now();
  c.on('open', () => {
    delete RT.pending[pin]; if(RT.iceFail) delete RT.iceFail[pin];
    c.send({ type:'hello', v:VERSION, pin:S.me.pin, name:S.me.name, color:S.me.color, pub:S.keys.pub, rep:myRep(), lvl:myLevel(), bio:S.me.bio || null, via:(S.friends[pin] && S.friends[pin].status === 'out' && S.friends[pin].via) || undefined });
  });
  c.on('data', d => { c._rx = now(); onData(c, pin, d).catch(e => console.warn('data', e)); });
  c.on('close', () => { if(RT.conns[pin] === c){ delete RT.conns[pin]; const f = S.friends[pin]; if(f){ f.seen = now(); save(); } RT.rxTalking.delete(pin); renderAll(); } });
  c.on('error', () => { delete RT.pending[pin]; });
}
async function onData(c, pin, d){
  if(!d || typeof d !== 'object' || typeof d.type !== 'string') return;
  /* v8.4: نبض الاتصال — نعرف فوراً لو الطرف الثاني انقطع بدل ما يظل «متصل» وهو مو موجود */
  if(d.type === 'ping'){ c._hb = true; try{ c.send({ type:'pong' }); }catch(e){} return; }
  if(d.type === 'pong'){ c._hb = true; return; }
  if(!rateOk(pin)){ if(!RATE[pin].warned){ RATE[pin].warned = true; console.warn('rate limit', pin); } return; }
  if(d.type === 'hello'){
    if(pinOf(c.peer) !== d.pin) return;
    const pub = V.pub(d.pub); if(!pub) return;
    d = { ...d, name:V.name(d.name), color:V.color(d.color), rep:V.rep(d.rep), lvl:V.lvl(d.lvl), bio:V.bio(d.bio), v:V.str(d.v, 8), pub };
    { const f0 = S.friends[pin];
      /* v8.2: طلب معلّق وله مفتاح معروف (من الخادم الموثّق) — مفتاح مختلف في الاتصال المباشر = منتحل، نقفل */
      if(f0 && f0.status !== 'friend' && f0.pub && (f0.pub.x !== pub.x || f0.pub.y !== pub.y)){ try{ c.close(); }catch(e){} return; }
      /* v8.2: الطلبات الجديدة لازم توصل عبر الخادم (يتأكد من صاحب الرقم) — ما نقبل طلب من اتصال مباشر مجهول */
      if(!f0 && RELAY){ try{ c.close(); }catch(e){} if(now() - (RT.rfUnk || 0) > 3000){ RT.rfUnk = now(); setTimeout(() => relayFetch(), 600); } return; } }
    if(!S.friends[pin] && Object.values(S.friends).filter(x => x.status === 'in').length >= 20){ try{ c.close(); }catch(e){} return; }
    const old = RT.conns[pin];
    if(old && old !== c && old.open){
      /* اتصالين بنفس اللحظة (كل واحد اتصل بالثاني): نختار واحد بقاعدة ثابتة. غير كذا الجديد أحدث — صاحبه أعاد فتح التطبيق */
      const simult = Math.abs((c._t || 0) - (old._t || 0)) < 8000;
      const keepNew = !simult || c._init === [S.me.pin, pin].sort()[0];
      if(keepNew) old.close(); else { c.close(); return; }
    }
    RT.conns[pin] = c;
    let f = S.friends[pin];
    const pubChanged = f && f.pub && f.pub.x !== d.pub.x;
    if(!f){
      f = S.friends[pin] = { pin, name:d.name, color:d.color, status:'in', added:now() };
      /* v7.8: طلب من عضو في غرفة مشتركة — لا نعرض رقمه */
      { const vr = V.id(d.via), rr = vr && S.rooms[vr]; if(rr && rr.members.includes(pin)){ f.via = vr; f.hidePin = true; } }
      notify('طلب صداقة جديد', `${d.name} يريد إضافتك في VibeMap`);
      tone(BEEP.msg); toast(`طلب صداقة من ${d.name}`);
    }
    f.name = d.name; f.color = d.color; f.rep = d.rep; f.lvl = d.lvl; f.bio = d.bio; f.seen = now(); f.ver = d.v; if(f.status === 'friend') delete f.reqVoice;
    if(pubChanged && f.status === 'friend'){
      /* v7: لا نثق بالمفتاح الجديد تلقائياً — نوقف المراسلة حتى يتحقق المستخدم (حماية من انتحال الرقم) */
      if(!f.newPub || f.newPub.x !== pub.x){ f.newPub = pub; f.keyAlert = true; delete RT.keys[pin];
        sysMsg(pin, '⚠️ تغيّر رمز الأمان لهذا الصديق. أوقفنا الرسائل والصوت معه حتى تتأكد منه وجهاً لوجه أو باتصال هاتفي، ثم اضغط «تحققت» من صفحته.');
        notify('تنبيه أمان', `تغيّر رمز الأمان لـ ${f.name}`); }
    } else if(f.pub || !RELAY){ f.pub = pub; await deriveFor(pin); }
    /* الاتصال موثوق فقط إذا مفتاحه نفس المفتاح اللي نعرفه */
    c._hp = pub; c._ok = !!(f.pub && f.pub.x === pub.x && f.pub.y === pub.y && !f.keyAlert);
    if(f.status === 'friend' && c._ok){ onFriendOnline(pin); }
    save(); renderAll();
    return;
  }
  const f = S.friends[pin]; if(!f) return;
  if(!c._ok) return; /* v8.2: أي أمر من اتصال ما أثبت مفتاحه نتجاهله */
  if(d.type === 'request-accept' || d.type === 'accept'){
    /* v8.2: القبول فقط لطلب «أنا» أرسلته — كان الطرف الثاني يقدر يقبل طلبه بنفسه ويصير صديقك غصب */
    if(f.status === 'out'){ f.status = 'friend'; save(); toast(`${f.name} قبل طلب الصداقة`); onFriendOnline(pin); renderAll(); }
    return;
  }
  if(d.type === 'decline' || d.type === 'remove'){
    const name = f.name; delete S.friends[pin]; delete MSG[pin]; save(); saveMsgs(); try{ c.close(); }catch(e){}
    if(d.type === 'decline') toast(`${name} رفض طلب الصداقة`);
    renderAll(); return;
  }
  if(d.type === 'enc'){
    if(f.status !== 'friend' || f.keyAlert) return;
    if(typeof d.iv !== 'string' || typeof d.ct !== 'string' || d.ct.length > 4e6) return;
    let m; try{ m = await decryptFrom(pin, d.iv, d.ct); }catch(e){ console.warn('decrypt fail'); return; }
    f.seen = now();
    handleInner(pin, m);
  }
}
function onFriendOnline(pin){
  ensureCall(pin);
  sendLoc(pin, true);
  // أعد إرسال الرسائل المعلّقة
  (MSG[pin] || []).filter(m => m.from === 'me' && m.st === 'pending').forEach(m => deliver(pin, m));
  setTimeout(() => syncStories(pin), 800);
  clearTimeout(RT.rfT); RT.rfT = setTimeout(() => relayFetch(), 2500); /* v8.0: ممكن ترك لنا شي في الخادم وهو غايب */
  setTimeout(() => roomsOnline(pin), 1200);
  if(S.me.photo) setTimeout(() => sendAvatar(pin), 1600);
}
async function sendEnc(pin, obj){
  if(isDemo(pin)){ demoReceive(pin, obj); return true; }
  const c = RT.conns[pin];
  if(!c || !c.open || !c._ok || !RT.keys[pin] || S.friends[pin]?.status !== 'friend' || S.friends[pin]?.keyAlert) return false;
  try{ const e = await encryptFor(pin, obj); c.send({ type:'enc', iv:e.iv, ct:e.ct }); return true; }catch(e){ console.warn('send', e); return false; }
}
function friendsOnline(){ return Object.values(S.friends).filter(f => f.status === 'friend' && isOnline(f.pin)).map(f => f.pin); }

/* ════════ v8.0: التوصيل عبر الخادم ════════
   لو صديقك مقفل التطبيق أو جواله نايم: الرسالة تنحفظ مشفّرة في خادم VibeMap (ما يقدر يقرأها)،
   ويوصل لجواله إشعار فوري، وأول ما يفتح التطبيق تنزل عنده. نداء الاستغاثة يوصل بصوت إنذار. */
const RELAY = ((document.querySelector('meta[name=vibemap-relay]') || {}).content || '').replace(/\/+$/, '');
const RL = { ok:false, push:false, fcm:false, busy:false, again:false, taken:false, last:0 };
function relayKey(){ if(!S.me.rk){ S.me.rk = b64(crypto.getRandomValues(new Uint8Array(32))); save(); } return S.me.rk; }
async function relayPost(path, body){
  if(!RELAY || !S || !S.me) return null;
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 20000);
  try{
    const r = await fetch(RELAY + path, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ pin:S.me.pin, key:relayKey(), ...body }), signal:ac.signal });
    const j = await r.json().catch(() => null); RL.lastErr = !r.ok && j && j.err || '';
    if(r.status === 401 && path !== '/api/reg'){ RL.ok = false; relayReg(); }
    return r.ok ? j : null;
  }catch(e){ RL.lastErr = 'net'; return null; } finally { clearTimeout(t); }
}
async function pushToken(){
  const P = NP('VibePush'); if(!P) return null;
  try{ const r = await P.getToken(); return r && r.token || null; }catch(e){ console.warn('push token', e); return null; }
}
async function relayReg(){
  if(!RELAY || RL.regBusy) return; RL.regBusy = true;
  try{
    const fcm = S.settings.offline ? null : await pushToken();
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 20000);
    const r = await fetch(RELAY + '/api/reg', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ pin:S.me.pin, key:relayKey(), fcm:fcm || '', plat:PLATFORM, dev:RT.dev || undefined, allow:allowList() }), signal:ac.signal }).catch(() => null);
    clearTimeout(t);
    const j = r && await r.json().catch(() => null);
    RL.taken = !!(r && r.status === 403);
    RL.ok = !!(j && j.ok); RL.push = !!(j && j.push); RL.fcm = !!(j && j.fcm);
    if(RL.ok && j.pending) relayFetch();
  }finally{ RL.regBusy = false; }
}
async function relayInit(){
  if(!RELAY) return;
  const P = NP('VibePush');
  if(P){ try{ await P.addListener('push', d => { if(d && d.k === 'news' && d.f === 'VM-NEWS-0000'){ if(d.r) toast('📢 ' + String(d.r).slice(0, 180)); cfgFetch(); } else relayFetch(true); }); await P.addListener('token', () => relayReg()); }catch(e){} askNotifOnce(); }
  await relayReg(); turnFetch();
  setInterval(() => { if(document.visibilityState === 'visible') relayFetch(); }, 30000);
  /* طلب صداقة معلّق: نتحقق كل 5 ثواني عشان القبول يوصل بسرعة */
  setInterval(() => { if(document.visibilityState === 'visible' && Object.values(S.friends).some(f => f.status === 'out')) relayFetch(); }, 5000);
}
/* أندرويد 13+: نطلب إذن الإشعارات مرة وحدة — بدونه ما يوصل تنبيه الرسائل والاستغاثة */
async function askNotifOnce(){
  const LN = NP('LocalNotifications'); if(!LN || S.settings.askedNotif) return;
  try{ const c = await LN.checkPermissions(); if(c.display === 'prompt' || c.display === 'prompt-with-rationale'){ S.settings.askedNotif = true; save(); const r = await LN.requestPermissions(); RT.lnPerm = r.display === 'granted' ? 'granted' : 'denied'; } }catch(e){}
}
async function relaySend(pin, obj, kind, roomName){
  if(!RELAY || isDemo(pin)) return false;
  const f = S.friends[pin]; if(!f || f.status !== 'friend' || f.keyAlert) return false;
  if(!RT.keys[pin] && !(await deriveFor(pin))) return false;
  try{
    const e = await encryptFor(pin, obj);
    const j = await relayPost('/api/send', { to:pin, items:[{ id:(obj.id && /^[A-Za-z0-9_-]{4,40}$/.test(obj.id) ? (obj.k === 'chat' || obj.k === 'photo' || obj.k === 'voice' || obj.k === 'rmsg' ? '' : obj.k + '-') + obj.id : uid()), iv:e.iv, ct:e.ct }],
      push: kind ? { k:kind, n:S.me.name, r:roomName || '' } : null });
    return !!(j && j.ok);
  }catch(e){ console.warn('relay send', e); return false; }
}
/* يرسل مباشرة لو الصديق متصل، وإلا عبر الخادم */
async function sendAny(pin, obj, kind, roomName){
  if(await sendEnc(pin, obj)) return 'p2p';
  return (await relaySend(pin, obj, kind, roomName)) ? 'relay' : false;
}
async function relayFetch(fromPush){
  if(!RELAY || !S || S.settings.offline) return;
  if(RL.busy){ RL.again = true; return; } RL.busy = true;
  RT.quietNotify = !!(fromPush && PLATFORM === 'android');
  try{
    for(let round = 0; round < 10; round++){
      const j = await relayPost('/api/inbox', {}); if(!j || !Array.isArray(j.items)) break;
      const done = [];
      for(const x of j.items){
        const pin = typeof x.f === 'string' ? x.f : ''; done.push(pin + '/' + x.id);
        if(!PIN_STRICT.test(pin) || isDemo(pin)) continue;
        if(x.iv === 'PLAIN'){ try{ handlePlain(pin, JSON.parse(TD.decode(unb64(x.ct))), null); }catch(e){} continue; }
        if(x.iv === 'X'){ try{ const o = await openSealed(x.ct); handlePlain(pin, o.m, o.pub); }catch(e){ console.warn('sealed', e); } continue; }
        const f = S.friends[pin]; if(!f || f.status !== 'friend' || f.keyAlert || S.blocked[pin]) continue;
        if(!RT.keys[pin] && !(await deriveFor(pin))) continue;
        let m; try{ m = await decryptFrom(pin, x.iv, x.ct); }catch(e){ console.warn('relay decrypt'); continue; }
        m._relay = true; handleInner(pin, m);
      }
      if(done.length) await relayPost('/api/ack', { ids:done });
      RL.last = now();
      if(!j.more) break;
    }
  }finally{ RL.busy = false; RT.quietNotify = false; if(RL.again){ RL.again = false; setTimeout(() => relayFetch(), 300); } }
}
const pushKind = m => m.type === 'voice' ? 'voice' : m.type === 'photo' ? 'photo' : 'msg';

/* ─── الرسائل الواردة ─── */
function handleInner(pin, m){
  const f = S.friends[pin];
  if(!m || typeof m !== 'object' || !f) return;
  switch(m.k){
    case 'chat': case 'photo': case 'voice': {
      const id = V.id(m.id); if(!id) break;
      const type = m.k === 'chat' ? 'text' : m.k;
      const data = type === 'photo' ? V.photo(m.data) : type === 'voice' ? V.audio(m.data) : null; if(type !== 'text' && !data) break;
      const text = type === 'text' ? V.str(m.text, 4000) : ''; if(type === 'text' && !text.trim()) break;
      m = { k:m.k, id, type, text, data, dur:V.num(m.dur, 0, 120) || 0, live:m.live === true, ts: V.num(m.ts, 1e12, 1e13) || now(), ttl: V.ttl(m.ttl) };
      const arr = MSG[pin] || (MSG[pin] = []);
      if(arr.some(x => x.id === m.id)) break;
      if(arr.length > 2000) arr.splice(0, arr.length - 2000);
      arr.push({ id:m.id, from:'them', type, text:m.text, data:m.data, dur:m.dur, live:m.live, ts:m.ts, ttl:m.ttl, st:'recv' });
      sendAny(pin, { k:'ack', id:m.id }); saveMsgs();
      if(RT.chatWith === pin && document.visibilityState === 'visible'){ markRead(pin); if(type === 'voice' && !m.live && isEcho(pin)) setTimeout(() => playVoice(pin, m.id), 300); }
      else if(!f.mute){ const lbl = msgLabel(m); tone(BEEP.msg); vibrate(40); notify(f.name, !S.settings.notifPreview ? 'رسالة جديدة' : lbl); if(RT.chatWith !== pin) toast(`${f.name}: ${lbl}`); }
      renderAll(); break;
    }
    case 'ack': { const x = (MSG[pin] || []).find(x => x.from === 'me' && x.id === m.id); if(x && x.st !== 'read'){ x.st = 'delivered'; saveMsgs(); renderChatIfOpen(pin); } break; }
    case 'read': { const x = (MSG[pin] || []).find(x => x.from === 'me' && x.id === m.id); if(x){ x.st = 'read'; x.readAt = now(); saveMsgs(); renderChatIfOpen(pin); } break; }
    case 'loc': {
      { const ts = V.num(m.ts, 1e12, 1e13); if(ts && now() - ts > 15 * 60e3) break; } /* v8.2: موقع قديم (إعادة إرسال) نتجاهله */
      if(m.hidden){ f.hidden = true; f.loc = null; }
      else { const l = V.loc(m); if(!l) break; f.hidden = false; f.loc = { ...l, ts:now() }; }
      save(); renderStage(); if(RT.tab === 'friends') renderFriends(); break;
    }
    case 'talk': {
      clearTimeout((RT.rxT || (RT.rxT = {}))[pin]);
      if(m.on) RT.rxT[pin] = setTimeout(() => { if(RT.rxTalking.delete(pin)){ rxPlay(pin, false); renderTalk(); renderStage(); } }, 65000); /* احتياط لو ضاعت رسالة «انتهى» */
      if(m.on && m._relay) break; /* الكلام المباشر ما يجي عبر الخادم */
      { const ts = V.num(m.ts, 1e12, 1e13); if(m.on && ts && now() - ts > 90e3) break; }
      /* v8.1: اثنين ضغطوا مع بعض — اللي ضغط أول يكمل والثاني يسكت */
      if(m.on && RT.talking && (RT._txTargets || []).includes(pin)){ const their = V.num(m.ts, 1e12, 1e13) || now();
        if(their < (RT.talkTs || 0) || (their === RT.talkTs && pin < S.me.pin)){ pttUp(); if(RT.rec) chatRecStop(true); toast(`${f.name} سبقك بالكلام — انتظر لين يخلص`); } }
      if(m.on){ if(!RT.rxTalking.has(pin)){ RT.rxTalking.add(pin); tone(BEEP.rx); vibrate(25); if(!f.mute) notify(`${f.name} يتحدث`, 'افتح VibeMap للاستماع'); } rxPlay(pin, true); }
      else { RT.rxTalking.delete(pin); rxPlay(pin, false); }
      renderTalk(); renderStage(); break;
    }
    case 'sos': {
      const ts = V.num(m.ts, 1e12, 1e13) || now();
      if(m.on === false){ if(RT.sosFrom && RT.sosFrom.pin === pin) stopSosAlert(); if(f.sos) sysMsg(pin, `✅ ${f.name} ألغى نداء الاستغاثة`); f.sos = false; f.sosOff = ts; }
      else {
        if(f.sosTs === ts || (f.sosOff && f.sosOff > ts)) break; /* وصل مرتين (مباشر + خادم) أو أُلغي بعده */
        f.sosTs = ts; const l = V.loc(m); if(l) f.loc = { ...l, ts:now() };
        sysMsg(pin, `🆘 نداء استغاثة من ${f.name}${l ? ` — https://www.google.com/maps/search/?api=1&query=${(+l.lat).toFixed(6)},${(+l.lng).toFixed(6)}` : ''}`);
        if(now() - ts < 2 * 3600e3){ f.sos = true; showSosAlert(pin); }
        else toast(`${f.name} أرسل نداء استغاثة ${fmtAgo(ts)}`);
      }
      save(); saveMsgs(); renderStage(); renderAll(); break;
    }
    case 'story': recvStory(pin, m); break;
    case 'poke': recvPoke(pin, m); break;
    case 'story-react': recvStoryReact(pin, m); break;
    case 'story-shot': recvStoryShot(pin, m); break;
    case 'avatar': { const d = m.data === '' ? null : V.photo(m.data); if(m.data !== '' && (!d || d.length > 90000)) break; if(f.photo === d) break; f.photo = d; save(); renderAll(); break; }
    case 'room': recvRoom(pin, m); break;
    case 'rmsg': recvRoomMsg(pin, m); break;
    case 'rack': { const rid = V.id(m.room), r = rid && S.rooms[rid]; const x = r && (MSG['R:' + rid] || []).find(y => y.from === 'me' && y.id === m.id);
      if(x && r.members.includes(pin)){ x.dl = x.dl || []; if(!x.dl.includes(pin)) x.dl.push(pin); x.st = x.dl.length >= r.members.length - 1 ? 'delivered' : 'sent'; saveMsgs(); renderChatIfOpen('R:' + rid); } break; }
    case 'room-leave': { const rid = V.id(m.room), r = rid && S.rooms[rid]; if(r && r.members.includes(pin)){ r.members = r.members.filter(p => p !== pin);
      if(r.owner === S.me.pin){ r.v = (r.v || 1) + 1; pushRoom(r); } save(); sysMsg('R:' + rid, `${memberName(r, pin)} غادر الغرفة`); renderAll(); } break; }
    case 'room-del': { const rid = V.id(m.room), r = rid && S.rooms[rid]; if(r && r.owner === pin){ delete S.rooms[rid]; delete MSG['R:' + rid]; if(RT.target === 'R:' + rid) RT.target = null; save(); saveMsgs(); if(RT.chatWith === 'R:' + rid) closeChat(); toast(`حُذفت غرفة «${r.name}»`); renderAll(); } break; }
    case 'story-sync': { const ids = Array.isArray(m.ids) ? m.ids.filter(x => typeof x === 'string').slice(0, 50) : [];
      const before = (STO.fr[pin] || []).length; STO.fr[pin] = (STO.fr[pin] || []).filter(x => ids.includes(x.id));
      if(STO.fr[pin].length !== before){ saveSto(); renderStories(); renderStage(); if(SV && SV.pin === pin) closeStories(); } break; }
    case 'story-seen': { const x = STO.mine.find(y => y.id === m.id); if(x){ x.views = x.views || {}; if(!x.views[pin]){ x.views[pin] = now(); saveSto(); if(SV && SV.mine) renderStoryView(); } } break; }
    case 'rate': { const t = V.num(m.t, 1, 5), e = V.num(m.e, 1, 5), h = V.num(m.h, 1, 5); if(t == null || e == null || h == null) break; S.ratingsIn[pin] = { t, e, h, ts:now() }; save(); toast(`${f.name} قيّمك`); if(RT.tab === 'me') renderMe(); break; }
  }
}

/* ════════ المكالمات الصوتية (PTT) ════════ */
/* v7.5: جودة وسرعة الصوت — Opus بصوت عريض 32kbps، تصحيح أخطاء الشبكة (FEC)، وإيقاف الإرسال في الصمت (DTX) */
function opusTune(sdp){
  const m = sdp.match(/a=rtpmap:(\d+) opus\/48000/i); if(!m) return sdp;
  const pt = m[1], want = { minptime:'10', useinbandfec:'1', usedtx:'1', stereo:'0', 'sprop-stereo':'0', maxaveragebitrate:'40000', maxplaybackrate:'48000', cbr:'0' };
  const re = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
  const merge = cur => { const o = {}; cur.split(';').forEach(kv => { const [k, v] = kv.split('='); if(k) o[k.trim()] = (v || '').trim(); }); Object.assign(o, want); return Object.entries(o).map(([k, v]) => `${k}=${v}`).join(';'); };
  return re.test(sdp) ? sdp.replace(re, (x, cur) => `a=fmtp:${pt} ${merge(cur)}`) : sdp.replace(m[0], `${m[0]}\r\na=fmtp:${pt} ${merge('')}`);
}
function tuneSender(pc){
  pc.getSenders().forEach(snd => { if(snd.track && snd.track.kind !== 'audio') return; try{ const p = snd.getParameters(); if(!p.encodings || !p.encodings.length) p.encodings = [{}];
    p.encodings.forEach(e => { e.maxBitrate = 40000; e.priority = 'high'; e.networkPriority = 'high'; }); snd.setParameters(p).catch(() => {}); }catch(e){} });
}
function tuneReceiver(pc){ pc.getReceivers().forEach(r => { try{ if('jitterBufferTarget' in r) r.jitterBufferTarget = 30; else if('playoutDelayHint' in r) r.playoutDelayHint = 0.03; }catch(e){} }); }
function ensureCall(pin){
  if(isDemo(pin) || !RT.peer || RT.peer.disconnected) return;
  const ex = RT.outCalls[pin]; if(ex && !ex._closed) return;
  const tr = silentTrack(); if(!tr) return;
  try{
    const call = RT.peer.call(peerId(pin), new MediaStream([tr]), { metadata:{ app:'vibemap' }, sdpTransform:opusTune });
    if(!call) return;
    RT.outCalls[pin] = call;
    const done = () => { call._closed = true; if(RT.outCalls[pin] === call) delete RT.outCalls[pin]; };
    call.on('close', done); call.on('error', done);
    /* بعد الاتصال: لا نرسل أي صوت حتى تضغط زر التحدث (بدل بث الصمت طول الوقت) */
    const pc = call.peerConnection;
    if(pc){ const idle = () => { if(pc.connectionState === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed'){ tuneSender(pc); if(!(RT.talking && (RT._txTargets || []).includes(pin))) setTrack(pin, null); } };
      pc.addEventListener('iceconnectionstatechange', idle); pc.addEventListener('connectionstatechange', idle); }
  }catch(e){ console.warn('call', e); }
}
function onCall(call){
  const pin = pinOf(call.peer);
  const f = S.friends[pin];
  if(!PIN_STRICT.test(pin) || call.peer !== peerId(pin) || !f || f.status !== 'friend' || f.keyAlert || S.settings.offline){ try{ call.close(); }catch(e){} return; }
  /* v8.2: نرد على المكالمة فقط بعد ما يثبت الاتصال مفتاح الصديق */
  const ok = () => { const c = RT.conns[pin]; return !!(c && c.open && c._ok); };
  if(ok()) return answerCall(call, pin);
  let n = 0; const t = setInterval(() => { if(ok()){ clearInterval(t); answerCall(call, pin); } else if(++n > 40){ clearInterval(t); try{ call.close(); }catch(e){} } }, 100);
}
function answerCall(call, pin){
  call.answer(undefined, { sdpTransform:opusTune });
  call.on('stream', stream => {
    if(call.peerConnection) tuneReceiver(call.peerConnection);
    let a = RT.audios[pin];
    if(!a){ a = document.createElement('audio'); a.autoplay = !IS_NATIVE; a.setAttribute('playsinline', ''); $('#audioBin').appendChild(a); RT.audios[pin] = a; }
    a.srcObject = stream;
    if(!IS_NATIVE || RT.rxTalking.has(pin)){ const p = a.play(); if(p) p.catch(() => { $('#tapAudio').hidden = false; }); }
  });
}
function setTrack(pin, track){
  const call = RT.outCalls[pin]; const pc = call && call.peerConnection; if(!pc) return;
  pc.getSenders().forEach(s => { if(!s.track || s.track.kind === 'audio') s.replaceTrack(track).catch(() => {}); });
}
async function getMicTrack(){
  clearTimeout(RT.micTimer);
  if(RT.micTrack && RT.micTrack.readyState === 'live') return RT.micTrack;
  const s = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true, channelCount:{ ideal:1 }, sampleRate:{ ideal:48000 }, latency:{ ideal:0.01 } }, video:false });
  RT.micTrack = s.getAudioTracks()[0]; return RT.micTrack;
}
/* v7.6: نحرر الميكروفون بسرعة (فوراً تقريباً والتطبيق في الخلفية) — عشان واتساب وغيره يقدرون يسجلون */
function releaseMicNow(){ clearTimeout(RT.micTimer); if(!RT.talking && !RT.rec && RT.micTrack){ RT.micTrack.stop(); RT.micTrack = null; } }
/* v8.1: الميكروفون يبقى جاهز 15 ثانية بعد آخر كلام والتطبيق قدامك — الرد يطلع فوراً بدون تأخير */
function releaseMicSoon(){ clearTimeout(RT.micTimer); RT.micTimer = setTimeout(releaseMicNow, document.visibilityState === 'visible' ? 15000 : 600); }
/* v7.6: في تطبيق الجوال لا يبقى مشغّل الصوت مفتوحاً إلا وأحد يتكلم — لا نحجز الصوت ولا نأثر على التطبيقات الأخرى */
function rxPlay(pin, on){
  const a = RT.audios[pin]; if(!a) return;
  clearTimeout(a._pt);
  if(on){ const c = ctx(); if(c && c.state === 'suspended') c.resume().catch(() => {}); ctxIdle(4000);
    const p = a.play(); if(p) p.catch(() => { $('#tapAudio').hidden = false; }); }
  else if(IS_NATIVE) a._pt = setTimeout(() => { if(!RT.rxTalking.has(pin)) a.pause(); }, 1200);
}
function pttTargets(){
  if(RT.target && isRoom(RT.target)){ if(roomOf(RT.target)) return convTargets(RT.target); RT.target = null; }
  if(RT.target && S.friends[RT.target]) return isOnline(RT.target) ? [RT.target] : []; /* اخترت شخصاً: له هو فقط حتى لو غير متصل */
  /* v7.6: «صدى» و«سارة» التجريبيان لا يدخلان في التحدث للجميع إذا عندك أصدقاء حقيقيون — كان «صدى» يعيد صوتك فجأة */
  const all = friendsOnline(), real = Object.values(S.friends).some(f => f.status === 'friend' && !f.demo);
  return real ? all.filter(p => !isDemo(p)) : all; }

async function pttDown(){
  if(RT.talking) return;
  if(S.settings.offline){ toast('أنت «غير متصل» — اضغط الحالة أعلى الشاشة وارجع «متصل» عشان تتكلم'); return; }
  if(floorBusy()) return;
  unlockAudio();
  const targets = pttTargets();
  /* غير متصل؟ إذا اخترت شخصاً أو غرفة نسجّل رسالة صوتية توصله أول ما يتصل */
  const offlineTo = !targets.length && RT.target && convInfo(RT.target) ? RT.target : null;
  if(!targets.length && !offlineTo){ toast('لا يوجد أصدقاء متصلون الآن — اختر صديقاً من «لمن تتحدث» لتسجيل رسالة صوتية'); return; }
  RT.talking = true; RT.talkTs = now(); renderTalk();
  let track;
  try{ track = await getMicTrack(); }
  catch(e){ RT.talking = false; renderTalk(); toast('اسمح باستخدام الميكروفون من إعدادات المتصفح ثم حاول مجدداً'); return; }
  if(!RT.talking){ releaseMicSoon(); return; }
  tone(BEEP.start); vibrate(20); bgTalk(true); stat('talks');
  pttRecStart(track, targets);
  if(!RT.bgMic && BG() && S.settings.bgMode){ RT.bgMic = true; bgApply(); } /* بعد السماح بالميكروفون نعيد تشغيل الخدمة لتشمل التحدث من الخلفية */
  RT._txTargets = targets;
  for(const pin of targets){
    if(isDemo(pin)){ if(isEcho(pin)) startEcho(track); continue; } /* صدى يدخل هنا فقط إذا اخترته بنفسك أو ما عندك أصدقاء حقيقيون */
    sendEnc(pin, { k:'talk', on:true, ts:RT.talkTs }); ensureCall(pin); setTrack(pin, track);
  }
}
/* v7.8: كل تحدث من الرادار/الفقاعة/الأزرار يُحفظ تلقائياً كرسالة صوتية في المحادثة */
function pttRecStart(track, targets){
  const mime = pickMime(); if(mime === null || RT.rec) return;
  const convs = RT.target && (isRoom(RT.target) || !targets.length) ? [RT.target] : targets.filter(p => S.friends[p]);
  if(!convs.length) return;
  try{ const mr = new MediaRecorder(new MediaStream([track]), mime ? { mimeType:mime, audioBitsPerSecond:32000 } : undefined);
    const rec = { mr, chunks:[], t0:now(), convs, live:targets.length > 0 }; mr.ondataavailable = e => { if(e.data && e.data.size) rec.chunks.push(e.data); };
    mr.onstop = () => { const dur = (now() - rec.t0) / 1000; if(dur < .8) return; const blob = new Blob(rec.chunks, { type:mr.mimeType || 'audio/webm' }); if(!blob.size || blob.size > 1.4e6) return;
      const fr = new FileReader(); fr.onload = () => { const data = V.audio(String(fr.result)); if(!data) return; rec.convs.forEach(c => { if(convInfo(c)) sendMsg(c, { type:'voice', data, dur:Math.min(VOICE_MAX, dur), live:rec.live }); });
        if(!rec.live) toast('حُفظت رسالتك الصوتية وتوصل أول ما يتصل'); }; fr.readAsDataURL(blob); };
    mr.start(250); RT.pttRec = rec; rec.timer = setTimeout(() => { if(RT.pttRec === rec) pttUp(); }, VOICE_MAX * 1000); }catch(e){ RT.pttRec = null; }
}
function pttUp(){
  if(RT.pttRec){ const r = RT.pttRec; RT.pttRec = null; clearTimeout(r.timer); try{ r.mr.stop(); }catch(e){} }
  if(!RT.talking) return;
  RT.talking = false;
  Object.keys(RT.outCalls).forEach(pin => setTrack(pin, null));
  ctxIdle(2500);
  (RT._txTargets || []).forEach(pin => { if(!isDemo(pin)) sendEnc(pin, { k:'talk', on:false }); });
  RT._txTargets = [];
  stopEcho();
  tone(BEEP.end); vibrate(10); bgTalk(false);
  releaseMicSoon(); renderTalk();
}

/* ─── بوت الصدى لاختبار الصوت ─── */
function startEcho(track){
  if(typeof MediaRecorder === 'undefined') return;
  if(RT.echoRec){ try{ RT.echoRec.onstop = null; RT.echoRec.stop(); }catch(e){} RT.echoRec = null; }
  if(RT.echoAudio){ try{ RT.echoAudio.pause(); }catch(e){} RT.echoAudio = null; }
  try{ RT.echoChunks = []; const r = new MediaRecorder(new MediaStream([track])); r.ondataavailable = e => { if(e.data && e.data.size) RT.echoChunks.push(e.data); };
    r.onstop = () => { const blob = new Blob(RT.echoChunks, { type: r.mimeType || 'audio/webm' }); if(!blob.size) return;
      const url = URL.createObjectURL(blob);
      setTimeout(() => { if(RT.talking) { URL.revokeObjectURL(url); return; } const a = new Audio(url); RT.echoAudio = a; RT.rxTalking.add('VM-DEMO-ECHO'); tone(BEEP.rx); renderTalk(); renderStage();
        const end = () => { RT.rxTalking.delete('VM-DEMO-ECHO'); renderTalk(); renderStage(); tone(BEEP.end, .12); URL.revokeObjectURL(url); };
        a.onended = end; a.onerror = end; a.play().catch(end); }, 700); };
    r.start(); RT.echoRec = r; }catch(e){ console.warn('echo', e); }
}
function stopEcho(){ if(RT.echoRec && RT.echoRec.state !== 'inactive') RT.echoRec.stop(); RT.echoRec = null; }

/* ════════ الموقع والبوصلة ════════ */
let geoWatch = null;
/* v7.5: GPS عالي الدقة فقط والرادار أمامك. في الخلفية أو باقي الصفحات دقة أقل وتحديث أبطأ (أهم مصدر للحرارة) */
function geoWant(){ return !S.settings.eco || (document.visibilityState === 'visible' && RT.tab === 'radar') ? 'high' : 'low'; }
function geoRefresh(){ if(geoWatch != null && RT.geoMode !== geoWant()){ navigator.geolocation.clearWatch(geoWatch); geoWatch = null; startGeo(); } }
function startGeo(){
  if(!('geolocation' in navigator)){ RT.geoErr = 'الجهاز لا يدعم تحديد الموقع'; renderStage(); return; }
  if(geoWatch != null) return;
  RT.geoMode = geoWant(); const high = RT.geoMode === 'high';
  geoWatch = navigator.geolocation.watchPosition(p => {
    RT.myLoc = { lat:p.coords.latitude, lng:p.coords.longitude, acc:p.coords.accuracy, ts:now() }; if(S.settings.pubVis) pubSync();
    if(RT.heading == null && p.coords.heading != null && !isNaN(p.coords.heading) && p.coords.speed > 1) RT.gpsHeading = p.coords.heading;
    RT.geoErr = null; broadcastLoc(); if(document.visibilityState === 'visible') renderStageT();
  }, err => { RT.geoErr = err.code === 1 ? 'لم تسمح بالوصول للموقع' : 'تعذّر تحديد موقعك الآن'; geoWatch = null; renderStage(); },
  high ? { enableHighAccuracy:true, maximumAge:3000, timeout:25000 } : { enableHighAccuracy:false, maximumAge:30000, timeout:60000 });
}
function sendLoc(pin, force){
  if(S.settings.ghost) return sendEnc(pin, { k:'loc', hidden:true });
  if(!RT.myLoc) return;
  sendEnc(pin, { k:'loc', lat:+RT.myLoc.lat.toFixed(6), lng:+RT.myLoc.lng.toFixed(6), acc:Math.round(RT.myLoc.acc || 0), ts:now() });
}
function broadcastLoc(force){
  const gap = RT.geoMode === 'low' ? 15000 : 4000;
  if(!force && now() - RT.lastLocSent < gap) return;
  /* لا نرسل إذا ما تحركت أكثر من 4 أمتار (إلا كل دقيقة للتأكيد) */
  if(!force && RT.lastLocPos && RT.myLoc && distance(RT.lastLocPos, RT.myLoc) < 4 && now() - RT.lastLocSent < 60000) return;
  RT.lastLocSent = now(); RT.lastLocPos = RT.myLoc ? { lat:RT.myLoc.lat, lng:RT.myLoc.lng } : null;
  friendsOnline().forEach(pin => { if(!isDemo(pin)) sendLoc(pin); });
}
async function enableCompass(){
  try{
    if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
      const r = await DeviceOrientationEvent.requestPermission(); if(r !== 'granted'){ toast('لم يتم السماح بالبوصلة'); return; }
    }
  }catch(e){ toast('تعذّر تفعيل البوصلة'); return; }
  if(RT.compassOn) return;
  RT.compassOn = true;
  const on = e => {
    let h = null;
    if(typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if(e.absolute && e.alpha != null) h = (360 - e.alpha) % 360;
    if(h == null) return;
    const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0; h = (h + so + 360) % 360;
    if(RT.heading == null) RT.heading = h; else RT.heading = (RT.heading + norm180(h - RT.heading) * .25 + 360) % 360;
    if(document.visibilityState !== 'visible' || RT.tab !== 'radar') return;
    /* نعيد الرسم فقط إذا تغيّر الاتجاه بشكل ملحوظ */
    if(RT.mode === 'radar'){ if(RT.hDraw == null || Math.abs(norm180(RT.heading - RT.hDraw)) >= (S.settings.eco ? 2 : .8)) radarHeading(); return; }
    const step = S.settings.eco ? 3 : 1;
    if(RT.drawnHeading != null && Math.abs(norm180(RT.heading - RT.drawnHeading)) < step) return;
    RT.drawnHeading = RT.heading; renderStageT();
  };
  window.addEventListener('deviceorientationabsolute', on, true);
  window.addEventListener('deviceorientation', on, true);
  setTimeout(() => { if(RT.heading == null) toast('البوصلة غير متاحة على هذا الجهاز'); }, 2500);
  renderToolbar();
}

/* ════════ الوضع التجريبي ════════ */
const DEMOS = [
  { pin:'VM-DEMO-ECHO', name:'صدى — اختبار الصوت', color:'#2DD4E8', d:140, b:40 },
  { pin:'VM-DEMO-SARA', name:'سارة (تجريبي)', color:'#D24BF2', d:620, b:250 },
];
function applyDemo(){
  DEMOS.forEach(x => {
    if(S.settings.demo){
      if(!S.friends[x.pin]) S.friends[x.pin] = { pin:x.pin, name:x.name, color:x.color, status:'friend', demo:true, added:now(), rep:{ t:4.7, e:4.9, h:4.6, n:12 } };
      if(!MSG[x.pin]) MSG[x.pin] = [{ id:uid(), from:'them', type:'text', text: isEcho(x.pin) ? 'أهلاً! أنا صدى. اضغط زر التحدث وقل أي شيء، وسأعيد صوتك إليك لتتأكد أن الميكروفون يعمل.' : 'مرحبا 👋 هذه محادثة تجريبية. جرّب إرسال رسالة أو صورة.', ts:now(), ttl:'keep', st:'recv', readAt:null }];
    } else { delete S.friends[x.pin]; delete MSG[x.pin]; delete STO.fr[x.pin]; }
  });
  if(S.settings.demo) storyDemoSeed();
  save(); saveMsgs(); saveSto();
}
function demoTick(){
  if(!S.settings.demo) return;
  const c = RT.myLoc || FALLBACK, t = now() / 1000;
  DEMOS.forEach((x, i) => { const f = S.friends[x.pin]; if(!f) return;
    const b = x.b + (i ? Math.sin(t / 40) * 25 : 0), d = x.d + (i ? Math.sin(t / 23) * 90 : 0);
    f.loc = { ...dest(c, d, b), acc:8, ts:now() }; f.seen = now(); });
}
function demoReceive(pin, m){
  const f = S.friends[pin]; if(!f) return;
  if(m.k === 'voice'){
    setTimeout(() => { const x = (MSG[pin] || []).find(y => y.id === m.id); if(x){ x.st = 'read'; x.readAt = now(); saveMsgs(); renderChatIfOpen(pin); } }, 700);
    if(isEcho(pin)) setTimeout(() => handleInner(pin, { k:'voice', id:uid(), data:m.data, dur:m.dur, live:true, ts:now(), ttl:m.ttl }), 900);
    else setTimeout(() => handleInner(pin, { k:'chat', id:uid(), text:'وصلني صوتك 🎧 واضح تمام', ts:now(), ttl:m.ttl }), 1800);
    return;
  }
  if(m.k === 'chat' || m.k === 'photo'){
    setTimeout(() => { const x = (MSG[pin] || []).find(y => y.id === m.id); if(x){ x.st = 'delivered'; renderChatIfOpen(pin); } }, 300);
    setTimeout(() => { const x = (MSG[pin] || []).find(y => y.id === m.id); if(x){ x.st = 'read'; x.readAt = now(); saveMsgs(); renderChatIfOpen(pin); } }, 1100);
    const replies = isEcho(pin) ? [m.k === 'photo' ? 'وصلت الصورة مشفّرة ✓' : `وصلتني: «${m.text}»`] : ['تمام، أنا قريبة منك', 'وصلت رسالتك 👍', 'أشوفك على الرادار', 'نلتقي بعد عشر دقائق؟'];
    setTimeout(() => handleInner(pin, { k:'chat', id:uid(), text: replies[Math.floor(Math.random() * replies.length)], ts:now(), ttl:m.ttl }), 1800);
  }
  if(m.k === 'rate') setTimeout(() => toast(`${f.name} استلم تقييمك`), 400);
}

/* ════════ المحادثة ════════ */
/* v8.1: صح وحدة حمراء = أُرسلت · صحين برتقالي = وصلت · صحين أخضر = قُرئت */
function tickHtml(st){ return st === 'read' ? '<i class="tk r" title="قُرئت">✓✓</i>' : st === 'delivered' ? '<i class="tk d" title="وصلت">✓✓</i>' : st === 'sent' ? '<i class="tk s" title="أُرسلت">✓</i>' : '<i class="tk p" title="ينتظر">⏳</i>'; }
function sysMsg(pin, text){ (MSG[pin] || (MSG[pin] = [])).push({ id:uid(), from:'sys', type:'sys', text, ts:now(), ttl:'keep' }); saveMsgs(); }
async function deliver(conv, m){
  if(isRoom(conv)) return deliverRoom(conv.slice(2), m);
  const payload = m.type === 'photo' ? { k:'photo', id:m.id, data:m.data, ts:m.ts, ttl:m.ttl }
    : m.type === 'voice' ? { k:'voice', id:m.id, data:m.data, dur:m.dur, live:!!m.live, ts:m.ts, ttl:m.ttl }
    : { k:'chat', id:m.id, text:m.text, ts:m.ts, ttl:m.ttl };
  const ok = await sendEnc(conv, payload);
  if(ok){
    if(m.st === 'pending'){ m.st = 'sent'; saveMsgs(); renderChatIfOpen(conv); }
    /* v8.0: لو ما وصل تأكيد خلال 9 ثواني (جواله نايم) نرسلها عبر الخادم مع إشعار */
    setTimeout(() => { if(m.st === 'sent' && !m.relayed){ m.relayed = true; relaySend(conv, payload, pushKind(m)); } }, 9000);
    return;
  }
  if(m.relayed) return;
  if(await relaySend(conv, payload, pushKind(m))){ m.relayed = true; if(m.st === 'pending'){ m.st = 'sent'; saveMsgs(); renderChatIfOpen(conv); } }
}
function sendMsg(conv, o){
  const ci = convInfo(conv); if(!ci) return;
  const m = { id:uid(), from:'me', type:o.type, text:o.text || '', data:o.data || null, dur:o.dur || 0, live:!!o.live, ts:now(), ttl:ci.ttl, st:'pending' };
  if(isRoom(conv)) m.dl = [];
  (MSG[conv] || (MSG[conv] = [])).push(m); saveMsgs(); renderChatIfOpen(conv); deliver(conv, m); if(!o.live) stat('msgs');
}
function sendChat(conv, text){ text = String(text || '').trim(); if(text) sendMsg(conv, { type:'text', text }); }
async function sendPhoto(conv, file){
  try{ sendMsg(conv, { type:'photo', data: await compressImage(file, 1080, .7) }); }catch(e){ toast('تعذّر تجهيز الصورة'); }
}
function compressImage(file, max, q){
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', q)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src = url;
  });
}
function markRead(pin){
  let changed = false;
  (MSG[pin] || []).forEach(m => { if(m.from === 'them' && !m.readAt){ m.readAt = now(); changed = true; if(!isRoom(pin)) sendAny(pin, { k:'read', id:m.id }); } });
  if(changed) saveMsgs();
}
function unread(pin){ return (MSG[pin] || []).filter(m => m.from === 'them' && !m.readAt).length; }
function sweep(){
  const t = now(); let changed = false;
  for(const pin in MSG){ const before = MSG[pin].length;
    MSG[pin] = MSG[pin].filter(m => !((m.ttl === '24h' && t - m.ts > 864e5) || (m.ttl === 'read' && m.readAt && t - m.readAt > 10000)));
    if(MSG[pin].length !== before) changed = true; }
  let sc = false; const n0 = STO.mine.length; STO.mine = STO.mine.filter(x => x.exp > t); if(STO.mine.length !== n0) sc = true;
  for(const p in STO.fr){ const n = STO.fr[p].length; STO.fr[p] = STO.fr[p].filter(x => x.exp > t); if(STO.fr[p].length !== n) sc = true; }
  if(sc){ saveSto(); renderStories(); renderStage(); }
  if(changed){ saveMsgs(); renderAll(); }
  else if(RT.chatWith && (MSG[RT.chatWith] || []).some(m => m.ttl === 'read' && m.readAt)) renderChat();
}
const TTL_LABEL = { read:'يختفي بعد القراءة', '24h':'يختفي بعد 24 ساعة', keep:'دائم' };

/* ════════ v7.2: الحالات (مثل سناب) ════════
   حالة نصية أو صورة تبقى 24 ساعة، تُرسل مشفّرة لأصدقائك فقط، وتظهر على الرادار حول صاحبها وفي المكان اللي نُشرت منه.
   تقدر تخفي حالاتك عن الجميع من الإعدادات، أو عن صديق معيّن من صفحته. */
const STORY_TTL = 864e5, STORY_MAX = 15;
const SBG = ['linear-gradient(135deg,#7C5CFF,#D24BF2)','linear-gradient(135deg,#2DD4E8,#7C5CFF)','linear-gradient(135deg,#12B886,#2DD4E8)',
  'linear-gradient(135deg,#F2994A,#E5334A)','linear-gradient(135deg,#1B1B3A,#4B3B8F)','linear-gradient(135deg,#E5334A,#D24BF2)'];
let STO = { mine:[], fr:{}, sent:{} };
let stoSaveT; function saveSto(){ clearTimeout(stoSaveT); stoSaveT = setTimeout(() => idb.set('stories', STO), 400); }
const storyVisibleTo = pin => !!(S.settings.storiesOn && S.friends[pin] && !S.friends[pin].hideStories);
function activeMine(){ const t = now(); return STO.mine.filter(s => s.exp > t); }
function friendStories(pin){ const t = now(); return (STO.fr[pin] || []).filter(s => s.exp > t); }
function hasUnseen(pin){ return friendStories(pin).some(s => !s.seen); }
function storyShort(s){ return s.t === 'photo' ? (s.text ? '📷 ' + s.text : '📷 صورة') : s.text; }
function storyPayload(s){ const o = { k:'story', id:s.id, t:s.t, text:s.text, bg:s.bg, ts:s.ts, exp:s.exp }; if(s.t === 'photo') o.data = s.data; if(s.loc){ o.lat = s.loc.lat; o.lng = s.loc.lng; } return o; }
/* مزامنة حالاتي مع صديق: قائمة المعرّفات الظاهرة له أولاً (فيحذف ما لم يعد ظاهراً)، ثم الجديد فقط */
async function syncStories(pin){
  if(isDemo(pin)) return;
  const f = S.friends[pin]; if(!f || f.status !== 'friend' || f.keyAlert) return;
  const list = storyVisibleTo(pin) ? activeMine() : [];
  const ok = await sendEnc(pin, { k:'story-sync', ids:list.map(s => s.id) }); if(!ok) return;
  const sent = (STO.sent[pin] || []).filter(id => list.some(s => s.id === id));
  for(const s of list){ if(sent.includes(s.id)) continue; if(await sendEnc(pin, storyPayload(s))) sent.push(s.id); }
  STO.sent[pin] = sent; saveSto();
}
function syncAllStories(){ friendsOnline().forEach(pin => syncStories(pin)); }
function recvStory(pin, m){
  const id = V.id(m.id); if(!id) return;
  const t = m.t === 'photo' ? 'photo' : 'text';
  const data = t === 'photo' ? V.photo(m.data) : null; if(t === 'photo' && !data) return;
  const text = V.str(m.text, 150); if(t === 'text' && !text.trim()) return;
  const ts = V.num(m.ts, 1e12, 1e13) || now();
  const exp = Math.min(V.num(m.exp, 1e12, 1e13) || ts + STORY_TTL, ts + STORY_TTL + 6e4, now() + STORY_TTL + 6e4); if(exp <= now()) return;
  const loc = m.lat != null ? V.loc(m) : null;
  const arr = STO.fr[pin] || (STO.fr[pin] = []); if(arr.some(x => x.id === id)) return;
  arr.push({ id, t, text, data, bg:Math.round(V.num(m.bg, 0, SBG.length - 1) || 0), ts, exp, loc, seen:null });
  while(arr.length > STORY_MAX) arr.shift();
  saveSto(); tone(BEEP.rx, .1); toast(`${S.friends[pin].name} أضاف حالة جديدة`); renderStories(); renderStage();
}
function postStory(o){
  const loc = o.withLoc && RT.myLoc && !S.settings.ghost ? { lat:+RT.myLoc.lat.toFixed(5), lng:+RT.myLoc.lng.toFixed(5), acc:0 } : null;
  const s = { id:uid(), t:o.t, text:o.text || '', bg:o.bg || 0, data:o.data || null, ts:now(), exp:now() + STORY_TTL, loc, views:{} };
  STO.mine.push(s); while(STO.mine.length > STORY_MAX) STO.mine.shift(); saveSto(); stat('stories');
  syncAllStories();
  if(S.settings.demo && S.friends['VM-DEMO-SARA']) setTimeout(() => { const x = STO.mine.find(y => y.id === s.id); if(x){ x.views['VM-DEMO-SARA'] = now(); saveSto(); if(SV && SV.mine) renderStoryView(); } }, 2500);
  renderStories(); renderStage();
  toast(S.settings.storiesOn ? 'نُشرت حالتك لأصدقائك لمدة 24 ساعة' : 'حُفظت حالتك، لكن حالاتك مخفية من الإعدادات');
}
function deleteStory(id){ STO.mine = STO.mine.filter(s => s.id !== id); saveSto(); syncAllStories(); renderStories(); renderStage(); toast('حُذفت الحالة'); }

/* شريط الحالات أعلى الرادار والمحادثات */
function storyBarHtml(){
  const mine = activeMine();
  const fr = Object.values(S.friends).filter(f => f.status === 'friend' && !f.muteStories && friendStories(f.pin).length)
    .sort((a, b) => hasUnseen(b.pin) - hasUnseen(a.pin) || friendStories(b.pin).slice(-1)[0].ts - friendStories(a.pin).slice(-1)[0].ts);
  let h = `<button class="sto ${mine.length ? 'mine' : ''}" data-act="${mine.length ? 'story-open' : 'cam-open'}" data-pin="me"><span class="ring"><span class="av" style="${avCss(S.me)}">${esc(initial(S.me.name))}</span>${mine.length ? '' : '<i class="plus">+</i>'}</span><span>${mine.length ? 'حالتي' : 'أضف حالة'}</span></button>`;
  fr.forEach(f => { h += `<button class="sto ${hasUnseen(f.pin) ? 'new' : ''}" data-act="story-open" data-pin="${f.pin}"><span class="ring"><span class="av" style="${avCss(f)}">${esc(initial(f.name))}</span></span><span>${esc(f.name.split(' ')[0])}</span></button>`; });
  return h;
}
function renderStories(){ if(RT.tab === 'stories') renderStoriesTab(); renderTabs(); const h = storyBarHtml(); ['#storyBar', '#storyBarC'].forEach(q => { const b = $(q); if(b && b._h !== h){ b.innerHTML = h; b._h = h; } }); }

/* إنشاء حالة */
let SC = null;
function scKeep(){ const t = $('#scText'); if(SC && t) SC.text = t.value; }
function openStoryComposer(){ if(SV) closeStories(); SC = { bg:Math.floor(Math.random() * SBG.length), data:null, text:'', withLoc:!S.settings.ghost }; renderComposer(); }
function renderComposer(){
  openSheet(`<div class="grab"></div><div class="h1">حالة جديدة</div>
  <div class="scbox" style="background:${SC.data ? '#000' : SBG[SC.bg]}">${SC.data ? `<img src="${esc(SC.data)}" alt="">` : ''}<textarea id="scText" maxlength="150" placeholder="${SC.data ? 'أضف تعليقاً (اختياري)' : 'وش تسوي الحين؟ ☕'}">${esc(SC.text)}</textarea></div>
  ${SC.data ? '' : `<div class="swatches">${SBG.map((g, i) => `<button style="background:${g}" class="${SC.bg === i ? 'on' : ''}" data-act="sc-bg" data-i="${i}" aria-label="خلفية ${i + 1}"></button>`).join('')}</div>`}
  <div class="btns"><button class="btn" data-act="sc-photo">${I.cam}${SC.data ? 'تغيير الصورة' : 'صورة'}</button>${SC.data ? '<button class="btn" data-act="sc-nophoto">نص فقط</button>' : ''}</div>
  <div class="set" style="padding:0;border:0"><span class="grow"><span class="t1" style="display:block">أرفق مكاني</span><span class="t2" style="display:block">تظهر حالتك على رادار أصدقائك في المكان اللي نشرتها منه</span></span>${S.settings.ghost ? '<span class="t2">وضع التخفي</span>' : `<button class="switch" role="switch" aria-checked="${SC.withLoc}" data-act="sc-loc" aria-label="أرفق مكاني"></button>`}</div>
  ${S.settings.storiesOn ? '' : '<p class="note">حالاتك مخفية حالياً من الإعدادات، فلن يراها أحد حتى تظهرها.</p>'}
  <button class="btn grad block" data-act="sc-post">نشر لمدة 24 ساعة</button>`);
}

/* عارض الحالات */
let SV = null;
function openStories(pin, startId){
  const mine = pin === 'me';
  const list = mine ? activeMine() : friendStories(pin);
  if(!list.length){ if(mine) openStoryComposer(); return; }
  let i = startId ? list.findIndex(s => s.id === startId) : mine ? 0 : list.findIndex(s => !s.seen);
  if(i < 0) i = 0;
  closeSheet(); if(RT.talking) pttUp();
  SV = { pin, mine, list, i, el:0, last:0, paused:false, showViews:false };
  $('#storyView').hidden = false; renderStoryView(); svLoop();
}
function svLoop(){
  cancelAnimationFrame(SV.raf);
  const tick = () => { if(!SV) return;
    const t = performance.now(); if(!SV.paused && SV.last) SV.el += t - SV.last; SV.last = t;
    const s = SV.list[SV.i], dur = s && s.t === 'photo' ? 6000 : 5000;
    const b = document.querySelector('#storyView .bars i.cur b'); if(b) b.style.width = Math.min(100, SV.el / dur * 100) + '%';
    if(SV.el >= dur){ svNext(); if(!SV) return; }
    SV.raf = requestAnimationFrame(tick); };
  SV.raf = requestAnimationFrame(tick);
}
function svNext(){ if(SV.i < SV.list.length - 1){ SV.i++; SV.el = 0; SV.showViews = false; renderStoryView(); } else closeStories(); }
function svPrev(){ if(SV.i > 0) SV.i--; SV.el = 0; SV.showViews = false; renderStoryView(); }
function closeStories(){ if(!SV) return; cancelAnimationFrame(SV.raf); SV = null; const el = $('#storyView'); el.hidden = true; el.innerHTML = ''; renderStories(); renderStage(); }
function renderStoryView(){
  if(!SV) return; const s = SV.list[SV.i]; if(!s){ closeStories(); return; }
  const who = SV.mine ? S.me : S.friends[SV.pin]; if(!who){ closeStories(); return; }
  if(!SV.mine && !s.seen){ s.seen = now(); saveSto(); sendEnc(SV.pin, { k:'story-seen', id:s.id }); }
  const c = RT.myLoc || (S.settings.demo ? FALLBACK : null);
  const where = s.loc && c ? ` · 📍 على بعد ${fmtDist(distance(c, s.loc))}` : '';
  const views = SV.mine ? Object.entries(s.views || {}) : [];
  const el = $('#storyView');
  el.innerHTML = `<div class="bars">${SV.list.map((x, k) => `<i class="${k === SV.i ? 'cur' : ''}"><b style="width:${k < SV.i ? 100 : 0}%"></b></i>`).join('')}</div>
  <div class="head"><span class="av" style="${avCss(who)}">${esc(initial(who.name))}</span><span class="grow"><b>${SV.mine ? 'حالتي' : esc(who.name)}</b><small>${fmtAgo(s.ts)}${where}</small></span><button class="iconbtn" data-act="sv-close" aria-label="إغلاق">✕</button></div>
  <div class="body" id="svBody" style="background:${s.t === 'photo' ? '#111' : SBG[s.bg] || SBG[0]}">${s.t === 'photo' ? `<img src="${esc(s.data)}" alt="صورة الحالة">` : ''}${s.text ? `<div class="${s.t === 'photo' ? 'cap' : 'txt'}">${esc(s.text)}</div>` : ''}</div>
  ${SV.showViews ? `<div class="viewers"><div class="t1" style="margin-bottom:6px">شاهدها ${views.length}${s.shots && Object.keys(s.shots).length ? ` · 📸 ${Object.keys(s.shots).length}` : ''}</div>${views.length ? views.map(([p, t]) => `<div class="t2">${esc((S.friends[p] || {}).name || p)}${s.reacts && s.reacts[p] ? ' ' + s.reacts[p] : ''}${s.shots && s.shots[p] ? ' · <b style="color:#FFB547">📸 صوّر الشاشة</b>' : ''} · ${fmtAgo(t)}</div>`).join('') : '<div class="t2">لم يشاهدها أحد بعد</div>'}</div>` : ''}
  ${!SV.mine ? `<div class="sv-reacts">${REACTS.map(e => `<button class="${(SV.reacted || {})[s.id] === e ? 'on' : ''}" data-act="sv-react" data-e="${e}" aria-label="تفاعل ${e}">${e}</button>`).join('')}</div>` : ''}
  <div class="foot">${SV.mine
    ? `<button class="btn sm" data-act="sv-views">👁 ${views.length}${s.reacts && Object.keys(s.reacts).length ? ' · ' + [...new Set(Object.values(s.reacts))].slice(0, 3).join('') + ' ' + Object.keys(s.reacts).length : ''}</button><button class="btn sm danger" data-act="sv-del" data-id="${s.id}">حذف</button><span class="grow"></span><button class="btn sm pri" data-act="story-new">+ حالة</button>`
    : `<form id="svReply" class="field grow" autocomplete="off"><input class="input grow" id="svInput" placeholder="ردّ على ${esc(who.name.split(' ')[0])}…" maxlength="300" enterkeyhint="send"><button class="btn pri" type="submit" aria-label="إرسال">${I.send}</button></form>`}</div>`;
  const body = $('#svBody'); let downAt = 0;
  body.onpointerdown = e => { downAt = performance.now(); SV.paused = true; };
  body.onpointerup = e => { if(!SV) return; SV.paused = false; if(performance.now() - downAt < 300){ const r = body.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; if(x < .35) svNext(); else if(x > .65) svPrev(); } };
  body.onpointercancel = () => { if(SV) SV.paused = false; };
  const f = $('#svReply');
  if(f){ const inp = $('#svInput'); inp.onfocus = () => { SV.paused = true; }; inp.onblur = () => { if(SV) SV.paused = false; };
    f.onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); if(!v) return;
      sendChat(SV.pin, `↩️ ردّ على حالتك «${storyShort(s).slice(0, 40)}»\n${v}`); inp.value = ''; inp.blur(); toast('أُرسل ردّك في المحادثة'); }; }
}
function storyDemoSeed(){
  const p = 'VM-DEMO-SARA'; if(!S.friends[p] || (STO.fr[p] || []).length) return;
  const c = RT.myLoc || FALLBACK, t = now();
  STO.fr[p] = [
    { id:uid(), t:'text', text:'☕ أشرب قهوة على الكورنيش', bg:1, ts:t - 36e5, exp:t - 36e5 + STORY_TTL, loc:{ ...dest(c, 950, 300), acc:0 }, seen:null },
    { id:uid(), t:'text', text:'🌅 الجو اليوم يجنن', bg:3, ts:t - 6e5, exp:t - 6e5 + STORY_TTL, loc:null, seen:null } ];
  saveSto();
}

/* ════════ v7.4: الغرف + الرسائل الصوتية + تخصيص المحادثات ════════ */
const EMOJIS = ['👨‍👩‍👧','🏕️','🕋','⚽','🚗','🎮','💼','🏖️','🎉','☕','🛒','🏍️'];
const WALLS = ['none',
  'linear-gradient(180deg,rgba(124,92,255,.16),rgba(210,75,242,.10))',
  'linear-gradient(180deg,rgba(45,212,232,.18),rgba(124,92,255,.08))',
  'linear-gradient(180deg,rgba(18,184,134,.18),rgba(45,212,232,.08))',
  'linear-gradient(180deg,rgba(242,153,74,.20),rgba(229,51,74,.08))',
  'radial-gradient(circle at 15% 10%,rgba(124,92,255,.24),transparent 45%),radial-gradient(circle at 85% 90%,rgba(45,212,232,.22),transparent 45%)'];
const isRoom = c => typeof c === 'string' && c.startsWith('R:');
const roomOf = c => isRoom(c) ? S.rooms[c.slice(2)] || null : null;
function memberName(r, p){ if(p === S.me.pin) return S.me.name; return (S.friends[p] && S.friends[p].name) || (r && r.names && r.names[p]) || p; }
function senderColor(p){ return (S.friends[p] && S.friends[p].color) || COLORS[[...String(p)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]; }
function msgLabel(m){ return m.type === 'photo' ? '📷 صورة' : m.type === 'voice' ? `🎙 رسالة صوتية ${fmtDur(m.dur)}` : m.text; }
function fmtDur(s){ s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function convInfo(c){
  if(isRoom(c)){ const r = roomOf(c); if(!r) return null;
    const on = convTargets(c).length;
    return { room:true, r, name:r.name, color:r.color, emoji:r.emoji, sub:`${r.members.length} أعضاء · ${on} متصل`, ttl:r.ttl || S.settings.ttl, wall:r.wall || 0, mute:!!r.mute }; }
  const f = S.friends[c]; if(!f) return null;
  const on = isOnline(c);
  return { room:false, f, name:f.name, color:f.color, sub: on ? 'متصل الآن' : 'آخر ظهور ' + fmtAgo(f.seen), ttl:f.ttl || S.settings.ttl, wall:f.wall || 0, mute:!!f.mute, on };
}
function convTargets(c){
  if(isRoom(c)){ const r = roomOf(c); return r ? r.members.filter(p => p !== S.me.pin && S.friends[p] && S.friends[p].status === 'friend' && isOnline(p)) : []; }
  return S.friends[c] && isOnline(c) ? [c] : [];
}

/* ─── الرسائل الصوتية: اضغط مطولاً على الميكروفون داخل المحادثة ───
   أثناء الضغط: يُبث صوتك مباشرة لمن هو متصل (مثل اللاسلكي)، وفي نفس الوقت يُسجَّل.
   عند الإفلات: تُحفظ رسالة صوتية مشفّرة تقدر أنت وهو تعيدون سماعها، وتوصل لمن كان غير متصل لاحقاً. */
const VOICE_MAX = 60;
function pickMime(){ if(typeof MediaRecorder === 'undefined') return null;
  return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => { try{ return MediaRecorder.isTypeSupported(t); }catch(e){ return false; } }) || ''; }
function bindMic(btn){
  btn.addEventListener('pointerdown', e => { e.preventDefault(); try{ btn.setPointerCapture(e.pointerId); }catch(x){} chatRecStart(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, () => chatRecStop(true)));
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
async function chatRecStart(){
  if(RT.rec || !RT.chatWith) return;
  if(!feat('voice')){ featOff(); return; }
  if(floorBusy(RT.chatWith)) return;
  const conv = RT.chatWith, mime = pickMime();
  if(mime === null){ toast('الجهاز لا يدعم تسجيل الصوت'); return; }
  RT.rec = { conv, chunks:[], t0:now(), stopReq:false };
  unlockAudio();
  let track; try{ track = await getMicTrack(); }catch(e){ RT.rec = null; toast('اسمح باستخدام الميكروفون من الإعدادات ثم حاول مجدداً'); return; }
  const rec = RT.rec; if(!rec) { releaseMicSoon(); return; }
  try{ rec.mr = new MediaRecorder(new MediaStream([track]), mime ? { mimeType:mime, audioBitsPerSecond:32000 } : undefined); }
  catch(e){ RT.rec = null; toast('تعذّر بدء التسجيل'); return; }
  rec.mr.ondataavailable = e => { if(e.data && e.data.size) rec.chunks.push(e.data); };
  rec.mr.onstop = () => finishRec(rec);
  rec.mr.start(250); rec.t0 = now();
  /* البث المباشر لمن هو متصل الآن */
  const targets = convTargets(conv).filter(p => !isDemo(p));
  RT.talking = true; RT.talkTs = now(); RT._txTargets = targets; renderTalk(); tone(BEEP.start); vibrate(20); bgTalk(true);
  for(const p of targets){ sendEnc(p, { k:'talk', on:true, ts:RT.talkTs }); ensureCall(p); setTrack(p, track); }
  if(isEcho(conv)) startEcho(track);
  rec.live = targets.length > 0 || isEcho(conv);
  $('#composer') && $('#composer').classList.add('rec');
  const info = $('#recInfo'); if(info){ info.hidden = false; }
  rec.timer = setInterval(() => { const d = (now() - rec.t0) / 1000; const i = $('#recInfo'); if(i) i.textContent = `🔴 ${fmtDur(d)} · ${rec.live ? 'على الهواء + تسجيل' : 'يسجّل… اترك للإرسال'}`; if(d >= VOICE_MAX) chatRecStop(true); }, 200);
  if(rec.stopReq) chatRecStop(true);
}
function chatRecStop(send){
  const rec = RT.rec; if(!rec) return;
  if(!rec.mr){ rec.stopReq = true; return; }
  if(rec.done) return; rec.done = true; rec.send = send;
  clearInterval(rec.timer); rec.dur = (now() - rec.t0) / 1000;
  try{ rec.mr.stop(); }catch(e){ finishRec(rec); }
  if(RT.talking) pttUp();
  const c = $('#composer'); if(c) c.classList.remove('rec'); const i = $('#recInfo'); if(i){ i.hidden = true; i.textContent = ''; }
}
function finishRec(rec){
  if(RT.rec === rec) RT.rec = null;
  if(!rec.send) return;
  if(rec.dur < 0.8){ toast('اضغط مطولاً على الميكروفون وتكلم'); return; }
  const blob = new Blob(rec.chunks, { type:(rec.mr && rec.mr.mimeType) || 'audio/webm' }); if(!blob.size) return;
  if(blob.size > 1.4e6){ toast('الرسالة الصوتية طويلة جداً'); return; }
  const fr = new FileReader();
  fr.onload = () => { const data = V.audio(String(fr.result).replace(/^data:audio\/([a-z0-9-]+);codecs=([^;,]+);base64,/, 'data:audio/$1;codecs=$2;base64,'));
    if(!data){ toast('صيغة الصوت غير مدعومة'); return; }
    sendMsg(rec.conv, { type:'voice', data, dur:Math.min(VOICE_MAX, rec.dur), live:rec.live }); };
  fr.readAsDataURL(blob);
}
function voiceBubble(conv, m){
  const me = m.from === 'me', room = isRoom(conv), playing = RT.vMid === m.id;
  const st = me ? tickHtml(m.st) : '';
  const snd = room && !me ? `<div class="snd" style="color:${senderColor(m.sender)}">${esc(m.sname || '')}</div>` : '';
  const ok = !!V.audio(m.data);
  return `<div class="bub vnote ${me ? 'me' : ''}" data-mid="${esc(m.id)}">${snd}<div class="vrow">
    <button class="vplay" data-act="vplay" data-mid="${esc(m.id)}" aria-label="${playing ? 'إيقاف' : 'تشغيل'}" ${ok ? '' : 'disabled'}>${playing ? '❚❚' : '▶'}</button>
    <span class="vbar"><i></i></span><span class="num vdur">${fmtDur(m.dur)}</span></div>
    <div class="meta">${m.live ? '<span class="ttl">📡 بُث مباشرة</span>' : ''}<span>${fmtTime(m.ts)}</span><span>${st}</span></div></div>`;
}
function playVoice(conv, mid){
  const m = (MSG[conv] || []).find(x => x.id === mid); if(!m || !V.audio(m.data)) return;
  if(RT.vAud){ const same = RT.vMid === mid; RT.vAud.pause(); RT.vAud = null; RT.vMid = null; setVoiceUI(mid, false); if(same) return; }
  const a = new Audio(m.data); a.setAttribute('playsinline', ''); RT.vAud = a; RT.vMid = mid;
  const done = () => { if(RT.vMid === mid){ RT.vAud = null; RT.vMid = null; } setVoiceUI(mid, false, 0); };
  a.ontimeupdate = () => { const d = a.duration && isFinite(a.duration) ? a.duration : (m.dur || 1); setVoiceUI(mid, true, a.currentTime / d, a.currentTime); };
  a.onended = done; a.onerror = () => { done(); toast('تعذّر تشغيل الرسالة الصوتية على هذا الجهاز'); };
  setVoiceUI(mid, true, 0);
  a.play().catch(() => { done(); toast('اضغط مرة ثانية للتشغيل'); });
  if(m.from === 'them' && !m.readAt) markRead(conv);
}
function setVoiceUI(mid, playing, frac, t){
  document.querySelectorAll(`.vnote[data-mid="${CSS.escape(mid)}"]`).forEach(el => {
    const b = el.querySelector('.vplay'); if(b) b.textContent = playing ? '❚❚' : '▶';
    const i = el.querySelector('.vbar i'); if(i && frac != null) i.style.width = Math.min(100, frac * 100) + '%';
    const d = el.querySelector('.vdur'); if(d && t != null) d.textContent = fmtDur(t);
  });
}

/* ─── الغرف ─── */
let RE = null;
function openRoomEditor(rid){
  const r = rid ? S.rooms[rid] : null;
  if(r && r.owner !== S.me.pin){ toast('صاحب الغرفة فقط يعدّلها'); return; }
  RE = r ? { id:r.id, name:r.name, emoji:r.emoji, color:r.color, members:new Set(r.members.filter(p => p !== S.me.pin)) }
         : { id:null, name:'', emoji:EMOJIS[0], color:COLORS[0], members:new Set() };
  renderRoomEditor();
}
function reKeep(){ const n = $('#reName'); if(RE && n) RE.name = n.value; document.querySelectorAll('.reMem').forEach(c => { c.checked ? RE.members.add(c.value) : RE.members.delete(c.value); }); }
function renderRoomEditor(){
  const fr = Object.values(S.friends).filter(f => f.status === 'friend');
  openSheet(`<div class="grab"></div><div class="h1">${RE.id ? 'تعديل الغرفة' : 'غرفة جديدة'}</div>
  <div style="display:flex;gap:12px;align-items:center"><span class="av" style="width:56px;height:56px;border-radius:18px;background:${RE.color};font-size:28px;display:grid;place-items:center">${esc(RE.emoji)}</span>
    <input class="input grow" id="reName" maxlength="30" placeholder="اسم الغرفة (مثال: العائلة، رحلة البر)" value="${esc(RE.name)}"></div>
  <div class="t1">الرمز</div><div class="emojis">${EMOJIS.map(e => `<button class="${RE.emoji === e ? 'on' : ''}" data-act="re-emoji" data-e="${esc(e)}">${e}</button>`).join('')}</div>
  <div class="t1">اللون</div><div class="swatches">${COLORS.map(c => `<button style="background:${c}" class="${RE.color === c ? 'on' : ''}" data-act="re-color" data-color="${c}" aria-label="لون"></button>`).join('')}</div>
  <div class="t1">الأعضاء (<span id="reCount">${RE.members.size}</span>)</div>
  ${fr.length ? `<div class="card list">${fr.map(f => `<label class="set" style="cursor:pointer"><span class="av" style="${avCss(f)};width:34px;height:34px">${esc(initial(f.name))}</span><span class="grow t1">${esc(f.name)}</span><input type="checkbox" class="reMem" value="${f.pin}" ${RE.members.has(f.pin) ? 'checked' : ''}></label>`).join('')}</div>` : '<p class="note">أضف أصدقاء أولاً ثم أنشئ غرفة.</p>'}
  <p class="t2" style="white-space:normal">كل رسالة تُشفّر لكل عضو على حدة. الأعضاء اللي مو أصدقاء لبعض توصلهم الرسائل عن طريقك وأنت متصل.</p>
  <button class="btn grad block" data-act="re-save">${RE.id ? 'حفظ' : 'إنشاء الغرفة'}</button>`);
  document.querySelectorAll('.reMem').forEach(c => { c.onchange = () => { reKeep(); const n = $('#reCount'); if(n) n.textContent = RE.members.size; }; });
}
function roomPacket(r){ return { k:'room', id:r.id, name:r.name, emoji:r.emoji, color:r.color, owner:r.owner, v:r.v,
  members:r.members.filter(p => !isDemo(p)).map(p => ({ pin:p, name:memberName(r, p) })) }; }
function pushRoom(r, pins){ (pins || r.members).forEach(p => { if(p !== S.me.pin && !isDemo(p) && S.friends[p] && S.friends[p].status === 'friend') sendEnc(p, roomPacket(r)); }); }
function saveRoomEditor(){
  reKeep(); const name = V.str(RE.name, 30).trim();
  if(!name){ toast('اكتب اسم الغرفة'); return; }
  if(!RE.members.size){ toast('اختر عضواً واحداً على الأقل'); return; }
  const members = [S.me.pin, ...RE.members];
  if(RE.id){ const r = S.rooms[RE.id]; const old = r.members;
    Object.assign(r, { name, emoji:RE.emoji, color:RE.color, members, v:(r.v || 1) + 1 }); save();
    pushRoom(r, [...new Set([...old, ...members])]); sysMsg('R:' + r.id, 'عُدّلت الغرفة'); closeSheet(); renderAll(); toast('حُفظت الغرفة'); return; }
  const r = { id:'r' + uid(), name, emoji:RE.emoji, color:RE.color, owner:S.me.pin, members, v:1, created:now(), names:{} };
  S.rooms[r.id] = r; save(); pushRoom(r);
  sysMsg('R:' + r.id, `أنشأت الغرفة. الأعضاء: ${members.map(p => memberName(r, p)).join('، ')}`);
  closeSheet(); setTab('chats'); openChat('R:' + r.id); toast(`أُنشئت غرفة «${name}»`);
  if(r.members.includes('VM-DEMO-SARA')) setTimeout(() => demoRoomSay(r.id, 'هلا والله 👋 نورت الغرفة'), 1500);
}
function recvRoom(pin, m){
  const rid = V.id(m.id); if(!rid || S.leftRooms[rid]) return;
  if(m.owner !== pin) return;
  const ex = S.rooms[rid]; if(ex && ex.owner !== pin) return;
  const list = Array.isArray(m.members) ? m.members.slice(0, 40).filter(x => x && typeof x.pin === 'string' && PIN_STRICT.test(x.pin)) : [];
  if(!list.some(x => x.pin === S.me.pin)){
    if(ex){ delete S.rooms[rid]; save(); if(RT.chatWith === 'R:' + rid) closeChat(); toast(`أُخرجت من غرفة «${ex.name}»`); renderAll(); }
    return; }
  const v = V.num(m.v, 1, 1e6) || 1; if(ex && v <= (ex.v || 0)) return;
  const names = {}; list.forEach(x => { if(x.pin !== S.me.pin) names[x.pin] = V.name(x.name); });
  const emoji = EMOJIS.includes(m.emoji) ? m.emoji : EMOJIS[0];
  S.rooms[rid] = { ...(ex || { created:now() }), id:rid, name:V.str(m.name, 30).trim() || 'غرفة', emoji, color:V.color(m.color), owner:pin, members:list.map(x => x.pin), names, v };
  save();
  if(!ex){ sysMsg('R:' + rid, `${S.friends[pin].name} أضافك إلى الغرفة`); toast(`${S.friends[pin].name} أضافك إلى غرفة «${S.rooms[rid].name}»`); tone(BEEP.msg); }
  renderAll();
}
async function deliverRoom(rid, m, onlyPin){
  const r = S.rooms[rid]; if(!r) return;
  const payload = { k:'rmsg', room:rid, id:m.id, from:S.me.pin, fname:S.me.name, type:m.type, text:m.text, data:m.data, dur:m.dur, live:!!m.live, ts:m.ts, ttl:m.ttl };
  m.dl = m.dl || [];
  for(const p of r.members){
    if(p === S.me.pin || m.dl.includes(p) || (onlyPin && p !== onlyPin)) continue;
    if(isDemo(p)){ m.dl.push(p); if(p === 'VM-DEMO-SARA' && !onlyPin) setTimeout(() => demoRoomSay(rid, m.type === 'voice' ? 'سمعتك 🎧 تمام' : ['أبشر', 'تمام 👍', 'وصلت', 'أنا في الطريق'][Math.floor(Math.random() * 4)]), 1600); continue; }
    if(S.friends[p] && S.friends[p].status === 'friend'){
      if(isOnline(p) && await sendEnc(p, payload)){ if(m.st === 'pending') m.st = 'sent'; }
      else if(!onlyPin && !(m.rl || []).includes(p) && await relaySend(p, payload, 'room', r.name)){ (m.rl = m.rl || []).push(p); if(m.st === 'pending') m.st = 'sent'; }
    }
  }
  if(m.st === 'pending' && m.dl.length) m.st = 'sent';
  saveMsgs(); renderChatIfOpen('R:' + rid);
}
function demoRoomSay(rid, text){ const r = S.rooms[rid]; if(!r || !r.members.includes('VM-DEMO-SARA')) return;
  recvRoomMsg('VM-DEMO-SARA', { room:rid, id:uid(), from:'VM-DEMO-SARA', fname:'سارة', type:'text', text, ts:now(), ttl:'keep' }); }
function recvRoomMsg(pin, m){
  const rid = V.id(m.room), r = rid && S.rooms[rid]; if(!r || !r.members.includes(pin)) return;
  const from = typeof m.from === 'string' && PIN_STRICT.test(m.from) ? m.from : null;
  if(!from || from === S.me.pin || !r.members.includes(from)) return;
  if(from !== pin && pin !== r.owner) return; /* التمرير مسموح لصاحب الغرفة فقط */
  const id = V.id(m.id); if(!id) return;
  const type = ['text', 'photo', 'voice'].includes(m.type) ? m.type : null; if(!type) return;
  const data = type === 'photo' ? V.photo(m.data) : type === 'voice' ? V.audio(m.data) : null; if(type !== 'text' && !data) return;
  const text = type === 'text' ? V.str(m.text, 4000) : ''; if(type === 'text' && !text.trim()) return;
  const conv = 'R:' + rid, arr = MSG[conv] || (MSG[conv] = []);
  if(!isDemo(pin)) sendAny(pin, { k:'rack', room:rid, id });
  if(arr.some(x => x.id === id)) return;
  const sname = (S.friends[from] && S.friends[from].name) || V.name(m.fname);
  if(!S.friends[from]){ r.names = r.names || {}; r.names[from] = sname; }
  const msg = { id, from:'them', sender:from, sname, type, text, data, dur:V.num(m.dur, 0, 120) || 0, live:m.live === true, ts:V.num(m.ts, 1e12, 1e13) || now(), ttl:V.ttl(m.ttl), st:'recv' };
  arr.push(msg); if(arr.length > 2000) arr.splice(0, arr.length - 2000); saveMsgs();
  /* صاحب الغرفة يمرّر الرسالة للأعضاء اللي مو أصدقاء للمرسل */
  if(r.owner === S.me.pin && !isDemo(from)){
    const fw = { k:'rmsg', room:rid, id, from, fname:sname, type, text, data, dur:msg.dur, live:msg.live, ts:msg.ts, ttl:msg.ttl };
    r.members.forEach(p => { if(p !== S.me.pin && p !== from && p !== pin && !isDemo(p) && S.friends[p] && S.friends[p].status === 'friend') sendAny(p, fw, 'room', r.name); }); }
  if(RT.chatWith === conv && document.visibilityState === 'visible') markRead(conv);
  else if(!r.mute){ const lbl = msgLabel(msg); tone(BEEP.msg); vibrate(40); notify(`${r.emoji} ${r.name}`, !S.settings.notifPreview ? 'رسالة جديدة' : `${sname}: ${lbl}`); if(RT.chatWith !== conv) toast(`${r.emoji} ${r.name} · ${sname}: ${lbl}`); }
  renderAll();
}
function roomsOnline(pin){
  Object.values(S.rooms).forEach(r => {
    if(!r.members.includes(pin)) return;
    if(r.owner === S.me.pin) pushRoom(r, [pin]);
    (MSG['R:' + r.id] || []).filter(m => m.from === 'me' && !(m.dl || []).includes(pin) && now() - m.ts < 864e5).forEach(m => deliverRoom(r.id, m, pin));
  });
  Object.entries(S.leftRooms).forEach(([rid, owner]) => { if(owner === pin) sendEnc(pin, { k:'room-leave', room:rid }); });
}
function leaveRoom(rid){
  const r = S.rooms[rid]; if(!r) return;
  if(r.owner === S.me.pin){ r.members.forEach(p => { if(p !== S.me.pin && !isDemo(p)) sendEnc(p, { k:'room-del', room:rid }); }); }
  else { S.leftRooms[rid] = r.owner; sendEnc(r.owner, { k:'room-leave', room:rid }); r.members.forEach(p => { if(p !== S.me.pin && p !== r.owner && !isDemo(p)) sendEnc(p, { k:'room-leave', room:rid }); }); }
  delete S.rooms[rid]; delete MSG['R:' + rid]; if(RT.target === 'R:' + rid) RT.target = null;
  save(); saveMsgs(); closeSheet(); closeChat(); renderAll(); toast(r.owner === S.me.pin ? `حُذفت غرفة «${r.name}»` : `غادرت غرفة «${r.name}»`);
}

/* v7.8: اختيار لمن تتحدث (الكل / صديق / غرفة) في أي وقت */
function openTargetPicker(){
  const fr = Object.values(S.friends).filter(f => f.status === 'friend' && (!f.demo || !Object.values(S.friends).some(x => x.status === 'friend' && !x.demo))).sort((a, b) => isOnline(b.pin) - isOnline(a.pin) || a.name.localeCompare(b.name, 'ar'));
  const rooms = Object.values(S.rooms), cur = RT.target || '';
  const row = (t, av, name, sub, on) => `<button class="row" data-act="target-set" data-t="${esc(t)}" style="${cur === t ? 'background:color-mix(in srgb,var(--accent) 12%,transparent)' : ''}">${av}<span class="grow"><span class="t1" style="display:block">${name}</span><span class="t2" style="display:block">${sub}</span></span>${cur === t ? '<b style="color:var(--accent)">✓</b>' : ''}</button>`;
  let h = `<div class="grab"></div><div class="h1">لمن تتحدث؟</div><div class="card list">
    ${row('', `<span class="av" style="background:linear-gradient(135deg,#2DD4E8,#7C5CFF)">${I.users}</span>`, 'كل الأصدقاء المتصلين', `${pttTargetsAll().length} متصل الآن`, true)}</div>`;
  if(rooms.length) h += `<div class="h2">الغرف</div><div class="card list">${rooms.map(r => row('R:' + r.id, `<span class="av" style="background:${r.color};font-size:20px">${esc(r.emoji)}</span>`, esc(r.name), `${convTargets('R:' + r.id).length} متصل من ${r.members.length - 1}`)).join('')}</div>`;
  if(fr.length) h += `<div class="h2">صديق واحد</div><div class="card list">${fr.map(f => row(f.pin, `<span class="av" style="${avCss(f)}">${esc(initial(f.name))}<i class="st ${isOnline(f.pin) ? 'on' : ''}"></i></span>`, esc(f.name), isOnline(f.pin) ? 'متصل' : 'غير متصل الآن')).join('')}</div>`;
  openSheet(h);
}
function pttTargetsAll(){ const t = RT.target; RT.target = null; const r = pttTargets(); RT.target = t; return r; }

/* ─── تخصيص المحادثة (فردية أو غرفة) ─── */
function openConvSettings(c){
  const ci = convInfo(c); if(!ci) return; const r = ci.r, f = ci.f;
  const members = r ? r.members.map(p => `<div class="set" style="padding:10px 0"><span class="av" style="${S.friends[p] ? avCss(S.friends[p]) : p === S.me.pin ? avCss(S.me) : 'background:' + senderColor(p)};width:32px;height:32px">${esc(initial(memberName(r, p)))}<i class="st ${p !== S.me.pin && isOnline(p) ? 'on' : ''}"></i></span><span class="grow t1">${esc(memberName(r, p))}${p === r.owner ? ' <span class="pill">صاحب الغرفة</span>' : ''}${p === S.me.pin ? ' <span class="pill">أنت</span>' : ''}</span>${p !== S.me.pin && !S.friends[p] && !S.blocked[p] ? `<button class="btn sm pri" data-act="room-addfriend" data-pin="${esc(p)}" data-room="${esc(r.id)}">إضافة صديق</button>` : p !== S.me.pin && S.friends[p] && S.friends[p].status === 'out' ? '<span class="t2">أُرسل الطلب</span>' : ''}</div>`).join('') : '';
  openSheet(`<div class="grab"></div>
  <div class="shead"><span class="av" style="${r ? 'background:' + ci.color : avCss(ci.f)};width:56px;height:56px;font-size:${r ? 26 : 22}px">${r ? esc(r.emoji) : esc(initial(ci.name))}</span><div class="grow"><div class="t1" style="font-size:18px">${esc(ci.name)}</div><div class="t2">${esc(ci.sub)}</div></div></div>
  ${r ? `<div class="btns"><button class="btn grad" data-act="room-talk" data-pin="${esc(c)}">${I.mic}التحدث في الغرفة</button>${r.owner === S.me.pin ? `<button class="btn" data-act="room-edit" data-pin="${esc(r.id)}">تعديل الغرفة</button>` : ''}</div>` : `<div class="btns"><button class="btn grad" data-act="solo" data-pin="${esc(c)}">${I.mic}التحدث معه فقط</button><button class="btn" data-act="friend" data-pin="${esc(c)}">صفحته</button></div>`}
  <div class="t1">خلفية المحادثة</div><div class="walls">${WALLS.map((w, i) => `<button class="${ci.wall === i ? 'on' : ''}" style="background:${w === 'none' ? 'var(--surface)' : w}" data-act="cv-wall" data-i="${i}" aria-label="خلفية ${i + 1}">${i ? '' : '∅'}</button>`).join('')}</div>
  <div class="card list">
    <div class="set"><span class="grow"><span class="t1" style="display:block">كتم الإشعارات</span><span class="t2" style="display:block">تصلك الرسائل بدون صوت أو إشعار</span></span><button class="switch" role="switch" aria-checked="${ci.mute}" data-act="cv-mute" data-pin="${esc(c)}" aria-label="كتم"></button></div>
    <div class="set"><span class="grow t1">مدة الرسائل</span><div class="segs">${['read','24h','keep'].map(k => `<button class="${ci.ttl === k ? 'on' : ''}" data-act="cv-ttl" data-ttl="${k}">${k === 'read' ? 'بعد القراءة' : k === '24h' ? '24 ساعة' : 'دائم'}</button>`).join('')}</div></div>
  </div>
  ${r ? `<div class="t1">الأعضاء (${r.members.length})</div><div class="card" style="padding:0 14px">${members}</div>
    <div id="rlBox"><button class="btn danger block" data-act="room-leave-ask" data-pin="${esc(r.id)}">${r.owner === S.me.pin ? 'حذف الغرفة للجميع' : 'مغادرة الغرفة'}</button></div>`
     : `<button class="btn" data-act="safety" data-pin="${esc(c)}">${I.lock}رمز الأمان للتحقق من التشفير</button>`}`, null);
  RT.cvConv = c;
}

/* ─── تواصل معنا: اقتراح / شكوى / فكرة / مشكلة → بريد الدعم ─── */
const FB_TYPES = { idea:'اقتراح', complaint:'شكوى', feature:'فكرة إضافة للتطبيق', bug:'مشكلة تقنية' };
let FB = null;
function openFeedback(){ FB = FB || { type:'idea', text:'', contact:'', diag:true }; renderFeedback(); }
function fbKeep(){ const t = $('#fbText'), c = $('#fbContact'), d = $('#fbDiag'); if(!FB) return; if(t) FB.text = t.value; if(c) FB.contact = c.value; if(d) FB.diag = d.checked; }
function renderFeedback(){
  openSheet(`<div class="grab"></div><div class="h1">تواصل معنا</div>
  <p class="t2" style="white-space:normal">رسالتك توصل مباشرة لبريد فريق VibeMap، ونقرأ كل رسالة.</p>
  <div class="segs">${Object.entries(FB_TYPES).map(([k, n]) => `<button class="${FB.type === k ? 'on' : ''}" data-act="fb-type" data-k="${k}">${n}</button>`).join('')}</div>
  <textarea class="input" id="fbText" dir="rtl" rows="6" maxlength="2000" placeholder="${FB.type === 'complaint' ? 'وش صار معك؟ نعتذر ونبغى نصلحه' : FB.type === 'bug' ? 'وش المشكلة؟ ومتى تصير؟' : FB.type === 'feature' ? 'وش الإضافة اللي تتمناها في التطبيق؟' : 'اكتب اقتراحك'}" style="resize:vertical;min-height:130px">${esc(FB.text)}</textarea>
  <input class="input" id="fbContact" maxlength="80" placeholder="بريدك أو جوالك للرد (اختياري)" value="${esc(FB.contact)}" dir="auto">
  <label class="set" style="padding:0;border:0;cursor:pointer"><span class="grow"><span class="t1" style="display:block">أرفق معلومات الجهاز</span><span class="t2" style="display:block">رقم الإصدار ونوع الجوال وحالة الاتصال — تساعدنا نحل المشاكل. بدون رسائلك أو موقعك.</span></span><input type="checkbox" id="fbDiag" ${FB.diag ? 'checked' : ''}></label>
  <button class="btn grad block" data-act="fb-send" id="fbSend">إرسال</button>`);
}
async function sendFeedback(){
  fbKeep(); const text = V.str(FB.text, 2000).trim();
  if(text.length < 5){ toast('اكتب رسالتك أولاً'); return; }
  if(RT.fbLast && now() - RT.fbLast < 60000){ toast('انتظر دقيقة قبل إرسال رسالة ثانية'); return; }
  const type = FB_TYPES[FB.type] || FB_TYPES.idea, contact = V.str(FB.contact, 80).trim();
  const diag = FB.diag ? `VibeMap v${VERSION} · ${PLATFORM} · ${navigator.userAgent.slice(0, 160)} · اتصال: ${RT.net} · أصدقاء: ${Object.values(S.friends).filter(f => f.status === 'friend' && !f.demo).length}` : '';
  if(!SUPPORT_EMAIL){ toast('تعذّر الإرسال الآن'); return; }
  const btn = $('#fbSend'); if(btn){ btn.disabled = true; btn.textContent = 'يرسل…'; }
  let ok = false;
  try{
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(SUPPORT_EMAIL)}`, { method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' },
      body: JSON.stringify({ _subject:`VibeMap — ${type}`, _template:'table', _captcha:'false', 'النوع':type, 'الرسالة':text, 'للتواصل':contact || '—', 'الاسم في التطبيق':S.me.name, 'معلومات الجهاز':diag || '—' }) });
    const j = await r.json().catch(() => ({})); ok = r.ok && (j.success === true || j.success === 'true');
  }catch(e){ ok = false; }
  if(ok){ RT.fbLast = now(); FB = null; closeSheet(); toast('وصلتنا رسالتك، شكراً لك 🌟'); return; }
  if(btn){ btn.disabled = false; btn.textContent = 'إرسال'; }
  openSheet($('#sheet').innerHTML.replace('<button class="btn grad block" data-act="fb-send" id="fbSend">إرسال</button>', '<p class="note">تعذّر الإرسال. تأكد من الإنترنت وحاول مرة ثانية، أو أرسلها من تطبيق البريد.</p><div class="btns"><button class="btn grad" data-act="fb-send" id="fbSend">حاول مجدداً</button><button class="btn" data-act="fb-mail">تطبيق البريد</button></div>'));
  const t = $('#fbText'); if(t) t.value = FB.text;
}
function feedbackMail(){ fbKeep(); const type = FB_TYPES[FB.type] || '';
  location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('VibeMap — ' + type)}&body=${encodeURIComponent(`${FB.text}\n\nللتواصل: ${FB.contact || '—'}\nVibeMap v${VERSION} · ${PLATFORM}`)}`; }

/* ════════ v7.7: كاميرا الحالات + الفلاتر + الملصقات ════════ */
const FILTERS = [
  { id:'none',    n:'عادي',       css:'' },
  { id:'vivid',   n:'حيوي',       css:'saturate(1.6) contrast(1.12)' },
  { id:'warm',    n:'دافئ',       css:'sepia(.25) saturate(1.35) hue-rotate(-8deg) brightness(1.04)' },
  { id:'cool',    n:'بارد',       css:'saturate(1.1) hue-rotate(14deg) brightness(1.03) contrast(1.05)' },
  { id:'desert',  n:'صحراء',      css:'sepia(.45) saturate(1.5) hue-rotate(-12deg) contrast(1.05)' },
  { id:'bw',      n:'أبيض وأسود', css:'grayscale(1) contrast(1.15)' },
  { id:'vintage', n:'قديم',       css:'sepia(.55) contrast(.95) brightness(1.05) saturate(.85)', vig:true },
  { id:'rose',    n:'وردي',       css:'sepia(.3) hue-rotate(-40deg) saturate(1.45) brightness(1.05)' },
  { id:'neon',    n:'نيون',       css:'saturate(2.2) contrast(1.25) hue-rotate(-20deg)', vig:true },
  { id:'night',   n:'رؤية ليلية', css:'grayscale(1) sepia(1) hue-rotate(60deg) saturate(3) brightness(1.15)', vig:true },
  { id:'fade',    n:'باهت',       css:'contrast(.85) brightness(1.1) saturate(.75)' },
  { id:'cinema',  n:'سينما',      css:'contrast(1.15) saturate(.9) brightness(.96)', bars:true },
];
const STICKERS = ['😂','😍','🔥','👍','😎','🥳','❤️','✨','🌴','☕','🕋','🏖️','🚗','🍔','🎉','💯'];
let CAM = null;
/* تحويل فلاتر CSS إلى مصفوفة ألوان — للأجهزة اللي ما تدعم فلاتر الرسم */
function cssToMatrix(css){
  const list = [];
  (css.match(/[a-z-]+\([^)]*\)/g) || []).forEach(f => { const [, name, raw] = f.match(/([a-z-]+)\(([^)]*)\)/); const v = parseFloat(raw); let T;
    if(name === 'grayscale'){ const a = 1 - v; T = [[.2126+.7874*a,.7152-.7152*a,.0722-.0722*a,0],[.2126-.2126*a,.7152+.2848*a,.0722-.0722*a,0],[.2126-.2126*a,.7152-.7152*a,.0722+.9278*a,0]]; }
    else if(name === 'sepia'){ const a = 1 - v; T = [[.393+.607*a,.769-.769*a,.189-.189*a,0],[.349-.349*a,.686+.314*a,.168-.168*a,0],[.272-.272*a,.534-.534*a,.131+.869*a,0]]; }
    else if(name === 'saturate'){ const s = v; T = [[.213+.787*s,.715-.715*s,.072-.072*s,0],[.213-.213*s,.715+.285*s,.072-.072*s,0],[.213-.213*s,.715-.715*s,.072+.928*s,0]]; }
    else if(name === 'hue-rotate'){ const a = v * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      T = [[.213+c*.787-s*.213,.715-c*.715-s*.715,.072-c*.072+s*.928,0],[.213-c*.213+s*.143,.715+c*.285+s*.140,.072-c*.072-s*.283,0],[.213-c*.213-s*.787,.715-c*.715+s*.715,.072+c*.928+s*.072,0]]; }
    else if(name === 'brightness'){ T = [[v,0,0,0],[0,v,0,0],[0,0,v,0]]; }
    else if(name === 'contrast'){ const o = (.5 - .5 * v) * 255; T = [[v,0,0,o],[0,v,0,o],[0,0,v,o]]; }
    if(T) list.push(T); });
  return list; /* كل خطوة تُطبّق ثم تُقصّ إلى 0–255 مثل المتصفح */
}
function applyOps(ops, r, g, b){ for(const M of ops){ const nr = M[0][0]*r + M[0][1]*g + M[0][2]*b + M[0][3], ng = M[1][0]*r + M[1][1]*g + M[1][2]*b + M[1][3], nb = M[2][0]*r + M[2][1]*g + M[2][2]*b + M[2][3];
  r = nr < 0 ? 0 : nr > 255 ? 255 : nr; g = ng < 0 ? 0 : ng > 255 ? 255 : ng; b = nb < 0 ? 0 : nb > 255 ? 255 : nb; } return [r, g, b]; }
const CANVAS_FILTER = (() => { try{ const g = document.createElement('canvas').getContext('2d'); g.filter = 'grayscale(1)'; return g.filter === 'grayscale(1)'; }catch(e){ return false; } })();
function renderPhoto(src, fl, stickers, W, H){
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  if(fl.css && CANVAS_FILTER) g.filter = fl.css;
  g.drawImage(src, 0, 0, W, H); g.filter = 'none';
  if(fl.css && !CANVAS_FILTER){ const ops = cssToMatrix(fl.css), im = g.getImageData(0, 0, W, H), d = im.data;
    for(let i = 0; i < d.length; i += 4){ const o = applyOps(ops, d[i], d[i+1], d[i+2]); d[i] = o[0]; d[i+1] = o[1]; d[i+2] = o[2]; }
    g.putImageData(im, 0, 0); }
  if(fl.vig){ const rg = g.createRadialGradient(W/2, H/2, Math.min(W, H) * .35, W/2, H/2, Math.max(W, H) * .72); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
  if(fl.bars){ g.fillStyle = '#000'; const bh = Math.round(H * .09); g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh); }
  (stickers || []).forEach(st => { g.save(); g.translate(st.x * W, st.y * H); const fs = Math.round(W * st.s);
    if(st.kind === 'emoji'){ g.font = `${fs}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(st.v, 0, 0); }
    else { g.font = `700 ${Math.round(fs * .42)}px "Readex Pro", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
      const w = g.measureText(st.v).width + fs * .5, h = fs * .7; g.fillStyle = 'rgba(255,255,255,.92)'; const r = h / 2;
      g.beginPath(); g.moveTo(-w/2 + r, -h/2); g.arcTo(w/2, -h/2, w/2, h/2, r); g.arcTo(w/2, h/2, -w/2, h/2, r); g.arcTo(-w/2, h/2, -w/2, -h/2, r); g.arcTo(-w/2, -h/2, w/2, -h/2, r); g.fill();
      g.fillStyle = '#15152B'; g.fillText(st.v, 0, 1); }
    g.restore(); });
  return c;
}
async function camOpen(){
  closeSheet(); if(SV) closeStories(); if(RT.talking) pttUp();
  CAM = { facing:'environment', f:0, torch:false, mode:'live', stickers:[], withLoc:!S.settings.ghost, caption:'' };
  const el = $('#camView'); el.hidden = false; renderCam(); await camStart();
}
async function camStart(){
  if(!CAM) return; camStopStream();
  try{ CAM.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:CAM.facing }, width:{ ideal:1280 }, height:{ ideal:1280 } }, audio:false }); }
  catch(e){ CAM.err = true; renderCam(); return; }
  if(!CAM){ camStopStream(); return; }
  const v = $('#camVid'); if(v){ v.srcObject = CAM.stream; v.play().catch(() => {}); }
  const tr = CAM.stream.getVideoTracks()[0]; let caps = {}; try{ caps = tr.getCapabilities ? tr.getCapabilities() : {}; }catch(e){}
  CAM.canTorch = !!caps.torch; CAM.err = false; renderCamBar();
}
function camStopStream(){ if(CAM && CAM.stream){ CAM.stream.getTracks().forEach(t => t.stop()); CAM.stream = null; } }
function camClose(){ camStopStream(); CAM = null; const el = $('#camView'); el.hidden = true; el.innerHTML = ''; }
function renderCam(){
  const el = $('#camView'); if(!CAM) return; const fl = FILTERS[CAM.f];
  const strip = `<div class="fstrip" id="fstrip">${FILTERS.map((x, i) => `<button class="fchip ${i === CAM.f ? 'on' : ''}" data-act="cam-f" data-i="${i}"><i style="filter:${x.css || 'none'}"></i><span>${x.n}</span></button>`).join('')}</div>`;
  if(CAM.mode === 'live'){
    el.innerHTML = `<div class="cam-stage"><video id="camVid" playsinline muted autoplay class="${CAM.facing === 'user' ? 'mirror' : ''}" style="filter:${fl.css || 'none'}"></video>
      ${fl.vig ? '<div class="cam-vig"></div>' : ''}${fl.bars ? '<div class="cam-bars"></div>' : ''}
      ${CAM.err ? '<div class="cam-err">تعذّر فتح الكاميرا. اسمح لـ VibeMap باستخدام الكاميرا من الإعدادات، أو اختر صورة من المعرض.</div>' : ''}
      <div class="cam-top"><button class="cbtn" data-act="cam-close" aria-label="إغلاق">✕</button><span class="grow"></span><span id="camTorch"></span><button class="cbtn" data-act="cam-flip" aria-label="تبديل الكاميرا">🔄</button></div>
      <div class="cam-fname" id="camFname">${fl.n}</div></div>
      <div class="cam-bottom">${strip}<div class="cam-row"><button class="cbtn big" data-act="cam-gallery" aria-label="المعرض">🖼️</button><button class="shutter" data-act="cam-shot" aria-label="التقاط"></button><button class="cbtn big" data-act="cam-text" aria-label="حالة نصية">Aa</button></div></div>`;
    if(CAM.stream){ const v = $('#camVid'); v.srcObject = CAM.stream; v.play().catch(() => {}); }
    renderCamBar(); camSwipe();
  } else {
    el.innerHTML = `<div class="cam-stage" id="camEdit"><img id="camImg" src="${CAM.shotURL}" alt="" style="filter:${fl.css || 'none'}">
      ${fl.vig ? '<div class="cam-vig"></div>' : ''}${fl.bars ? '<div class="cam-bars"></div>' : ''}<div id="stLayer" class="st-layer"></div>
      <div class="cam-top"><button class="cbtn" data-act="cam-retake" aria-label="إعادة">↩︎</button><span class="grow"></span>
        <button class="cbtn" data-act="cam-emoji" aria-label="ملصق">😀</button><button class="cbtn" data-act="cam-time" aria-label="الوقت">🕒</button>${RT.myLoc && !S.settings.ghost ? '<button class="cbtn" data-act="cam-place" aria-label="المكان">📍</button>' : ''}</div>
      ${CAM.emojiOpen ? `<div class="emoji-pop">${STICKERS.map(e => `<button data-act="cam-add" data-e="${e}">${e}</button>`).join('')}</div>` : ''}
      <div class="cam-fname" id="camFname">${fl.n}</div></div>
      <div class="cam-bottom">${strip}
        <div class="cam-row edit"><input class="input" id="camCap" maxlength="150" placeholder="اكتب تعليقاً…" value="${esc(CAM.caption)}">
        <button class="cbtn ${CAM.withLoc ? 'on' : ''}" data-act="cam-loc" aria-label="أرفق مكاني" ${S.settings.ghost ? 'disabled' : ''}>📍</button>
        <button class="btn grad" data-act="cam-post">نشر ➤</button></div>
        <div class="t2" style="text-align:center;color:#ccd">اسحب الملصقات لتحريكها · اضغط مرتين لحذف ملصق</div></div>`;
    renderStickers(); camSwipe();
  }
  const fs = $('#fstrip'); if(fs){ const on = fs.querySelector('.on'); if(on) on.scrollIntoView({ inline:'center', block:'nearest' }); }
}
function renderCamBar(){ const t = $('#camTorch'); if(t) t.innerHTML = CAM && CAM.canTorch && CAM.facing === 'environment' ? `<button class="cbtn ${CAM.torch ? 'on' : ''}" data-act="cam-torch" aria-label="الفلاش">⚡</button>` : ''; }
/* السحب يمين/يسار على الصورة يغيّر الفلتر */
function camSwipe(){
  const st = document.querySelector('#camView .cam-stage'); if(!st) return; let x0 = null, t0 = 0;
  st.onpointerdown = e => { if(e.target.closest('.sticker,.cbtn,.emoji-pop,button,input')) return; x0 = e.clientX; t0 = performance.now(); };
  st.onpointerup = e => { if(x0 == null) return; const dx = e.clientX - x0; x0 = null; if(Math.abs(dx) > 50 && performance.now() - t0 < 600) camSetFilter(CAM.f + (dx < 0 ? 1 : -1)); };
}
function camSetFilter(i){ if(!CAM) return; const cap = $('#camCap'); if(cap) CAM.caption = cap.value;
  CAM.f = (i + FILTERS.length) % FILTERS.length; const fl = FILTERS[CAM.f];
  const media = $('#camVid') || $('#camImg'); if(media) media.style.filter = fl.css || 'none';
  const stg = document.querySelector('#camView .cam-stage');
  stg.querySelectorAll('.cam-vig,.cam-bars').forEach(x => x.remove());
  if(fl.vig) media.insertAdjacentHTML('afterend', '<div class="cam-vig"></div>'); if(fl.bars) media.insertAdjacentHTML('afterend', '<div class="cam-bars"></div>');
  document.querySelectorAll('#fstrip .fchip').forEach((b, k) => b.classList.toggle('on', k === CAM.f));
  const n = $('#camFname'); if(n){ n.textContent = fl.n; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show'); }
  const on = document.querySelector('#fstrip .on'); if(on) on.scrollIntoView({ inline:'center', block:'nearest', behavior:'smooth' });
}
function camShot(){
  const v = $('#camVid'); if(!v || !v.videoWidth){ toast('الكاميرا ما جهزت بعد'); return; }
  const stg = document.querySelector('#camView .cam-stage').getBoundingClientRect(), ar = stg.width / stg.height;
  let sw = v.videoWidth, sh = v.videoHeight; if(sw / sh > ar) sw = Math.round(sh * ar); else sh = Math.round(sw / ar);
  const sx = (v.videoWidth - sw) / 2, sy = (v.videoHeight - sh) / 2, W = Math.min(1080, sw), H = Math.round(W / ar);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  if(CAM.facing === 'user'){ g.translate(W, 0); g.scale(-1, 1); }
  g.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
  vibrate(15); tone([[1600, .03]], .12);
  CAM.shot = c; CAM.shotURL = c.toDataURL('image/jpeg', .92); CAM.mode = 'edit'; camStopStream(); renderCam();
}
async function camFromFile(file){
  const url = URL.createObjectURL(file); const im = new Image();
  im.onload = () => { const s = Math.min(1, 1080 / im.width); const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    if(!CAM) CAM = { facing:'environment', f:0, stickers:[], withLoc:!S.settings.ghost, caption:'' };
    CAM.shot = c; CAM.shotURL = c.toDataURL('image/jpeg', .92); CAM.mode = 'edit'; camStopStream(); $('#camView').hidden = false; renderCam(); };
  im.onerror = () => { URL.revokeObjectURL(url); toast('تعذّر فتح الصورة'); };
  im.src = url;
}
function renderStickers(){
  const L = $('#stLayer'); if(!L || !CAM) return; const W = L.clientWidth || 360;
  L.innerHTML = CAM.stickers.map((st, i) => `<span class="sticker ${st.kind}" data-i="${i}" style="left:${st.x * 100}%;top:${st.y * 100}%;font-size:${Math.round(W * st.s * (st.kind === 'emoji' ? 1 : .42))}px">${esc(st.v)}</span>`).join('');
  L.querySelectorAll('.sticker').forEach(el => { const i = +el.dataset.i; let sx, sy, ox, oy, last = 0;
    el.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture(e.pointerId); sx = e.clientX; sy = e.clientY; ox = CAM.stickers[i].x; oy = CAM.stickers[i].y;
      const t = performance.now(); if(t - last < 320){ CAM.stickers.splice(i, 1); renderStickers(); return; } last = t; };
    el.onpointermove = e => { if(sx == null) return; const r = L.getBoundingClientRect(); const st = CAM.stickers[i]; if(!st) return;
      st.x = Math.max(.05, Math.min(.95, ox + (e.clientX - sx) / r.width)); st.y = Math.max(.05, Math.min(.95, oy + (e.clientY - sy) / r.height)); el.style.left = st.x * 100 + '%'; el.style.top = st.y * 100 + '%'; };
    el.onpointerup = el.onpointercancel = () => { sx = null; };
  });
}
function camAddSticker(kind, v){ if(!CAM) return; const cap = $('#camCap'); if(cap) CAM.caption = cap.value;
  CAM.stickers.push({ kind, v, x:.5, y:.38 + (CAM.stickers.length % 4) * .08, s:kind === 'emoji' ? .16 : .15 }); CAM.emojiOpen = false; renderCam(); }
function camPost(){
  if(!CAM || !CAM.shot) return; const cap = $('#camCap'); CAM.caption = cap ? cap.value : CAM.caption;
  const out = renderPhoto(CAM.shot, FILTERS[CAM.f], CAM.stickers, CAM.shot.width, CAM.shot.height);
  let q = .78, data = out.toDataURL('image/jpeg', q); while(data.length > 900000 && q > .45){ q -= .1; data = out.toDataURL('image/jpeg', q); }
  postStory({ t:'photo', text:V.str(CAM.caption, 150).trim(), data, withLoc:CAM.withLoc });
  camClose(); if(RT.tab !== 'stories') setTab('stories'); else renderStoriesTab();
}
function nowLabel(){ const d = new Date(); let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0'); const pm = h >= 12; h = h % 12 || 12; return `🕒 ${h}:${m} ${window.VMI18N && VMI18N.lang === 'en' ? (pm ? 'PM' : 'AM') : (pm ? 'م' : 'ص')}`; }
function placeLabel(){ const c = RT.myLoc; if(!c) return '📍 هنا'; const known = [['جدة',21.54,39.17],['مكة',21.42,39.83],['المدينة',24.47,39.61],['الرياض',24.71,46.68],['الدمام',26.43,50.10],['الطائف',21.27,40.42],['أبها',18.22,42.51],['تبوك',28.38,36.57]];
  let best = null; known.forEach(k => { const d = distance(c, { lat:k[1], lng:k[2] }); if(!best || d < best.d) best = { n:k[0], d }; }); return best && best.d < 40000 ? `📍 ${best.n}` : '📍 هنا'; }

/* ─── صفحة الحالات ─── */
function storyCard(pin, list, opts = {}){
  const f = pin === 'me' ? S.me : S.friends[pin]; const s = list[list.length - 1]; if(!f || !s) return '';
  const th = thumbOf(s), c = RT.myLoc || (S.settings.demo ? FALLBACK : null);
  const bg = s.t === 'photo' ? `background:#222${th ? `;background-image:url('${th}')` : ''}` : `background:${SBG[s.bg] || SBG[0]}`;
  const where = s.loc && c ? ` · ${fmtDist(distance(c, s.loc))}` : '';
  const views = pin === 'me' ? Object.keys(s.views || {}).length : null;
  return `<button class="scard ${opts.dim ? 'dim' : ''}" data-act="story-open" data-pin="${esc(pin)}" ${pin === 'me' ? `data-id="${s.id}"` : ''}>
    <span class="sthumb" style="${bg}">${s.t === 'text' ? `<b>${esc(s.text.slice(0, 40))}</b>` : ''}${list.length > 1 ? `<i class="cnt">${list.length}</i>` : ''}</span>
    <span class="smeta"><span class="av ${opts.ring ? 'ring' : ''}" style="${avCss(f)}">${esc(initial(pin === 'me' ? S.me.name : f.name))}</span><span class="grow"><b>${esc(pin === 'me' ? 'حالتي' : f.name.split(' ')[0])}</b><small>${fmtAgo(s.ts).replace('قبل ', '')}${where}${views != null ? ` · 👁 ${views}` : ''}</small></span></span></button>`;
}
function renderStoriesTab(){
  const v = $('#v-stories'); if(!v || RT.tab !== 'stories') return;
  if(RT.stSeg === 'square' && !feat('square')) RT.stSeg = 'stories'; else if(RT.stSeg !== 'square' && !feat('stories') && feat('square')) RT.stSeg = 'square';
  const fr = Object.values(S.friends).filter(f => f.status === 'friend' && friendStories(f.pin).length);
  const newOnes = fr.filter(f => !f.muteStories && hasUnseen(f.pin)).sort((a, b) => friendStories(b.pin).slice(-1)[0].ts - friendStories(a.pin).slice(-1)[0].ts);
  const seenOnes = fr.filter(f => !f.muteStories && !hasUnseen(f.pin)).sort((a, b) => friendStories(b.pin).slice(-1)[0].ts - friendStories(a.pin).slice(-1)[0].ts);
  const muted = fr.filter(f => f.muteStories), mine = activeMine();
  const seg = `<div class="seg wide stseg" role="tablist"><button class="${RT.stSeg !== 'square' ? 'on' : ''}" data-act="st-seg" data-v="stories" role="tab">الحالات</button><button class="${RT.stSeg === 'square' ? 'on' : ''}" data-act="st-seg" data-v="square" role="tab"># الساحة</button></div>`;
  if(RT.stSeg === 'square'){ const hh = `<div class="pad"><div class="h1">اكتشف</div>${seg}${squareHtml()}</div>`; if(v._h !== hh){ v.innerHTML = hh; v._h = hh; } return; }
  let h = `<div class="pad"><div class="h1">اكتشف</div>${seg}
    <div class="st-hero"><button class="st-cam" data-act="cam-open"><span>📷</span><b>صوّر حالة</b><small>فلاتر وملصقات</small></button>
      <button class="st-cam alt" data-act="story-new"><span>✍️</span><b>حالة نصية</b><small>بخلفية ملونة</small></button></div>
    <div class="h2">حالتي ${mine.length ? `<span class="pill">${mine.length}</span>` : ''}</div>
    ${mine.length ? `<div class="sgrid">${mine.slice().reverse().map(s => storyCard('me', [s])).join('')}</div>` : `<div class="card empty"><b>ما عندك حالة الحين</b>صوّر لحظتك وشاركها أصدقاءك 24 ساعة.</div>`}
    ${S.settings.storiesOn ? '' : '<p class="note">حالاتك مخفية عن الجميع — تقدر تظهرها من حسابي ← الحالات.</p>'}
    <div class="h2">جديدة ${newOnes.length ? `<span class="pill">${newOnes.length}</span>` : ''}</div>
    ${newOnes.length ? `<div class="sgrid">${newOnes.map(f => storyCard(f.pin, friendStories(f.pin), { ring:true })).join('')}</div>` : '<div class="card empty"><b>ما فيه حالات جديدة</b>أول ما ينشر أحد أصدقائك حالة تطلع هنا.</div>'}
    ${seenOnes.length ? `<div class="h2">شاهدتها</div><div class="sgrid">${seenOnes.map(f => storyCard(f.pin, friendStories(f.pin), { dim:true })).join('')}</div>` : ''}
    ${muted.length ? `<div class="h2">مكتومة</div><div class="card list">${muted.map(f => `<div class="set"><span class="av" style="${avCss(f)};width:34px;height:34px">${esc(initial(f.name))}</span><span class="grow t1">${esc(f.name)}</span><button class="btn sm" data-act="mute-stories" data-pin="${f.pin}">متابعة</button></div>`).join('')}</div>` : ''}
  </div>`;
  if(v._h !== h){ v.innerHTML = h; v._h = h; }
}

/* ════════ v7.7: تسجيل دخول اختياري + نسخة احتياطية مشفّرة ════════
   التطبيق يشتغل كامل بدون حساب. الحساب فقط يحفظ نسخة احتياطية مشفّرة (برمز تختاره أنت) من رقمك وأصدقائك وغرفك،
   تسترجعها لو غيرت جوالك. لا نقدر نحن ولا Google نقرأها. */
const FB_CFG = (() => { try{ return JSON.parse((document.querySelector('meta[name=vibemap-firebase]') || {}).content || 'null'); }catch(e){ return null; } })();
const AC = { ready:false, user:null, view:'home' };
function acProviders(){ return { google: PLATFORM !== 'ios' && !!FB_CFG && (PLATFORM === 'web' || !!(FB_CFG.googleWebClientId && NP('GoogleNative'))), email: true, phone: PLATFORM !== 'ios' }; }
function loadFirebase(){ if(window.VMFB) return Promise.resolve(); return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/firebase.js'; s.onload = res; s.onerror = () => rej(new Error('load')); document.head.appendChild(s); }); }
async function acInit(){
  if(AC.ready) return true; if(!FB_CFG) return false;
  if(AC.initP) return AC.initP;
  AC.initP = (async () => {
    await loadFirebase(); const F = window.VMFB;
    AC.app = F.initializeApp(FB_CFG.config);
    AC.auth = F.initializeAuth(AC.app, { persistence:[F.indexedDBLocalPersistence, F.browserLocalPersistence] });
    AC.db = F.getFirestore(AC.app);
    if(FB_CFG.emulator){ F.connectAuthEmulator(AC.auth, FB_CFG.emulator.auth, { disableWarnings:true }); F.connectFirestoreEmulator(AC.db, FB_CFG.emulator.fsHost, FB_CFG.emulator.fsPort); }
    AC.auth.languageCode = 'ar';
    await new Promise(r => { let first = true; F.onAuthStateChanged(AC.auth, u => { AC.user = u; S.account = u ? { uid:u.uid, label:acLabel(u), provider:(u.providerData[0] || {}).providerId || 'password', since:(S.account && S.account.since) || now() } : null; save(); if(first){ first = false; r(); } else if(RT.tab === 'me') renderMe(); }); });
    AC.ready = true; return true;
  })().catch(e => { AC.initP = null; throw e; });
  return AC.initP;
}
function acLabel(u){ return u.email || u.phoneNumber || u.displayName || 'حسابك'; }
const AC_ERR = { 'auth/invalid-email':'البريد غير صحيح', 'auth/missing-password':'اكتب كلمة المرور', 'auth/weak-password':'كلمة المرور ضعيفة (8 أحرف على الأقل)',
  'auth/email-already-in-use':'هذا البريد مسجّل — اختر «دخول»', 'auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة', 'auth/wrong-password':'كلمة المرور غير صحيحة',
  'auth/user-not-found':'ما فيه حساب بهذا البريد', 'auth/too-many-requests':'محاولات كثيرة، حاول بعد شوي', 'auth/network-request-failed':'تأكد من الإنترنت',
  'auth/invalid-phone-number':'رقم الجوال غير صحيح', 'auth/invalid-verification-code':'الرمز غير صحيح', 'auth/code-expired':'انتهت صلاحية الرمز، اطلب رمزاً جديداً',
  'auth/popup-closed-by-user':'أُغلقت نافذة Google', 'auth/requires-recent-login':'لأمانك: سجّل خروج ثم دخول مرة ثانية وبعدها احذف الحساب' };
const acErr = e => AC_ERR[e && e.code] || (e && /cancel/i.test(e.message || '') ? 'أُلغي' : 'صار خطأ، حاول مرة ثانية');
async function acGoogle(){
  const F = window.VMFB;
  if(PLATFORM === 'web'){ await F.signInWithPopup(AC.auth, new F.GoogleAuthProvider()); return; }
  const G = NP('GoogleNative'); const r = await G.signIn({ clientId:FB_CFG.googleWebClientId });
  await F.signInWithCredential(AC.auth, F.GoogleAuthProvider.credential(r.idToken));
}
async function acEmail(mode){
  const F = window.VMFB, email = ($('#acEmail') || {}).value?.trim(), pass = ($('#acPass') || {}).value || '';
  if(mode === 'reset'){ await F.sendPasswordResetEmail(AC.auth, email); toast('أرسلنا رابط تغيير كلمة المرور لبريدك'); return false; }
  if(mode === 'new'){ const c = await F.createUserWithEmailAndPassword(AC.auth, email, pass); F.sendEmailVerification(c.user).catch(() => {}); toast('أُنشئ حسابك — أرسلنا رابط تأكيد لبريدك'); }
  else await F.signInWithEmailAndPassword(AC.auth, email, pass);
  return true;
}
async function acPhoneSend(){
  const F = window.VMFB; let num = ($('#acPhone') || {}).value || ''; num = num.replace(/[^\d+]/g, '');
  if(/^05\d{8}$/.test(num)) num = '+966' + num.slice(1); else if(/^5\d{8}$/.test(num)) num = '+966' + num; else if(!num.startsWith('+')) num = '+' + num;
  if(!/^\+\d{8,15}$/.test(num)){ toast('اكتب رقم الجوال مثل 05xxxxxxxx'); return; }
  if(!AC.recaptcha) AC.recaptcha = new F.RecaptchaVerifier(AC.auth, 'acRecaptcha', { size:'invisible' });
  AC.confirm = await F.signInWithPhoneNumber(AC.auth, num, AC.recaptcha); AC.phoneNum = num; AC.view = 'phone-code'; renderAccount(); toast('أرسلنا رمز التحقق برسالة نصية');
}
async function acPhoneVerify(){ const code = (($('#acCode') || {}).value || '').replace(/\D/g, ''); if(code.length < 6){ toast('اكتب الرمز المكوّن من 6 أرقام'); return false; } await AC.confirm.confirm(code); return true; }

/* ─── النسخة الاحتياطية: مشفّرة بـ AES-GCM بمفتاح مشتق من «رمز النسخة» (PBKDF2 × 210,000) ─── */
async function bkDerive(code, salt){
  const base = await crypto.subtle.importKey('raw', TE.encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:210000, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']);
}
function bkPayload(){
  const pick = (o, ks) => { const r = {}; ks.forEach(k => { if(o[k] !== undefined) r[k] = o[k]; }); return r; };
  const friends = {}; Object.values(S.friends).forEach(f => { if(!f.demo) friends[f.pin] = pick(f, ['pin','name','color','status','added','ttl','wall','mute','muteStories','hideStories','myRating']); });
  const settings = { ...S.settings }; delete settings.turnPass;
  return { v:1, app:VERSION, ts:now(), me:S.me, friends, rooms:S.rooms, leftRooms:S.leftRooms, blocked:S.blocked, settings };
}
async function bkSetup(code){
  const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await bkDerive(code, salt);
  await idb.set('bkKey', key); S.account.salt = b64(salt); S.account.autobk = true; save(); return key;
}
async function bkUpload(silent){
  if(!AC.user || !S.account || !S.account.salt) return false; const key = await idb.get('bkKey'); if(!key) return false;
  const F = window.VMFB, iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, TE.encode(JSON.stringify(bkPayload())));
  await F.setDoc(F.doc(AC.db, 'users', AC.user.uid, 'backup', 'main'), { ct:b64(ct), iv:b64(iv), salt:S.account.salt, v:1, app:VERSION, ts:F.serverTimestamp() });
  S.account.lastBk = now(); save(); if(!silent) toast('حُفظت النسخة الاحتياطية المشفّرة'); return true;
}
async function bkRestore(code){
  const F = window.VMFB; const snap = await F.getDoc(F.doc(AC.db, 'users', AC.user.uid, 'backup', 'main'));
  if(!snap.exists()){ toast('ما فيه نسخة احتياطية في هذا الحساب'); return; }
  const d = snap.data(); let data;
  try{ const key = await bkDerive(code, unb64(d.salt)); data = JSON.parse(TD.decode(await crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64(d.iv) }, key, unb64(d.ct)))); }
  catch(e){ toast('رمز النسخة غير صحيح'); return; }
  if(!data || !data.me || !PIN_STRICT.test(data.me.pin || '')){ toast('النسخة تالفة'); return; }
  const acc = S.account; const keep = { ...defaults(), ...S };
  S = { ...keep, me:{ ...data.me, name:V.name(data.me.name), color:V.color(data.me.color) }, friends:{}, rooms:data.rooms || {}, leftRooms:data.leftRooms || {}, blocked:data.blocked || {},
        settings:{ ...defaults().settings, ...(data.settings || {}), turnPass:S.settings.turnPass }, keys:null, account:{ ...acc, salt:d.salt, autobk:true } };
  Object.values(data.friends || {}).forEach(f => { if(PIN_STRICT.test(f.pin || '')) S.friends[f.pin] = { ...f, name:V.name(f.name), color:V.color(f.color), pub:null, keyAlert:false }; });
  await idb.set('bkKey', await bkDerive(code, unb64(d.salt)));
  await idb.set('privKey', null); save();
  toast('استرجعنا حسابك — يعيد التشغيل…'); setTimeout(() => location.reload(), 900);
}
let bkT; function bkSoon(){ if(!S || !S.account || !S.account.autobk || !AC.user) return; clearTimeout(bkT); bkT = setTimeout(() => bkUpload(true).catch(() => {}), 120000); }

function openAccount(view){ AC.view = view || (S.account ? 'home' : 'start'); renderAccount(); if(FB_CFG) acInit().then(() => renderAccount()).catch(() => { AC.loadErr = true; renderAccount(); }); }
function renderAccount(){
  const pv = acProviders(), a = S.account, v = AC.view;
  let h = `<div class="grab"></div><div class="h1">الحساب</div>`;
  if(!FB_CFG) h += `<p class="note">تسجيل الدخول غير مفعّل في هذه النسخة بعد. التطبيق يشتغل كامل بدون حساب.</p>`;
  else if(AC.loadErr) h += `<p class="note">تعذّر تحميل خدمة الحسابات. تأكد من الإنترنت وحاول مرة ثانية.</p><button class="btn" data-act="acc-open">إعادة المحاولة</button>`;
  else if(!AC.ready) h += `<p class="t2">يحمّل…</p>`;
  else if(!AC.user){
    if(v === 'email') h += `<p class="t2" style="white-space:normal">سجّل ببريدك وكلمة مرور (8 أحرف على الأقل).</p>
      <input class="input" id="acEmail" type="email" dir="ltr" autocomplete="email" placeholder="name@example.com">
      <input class="input" id="acPass" type="password" dir="ltr" autocomplete="current-password" placeholder="كلمة المرور">
      <div class="btns"><button class="btn grad" data-act="acc-email" data-m="in">دخول</button><button class="btn" data-act="acc-email" data-m="new">حساب جديد</button></div>
      <button class="btn sm" data-act="acc-email" data-m="reset" style="align-self:flex-start">نسيت كلمة المرور</button><button class="btn sm" data-act="acc-view" data-v="start" style="align-self:flex-start">رجوع</button>`;
    else if(v === 'phone') h += `<p class="t2" style="white-space:normal">نرسل لك رمز تحقق برسالة نصية.</p>
      <input class="input" id="acPhone" type="tel" dir="ltr" inputmode="tel" placeholder="05xxxxxxxx" value="${esc(AC.phoneNum || '')}">
      <button class="btn grad block" data-act="acc-phone-send" id="acRecaptcha">إرسال الرمز</button><button class="btn sm" data-act="acc-view" data-v="start" style="align-self:flex-start">رجوع</button>
      <p class="t2" style="white-space:normal;font-size:11px">هذه الصفحة محمية بـ reCAPTCHA وتنطبق <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">سياسة خصوصية</a> و<a href="https://policies.google.com/terms" target="_blank" rel="noopener">شروط</a> Google.</p>`;
    else if(v === 'phone-code') h += `<p class="t2" style="white-space:normal">اكتب الرمز اللي وصلك على <b dir="ltr">${esc(AC.phoneNum || '')}</b></p>
      <input class="input" id="acCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr" placeholder="••••••" style="letter-spacing:.4em;text-align:center;font-size:22px">
      <button class="btn grad block" data-act="acc-phone-verify">تأكيد</button><button class="btn sm" data-act="acc-view" data-v="phone" style="align-self:flex-start">تغيير الرقم</button><div id="acRecaptcha"></div>`;
    else h += `<p class="t2" style="white-space:normal">اختياري تماماً. يفيدك تحفظ نسخة احتياطية <b>مشفّرة</b> من رقمك وأصدقائك وغرفك، وتسترجعها لو غيّرت جوالك. رسائلك وصوتك وموقعك ما تنحفظ عندنا أبداً.</p>
      ${pv.google ? `<button class="btn block acbtn" data-act="acc-google"><b class="g">G</b>المتابعة مع Google</button>` : ''}
      <button class="btn block acbtn" data-act="acc-view" data-v="email">✉️ البريد الإلكتروني</button>
      ${pv.phone ? `<button class="btn block acbtn" data-act="acc-view" data-v="phone">📱 رقم الجوال</button>` : ''}`;
  } else {
    const bk = a && a.salt, last = a && a.lastBk;
    h += `<div class="card" style="padding:14px;display:flex;gap:12px;align-items:center"><span class="av" style="background:var(--accent);width:44px;height:44px">✓</span><span class="grow"><b style="display:block"><bdi>${esc(acLabel(AC.user))}</bdi></b><span class="t2">مسجّل الدخول${AC.user.email && !AC.user.emailVerified && (a.provider === 'password') ? ' · البريد غير مؤكد' : ''}</span></span></div>
      <div class="h2">النسخة الاحتياطية</div>`;
    if(v === 'bk-setup') h += `<p class="t2" style="white-space:normal">اختر <b>رمز النسخة</b> (6 أرقام أو أكثر). يُشفّر به كل شيء على جوالك قبل الرفع — <b>لا تنساه</b>، ما نقدر نسترجعه.</p>
      <input class="input" id="bkCode" type="password" inputmode="numeric" dir="ltr" placeholder="رمز النسخة"><input class="input" id="bkCode2" type="password" inputmode="numeric" dir="ltr" placeholder="أعد كتابة الرمز">
      <button class="btn grad block" data-act="bk-setup-save">تفعيل وحفظ نسخة الآن</button>`;
    else if(v === 'bk-restore') h += `<p class="t2" style="white-space:normal">اكتب رمز النسخة. <b>تنبيه:</b> يستبدل الحساب الحالي على هذا الجوال برقمك وأصدقائك من النسخة. مفاتيح التشفير تتجدد، فيطلع لأصدقائك تنبيه «تغيّر رمز الأمان» مرة وحدة.</p>
      <input class="input" id="bkCode" type="password" inputmode="numeric" dir="ltr" placeholder="رمز النسخة"><button class="btn danger block" data-act="bk-restore-go">استرجاع</button>`;
    else h += `<div class="card list">
      <div class="set"><span class="grow"><span class="t1" style="display:block">${bk ? 'النسخ الاحتياطي مفعّل' : 'النسخ الاحتياطي غير مفعّل'}</span><span class="t2" style="display:block">${bk ? (last ? 'آخر نسخة ' + fmtAgo(last) + ' · تتحدث تلقائياً' : 'لم تُحفظ نسخة بعد') : 'فعّله عشان تسترجع حسابك لو غيّرت جوالك'}</span></span>${bk ? '<button class="btn sm pri" data-act="bk-now">احفظ الآن</button>' : '<button class="btn sm pri" data-act="acc-view" data-v="bk-setup">تفعيل</button>'}</div>
      <div class="set"><span class="grow t1">استرجاع من نسخة</span><button class="btn sm" data-act="acc-view" data-v="bk-restore">استرجاع</button></div></div>
      <div class="btns"><button class="btn" data-act="acc-signout">تسجيل خروج</button><button class="btn danger" data-act="acc-delete">حذف الحساب السحابي</button></div>
      <p class="t2" style="white-space:normal">تسجيل الخروج لا يحذف شيء من جوالك. حذف الحساب يمسح النسخة الاحتياطية من الخادم نهائياً.</p>`;
  }
  openSheet(h);
}
async function acAction(a, b){
  try{
    if(a === 'acc-open') return openAccount();
    if(a === 'acc-view'){ AC.view = b.dataset.v; return renderAccount(); }
    if(!AC.ready && !(await acInit())) return;
    if(a === 'acc-google'){ await acGoogle(); AC.view = 'home'; toast('سجّلت الدخول'); return renderAccount(); }
    if(a === 'acc-email'){ if(await acEmail(b.dataset.m)){ AC.view = 'home'; renderAccount(); } return; }
    if(a === 'acc-phone-send') return await acPhoneSend();
    if(a === 'acc-phone-verify'){ if(await acPhoneVerify()){ AC.view = 'home'; toast('سجّلت الدخول'); renderAccount(); } return; }
    if(a === 'bk-setup-save'){ const c1 = $('#bkCode').value, c2 = $('#bkCode2').value; if(!/^\d{6,}$/.test(c1)){ toast('الرمز 6 أرقام أو أكثر'); return; } if(c1 !== c2){ toast('الرمزين مختلفين'); return; }
      await bkSetup(c1); await bkUpload(); AC.view = 'home'; return renderAccount(); }
    if(a === 'bk-now'){ await bkUpload(); return renderAccount(); }
    if(a === 'bk-restore-go'){ const c = $('#bkCode').value; if(!c){ toast('اكتب رمز النسخة'); return; } return await bkRestore(c); }
    if(a === 'acc-signout'){ await window.VMFB.signOut(AC.auth); S.account = null; save(); await idb.set('bkKey', null); toast('سجّلت الخروج'); AC.view = 'start'; return renderAccount(); }
    if(a === 'acc-delete'){ const F = window.VMFB; await F.deleteDoc(F.doc(AC.db, 'users', AC.user.uid, 'backup', 'main')).catch(() => {}); await F.deleteUser(AC.user);
      S.account = null; save(); await idb.set('bkKey', null); toast('حُذف حسابك السحابي ونسختك الاحتياطية'); AC.view = 'start'; return renderAccount(); }
  }catch(e){ console.warn('account', e); toast(acErr(e)); if(a === 'acc-phone-send' && AC.recaptcha){ try{ AC.recaptcha.clear(); }catch(x){} AC.recaptcha = null; } }
}

/* ════════ SOS ════════ */
/* v8.0: الاستغاثة لمن تختار (الجميع، شخص، أو غرفة) وتوصل حتى لو التطبيق مقفل عندهم */
function sosTargets(to){
  const fr = p => S.friends[p] && S.friends[p].status === 'friend' && !isDemo(p);
  if(to && isRoom(to)){ const r = roomOf(to); if(r) return r.members.filter(p => p !== S.me.pin && fr(p)); }
  else if(to && to !== 'all' && fr(to)) return [to];
  return Object.values(S.friends).filter(f => fr(f.pin)).map(f => f.pin);
}
function sosToName(to){
  if(!to || to === 'all') return 'الجميع';
  if(isRoom(to)){ const r = roomOf(to); return r ? `${r.emoji} ${r.name}` : 'الجميع'; }
  return (S.friends[to] && S.friends[to].status === 'friend') ? S.friends[to].name : 'الجميع';
}
function sosDefault(){ const t = S.settings.sosTo || 'all'; return (t === 'all' || (isRoom(t) ? roomOf(t) : S.friends[t] && S.friends[t].status === 'friend')) ? t : 'all'; }
function renderSosBtn(){ const b = $('#sosBtn'); const l = b && b.querySelector('.sub'); if(!l) return; const t = sosDefault(); l.textContent = t === 'all' ? '' : sosToName(t).split(' ')[0]; l.hidden = t === 'all'; b.title = 'استغاثة إلى ' + sosToName(t); }
async function sendSOS(to){
  to = to || sosDefault();
  const list = sosTargets(to);
  if(!list.length){ toast('ما عندك أصدقاء تضيفهم لنداء الاستغاثة. أضف صديق أولاً'); return; }
  RT.sosActive = true; RT.sosTo = to; RT.sosList = list;
  const payload = { k:'sos', on:true, ts:now() };
  if(RT.myLoc){ payload.lat = RT.myLoc.lat; payload.lng = RT.myLoc.lng; payload.acc = RT.myLoc.acc; }
  vibrate([200, 100, 200]); tone([[880,.2],[660,.2],[880,.2]], .3);
  openSheet(sosSentSheet(null));
  const res = await Promise.all(list.map(async p => {
    const direct = await sendEnc(p, payload);
    const viaServer = await relaySend(p, payload, 'sos'); /* دائماً عبر الخادم أيضاً: يوصل حتى لو جواله نايم */
    return direct || viaServer;
  }));
  const n = res.filter(Boolean).length;
  RT.sosSent = n;
  if(!$('#sheetWrap').hidden && $('#sosSentBox')) openSheet(sosSentSheet(n));
  toast(n ? `وصل نداء الاستغاثة إلى ${n} من ${list.length}` : 'تعذّر الإرسال الآن — تأكد من الإنترنت');
}
function cancelSOS(){
  RT.sosActive = false; const payload = { k:'sos', on:false, ts:now() };
  (RT.sosList || sosTargets('all')).forEach(p => { sendEnc(p, payload); relaySend(p, payload, 'sosoff'); });
  closeSheet(); toast('تم إلغاء نداء الاستغاثة');
}
function sosSentSheet(n){
  const who = sosToName(RT.sosTo);
  return `<div class="grab"></div><div class="h1" style="color:var(--sos)" id="sosSentBox">نداء الاستغاثة ${n == null ? 'يُرسل…' : 'أُرسل'}</div>
  <p class="note">إلى: <b>${esc(who)}</b>${n == null ? '' : ` — وصل إلى <b>${n}</b> من ${(RT.sosList || []).length}`}. يوصلهم تنبيه بصوت إنذار وموقعك، حتى لو التطبيق مقفل عندهم.${RT.myLoc ? '' : ' <b>موقعك غير متاح</b>، فلم يُرسل معه.'}<br>في حالة الخطر الحقيقي اتصل بالطوارئ <b class="mono">911</b> أو الإسعاف <b class="mono">997</b>.</p>
  <button class="btn danger block" data-act="sos-cancel">أنا بخير — إلغاء النداء</button>`;
}
/* ضغطة عادية على SOS: تختار لمن يوصل النداء */
function sosPickSheet(){
  const cur = sosDefault();
  const fr = Object.values(S.friends).filter(f => f.status === 'friend' && !isDemo(f.pin));
  const rooms = Object.values(S.rooms || {}).filter(r => r.members.some(p => p !== S.me.pin && S.friends[p] && S.friends[p].status === 'friend'));
  const row = (t, label, sub, av) => `<button class="row ${cur === t ? 'on' : ''}" data-act="sos-to" data-t="${esc(t)}" style="width:100%;text-align:start">${av}<span class="grow"><span class="t1" style="display:block">${esc(label)}</span><span class="t2" style="display:block">${esc(sub)}</span></span><span aria-hidden="true" style="font-size:20px">${cur === t ? '🔴' : '⚪'}</span></button>`;
  return `<div class="grab"></div><div class="h1" style="color:var(--sos)">🆘 نداء استغاثة</div>
  <p class="note">اختر لمن يوصل النداء. <b>الضغط المطوّل</b> على زر SOS يرسله فوراً للي تختاره هنا.</p>
  <div class="card list" style="max-height:46vh;overflow:auto">
  ${row('all', 'الجميع', `كل أصدقائك (${fr.length})`, '<span class="av" style="background:var(--sos)">👥</span>')}
  ${rooms.map(r => row('R:' + r.id, `${r.emoji} ${r.name}`, `غرفة · ${r.members.length - 1} أعضاء`, `<span class="av" style="background:${esc(r.color)};font-size:20px">${esc(r.emoji)}</span>`)).join('')}
  ${fr.map(f => row(f.pin, f.name, isOnline(f.pin) ? 'متصل الآن' : 'يوصله إشعار', `<span class="av" style="${avCss(f)}">${esc(initial(f.name))}</span>`)).join('')}
  </div>
  <button class="btn danger block" data-act="sos-send-now" style="margin-top:12px">أرسل الاستغاثة الآن إلى ${esc(sosToName(cur))}</button>`;
}
function sosConvSheet(conv){
  RT.sosConv = conv;
  return `<div class="grab"></div><div class="h1" style="color:var(--sos)">🆘 استغاثة إلى ${esc(sosToName(conv))}</div>
  <p class="note">يوصلهم تنبيه بصوت إنذار مع موقعك، حتى لو التطبيق مقفل عندهم.</p>
  <button class="btn danger block" data-act="sos-send-conv" data-pin="${esc(conv)}">أرسل الاستغاثة الآن</button>
  <button class="btn block" data-act="sheet-close" style="margin-top:8px">تراجع</button>`;
}
function showSosAlert(pin){
  const f = S.friends[pin]; RT.sosFrom = { pin };
  const el = $('#sosAlert'); el.hidden = false; renderSosAlert();
  vibrate([500, 200, 500, 200, 500]); notify(`🆘 ${f.name} يحتاج مساعدة`, 'افتح VibeMap لرؤية موقعه');
  if(!RT.siren){ const c = ctx(); if(c) c.resume().catch(() => {}); RT.siren = setInterval(() => tone([[960,.28],[640,.28]], .35), 600); }
}
function renderSosAlert(){
  if(!RT.sosFrom) return; const f = S.friends[RT.sosFrom.pin]; if(!f) return;
  const el = $('#sosAlert'); const c = RT.myLoc;
  const d = c && f.loc ? distance(c, f.loc) : null; const b = c && f.loc ? bearing(c, f.loc) : null;
  const rot = b == null ? 0 : (RT.heading != null ? b - RT.heading : b);
  el.innerHTML = `<div class="big">SOS</div><div class="who">${esc(f.name)} يحتاج مساعدة</div>
    ${f.loc ? `<div class="arrow" aria-hidden="true"><span style="display:block;transform:rotate(${rot}deg)">${I.arrow}</span></div>
    <div class="num" style="font-size:20px">${fmtDist(d)}${RT.heading == null ? ' — السهم يشير إلى الشمال الجغرافي' : ''}</div>
    <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((+f.loc.lat).toFixed(6) + ',' + (+f.loc.lng).toFixed(6))}" target="_blank" rel="noopener">فتح موقعه في الخرائط</a>` : '<div>لم يُرسل موقعه</div>'}
    <button class="btn" data-act="sos-dismiss">إيقاف الإنذار</button>`;
}
function stopSosAlert(){ clearInterval(RT.siren); RT.siren = null; RT.sosFrom = null; $('#sosAlert').hidden = true; }

/* ════════ الأصدقاء ════════ */
function addFriendByPin(raw){
  const m = String(raw || '').toUpperCase().match(PIN_RE); if(!m){ toast('اكتب رقم VibeMap بالشكل VM-XXXX-XXXX'); return false; }
  const pin = m[0].toUpperCase();
  if(pin === S.me.pin){ toast('هذا رقمك أنت'); return false; }
  const f = S.friends[pin];
  if(f && f.status === 'friend'){ toast(`${f.name} صديقك بالفعل`); return true; }
  if(f && f.status === 'in'){ acceptFriend(pin); return true; }
  S.friends[pin] = { pin, name:pin, color:COLORS[Math.floor(Math.random() * COLORS.length)], status:'out', added:now() };
  S.friends[pin].rq = 'wait'; save(); connectTo(pin); renderAll(); toast('جاري إرسال الطلب…'); sendReq(pin); return true;
}
/* v8.4: إرسال طلب الصداقة بحالة واضحة: وصل ✓ / ننتظر الإنترنت ونعيد تلقائياً / الرقم غير موجود */
async function sendReq(pin, extra, quiet){
  let f = S.friends[pin]; if(!f || f.status !== 'out') return false;
  if(extra) f.reqX = extra; f.rqLast = now();
  const ok = await relaySendPlain(pin, reqPayload(f.reqX), 'friend'), err = RL.lastErr;
  f = S.friends[pin]; if(!f || f.status !== 'out') return ok;
  if(ok){ f.rq = 'sent'; f.rqTry = 0; }
  else if(err === 'noreg'){ delete S.friends[pin]; save(); renderAll(); toast('ما لقينا مستخدم بهذا الرقم — تأكد منه وجرّب مرة ثانية'); return false; }
  else { f.rq = 'retry'; f.rqTry = (f.rqTry || 0) + 1; }
  save(); renderAll();
  if(!quiet) toast(ok ? `وصل طلب الصداقة ✓ — بيوصله إشعار` : 'ما قدرنا نرسل الحين — بنعيد المحاولة تلقائياً أول ما يرجع الإنترنت');
  return ok;
}
function reqRetry(){
  if(!RELAY || S.settings.offline || navigator.onLine === false) return;
  Object.values(S.friends).forEach(f => { if(f.status === 'out' && (f.rq === 'retry' || f.rq === 'wait') && !f.fromPub && now() - (f.rqLast || 0) > Math.min(300e3, 15e3 * Math.pow(2, f.rqTry || 0))) sendReq(f.pin, null, true); });
}
function acceptFriend(pin){
  const f = S.friends[pin]; if(!f) return; f.status = 'friend'; save();
  const c = RT.conns[pin]; if(c && c.open) c.send({ type:'accept' });
  relaySendPlain(pin, acceptPayload(), 'accept'); if(f.pub && !RT.keys[pin]) deriveFor(pin); delete f.reqVoice; save();
  toast(`أصبحت أنت و${f.name} أصدقاء`); onFriendOnline(pin); renderAll();
}
function declineFriend(pin){ const c = RT.conns[pin]; if(c && c.open){ c.send({ type:'decline' }); setTimeout(() => c.close(), 300); } relaySendPlain(pin, { k:'fdec', pub:S.keys.pub }); delete S.friends[pin]; save(); renderAll(); }
/* v7: حظر مستخدم — يقطع الاتصال ويرفض أي طلب أو رسالة منه مستقبلاً، ويمكن الإبلاغ عنه */
const SUPPORT_EMAIL = (document.querySelector('meta[name=vibemap-support-email]') || {}).content || '';
function blockUser(pin, report){
  if(!PIN_STRICT.test(pin) || isDemo(pin)) return;
  const sq = SQ.items.find(x => x.pin === pin), nr = nearOf(pin);
  const f = S.friends[pin] || { name:(nr && nr.n) || (sq && V.name(sq.n)) || pin, hidePin:false };
  S.blocked[pin] = { name:f.name, ts:now(), hidePin:!!f.hidePin };
  if(RT.near) RT.near = RT.near.filter(x => x.pin !== pin); SQ.items = SQ.items.filter(x => x.pin !== pin);
  const c = RT.conns[pin]; if(c && c.open){ c.send({ type:'remove' }); setTimeout(() => c.close(), 300); }
  delete S.friends[pin]; delete MSG[pin]; delete STO.fr[pin]; delete STO.sent[pin]; saveSto(); if(RT.target === pin) RT.target = null; save(); saveMsgs(); closeSheet(); closeChat(); renderAll();
  toast(`تم حظر ${f.name}`);
  if(report && SUPPORT_EMAIL){ location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('بلاغ إساءة في VibeMap')}&body=${encodeURIComponent(`الرقم المُبلغ عنه: ${pin}\nالاسم الظاهر: ${f.name}\nرقمي: ${S.me.pin}\nوصف المشكلة: `)}`; }
}
function removeFriend(pin){
  if(isDemo(pin)){ S.settings.demo = false; applyDemo(); closeSheet(); renderAll(); toast('أوقفت الوضع التجريبي'); return; }
  const c = RT.conns[pin]; if(c && c.open){ c.send({ type:'remove' }); setTimeout(() => c.close(), 300); }
  delete S.friends[pin]; delete MSG[pin]; delete STO.fr[pin]; delete STO.sent[pin]; saveSto(); if(RT.target === pin) RT.target = null; save(); saveMsgs(); closeSheet(); renderAll(); toast('تمت إزالة الصديق');
}
function myRep(){ const r = Object.values(S.ratingsIn || {}); if(!r.length) return null;
  const avg = k => +(r.reduce((a, x) => a + (x[k] || 0), 0) / r.length).toFixed(1); return { t:avg('t'), e:avg('e'), h:avg('h'), n:r.length }; }
/* رابط الدعوة: على الويب رابط الصفحة نفسها، وفي تطبيق المتجر رابط الموقع العام إن وُجد، وإلا الرقم فقط (يقرؤه ماسح VibeMap) */
function inviteUrl(){
  if(!IS_NATIVE && /^https:$/.test(location.protocol) && location.hostname !== 'localhost') return `${location.origin}${location.pathname}?add=${S.me.pin}`;
  if(PUBLIC_URL) return `${PUBLIC_URL.replace(/\/?$/, '/')}?add=${S.me.pin}`;
  return `VIBEMAP:${S.me.pin}`;
}
/* v7: رابط الدعوة لا يرسل طلباً تلقائياً — يطلب تأكيدك أولاً (فتح الطلب يكشف اسمك ومفتاحك لصاحب الرقم) */
function confirmAdd(raw){
  const m = String(raw || '').toUpperCase().match(PIN_RE); if(!m) return; const pin = m[0];
  if(pin === S.me.pin || (S.friends[pin] && S.friends[pin].status === 'friend')) return;
  openSheet(`<div class="grab"></div><div class="h1">إضافة صديق؟</div><p class="note">فتحت رابط دعوة للرقم <b class="mono" dir="ltr">${esc(pin)}</b>. سيصل لصاحبه اسمك وطلب صداقة. أضفه فقط إذا كنت تعرفه.</p><div class="btns"><button class="btn pri" data-act="add-confirm" data-pin="${esc(pin)}">إرسال الطلب</button><button class="btn" data-act="sheet-close">إلغاء</button></div>`);
}
function qrSvg(text){ try{ const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag(4, 2); }catch(e){ return ''; } }

/* ════════ الإشعارات و إبقاء الشاشة ════════ */
async function notify(title, body){
  if(document.visibilityState === 'visible' || RT.quietNotify) return; /* v8.0: الإشعار ظهر من النظام مسبقاً */
  const LN = NP('LocalNotifications');
  title = T(title); body = T(String(body || ''));
  if(LN){ try{ await LN.schedule({ notifications:[{ id: Math.floor(Math.random() * 2e9), title, body: body.slice(0, 140) }] }); }catch(e){} return; }
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try{ const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if(reg && reg.showNotification) reg.showNotification(title, { body, icon:'icons/icon-192.png', badge:'icons/icon-192.png', tag:'vibemap', renotify:true, vibrate:[100,50,100] }); else new Notification(title, { body, icon:'icons/icon-192.png' }); }catch(e){}
}
async function applyWake(){
  try{ if(S.settings.wake && 'wakeLock' in navigator){ if(!RT.wake) { RT.wake = await navigator.wakeLock.request('screen'); RT.wake.addEventListener('release', () => { RT.wake = null; }); } }
       else if(RT.wake){ await RT.wake.release(); RT.wake = null; } }catch(e){ RT.wake = null; }
}

/* ════════ الواجهة ════════ */
function applyEco(){ document.documentElement.classList.toggle('eco', !!(S && S.settings.eco)); }
/* ════════ v8.4: اللغة — «لغة الجهاز» تلقائياً، أو عربي/English من حسابي ════════ */
function langOf(){ const l = S && S.settings && S.settings.lang || 'auto'; if(l === 'ar' || l === 'en') return l;
  const n = (navigator.languages && navigator.languages[0]) || navigator.language || 'ar'; return /^ar\b/i.test(n) ? 'ar' : 'en'; }
function applyLang(){ const l = langOf(); if(window.VMI18N) VMI18N.set(l);
  const P = NP('VibePush'); if(P && P.setLang) P.setLang({ lang:l }).catch(() => {}); }
const T = s => window.VMI18N ? VMI18N.tr(s) : s;
function applyTheme(){ applyEco(); const t = S ? S.settings.theme : 'system'; const r = document.documentElement;
  if(t === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]').setAttribute('content', dark ? '#0A0A1C' : '#F5F5FB'); }

function setTab(t){
  RT.tab = t;
  ['radar','stories','chats','friends','me'].forEach(x => { $('#v-' + x).hidden = x !== t; $('#t-' + x).classList.toggle('on', x === t); });
  if(t !== 'radar' && RT.mode === 'ar') stopAR();
  if(t === 'radar' && RT.mode === 'ar') startAR();
  geoRefresh(); renderAll();
}
function renderTabs(){
  const u = Object.keys(S.friends).reduce((a, p) => a + unread(p), 0) + Object.keys(S.rooms).reduce((a, r) => a + unread('R:' + r), 0);
  const req = Object.values(S.friends).filter(f => f.status === 'in').length;
  $('#t-radar').innerHTML = `${I.radar}<span>الرادار</span>`;
  { const ns = Object.values(S.friends).filter(f => f.status === 'friend' && !f.muteStories && hasUnseen(f.pin)).length;
    $('#t-stories').innerHTML = `${I.story}<span>اكتشف</span>${ns ? `<span class="badge num">${ns}</span>` : ''}`; }
  $('#t-chats').innerHTML = `${I.chat}<span>المحادثات</span>${u ? `<span class="badge num">${u}</span>` : ''}`;
  $('#t-friends').innerHTML = `${I.users}<span>الأصدقاء</span>${req ? `<span class="badge num">${req}</span>` : ''}`;
  $('#t-me').innerHTML = `${I.user}<span>حسابي</span>`;
}
function renderToolbar(){
  $('#modeRadar').classList.toggle('on', RT.mode === 'radar'); $('#modeAR').classList.toggle('on', RT.mode === 'ar');
  const cb = $('#compassBtn'); cb.innerHTML = I.compass; cb.classList.toggle('on', RT.heading != null);
  const rm = RT.target && roomOf(RT.target), t = !rm && RT.target && S.friends[RT.target];
  const chip = $('#targetChip'); chip.classList.toggle('hot', !!(t || rm));
  chip.innerHTML = (rm ? `تتحدث في غرفة <b>${esc(rm.emoji)} ${esc(rm.name)}</b> (${convTargets(RT.target).length} متصل)` : t ? `تتحدث إلى <b>${esc(t.name)}</b> فقط` : `تتحدث إلى <b>كل الأصدقاء المتصلين (${pttTargets().length})</b>`) + ' <span class="chev">▾</span>';
  const vm = visMode(); $('#ghostBtn').setAttribute('aria-pressed', vm === 'hidden'); $('#ghostBtn').classList.toggle('pubv', vm === 'public');
  $('#ghostIcon').innerHTML = vm === 'hidden' ? I.eyeOff : vm === 'public' ? '<span style="font-size:22px">🌍</span>' : I.eye; $('#ghostLbl').textContent = vm === 'hidden' ? 'مخفي' : vm === 'public' ? 'للجميع' : 'للأصدقاء';
  $('#pttIcon').innerHTML = I.mic;
}
function renderTalk(){
  bgState();
  const p = $('#ptt'); p.classList.toggle('talk', RT.talking); p.classList.toggle('rx', !RT.talking && RT.rxTalking.size > 0);
  $('#pttLbl').textContent = RT.talking ? ((RT._txTargets || []).length ? 'تبث الآن…' : 'يسجّل رسالة…') : RT.rxTalking.size ? 'انتظر…' : 'اضغط وتحدث';
  const names = [...RT.rxTalking].map(p => S.friends[p] && S.friends[p].name).filter(Boolean);
  $('#rxbar').textContent = RT.talking ? `على الهواء إلى ${RT._txTargets ? RT._txTargets.length : 0} ${(RT._txTargets||[]).length === 1 ? 'صديق' : 'أصدقاء'}` : names.length ? `${names.join('، ')} ${names.length > 1 ? 'يتحدثون' : 'يتحدث'} الآن` : '';
}

const renderStageTf = throttle(() => { renderStage(); if(RT.sosFrom) renderSosAlert(); }, 120);
const renderStageTe = throttle(() => { renderStage(); if(RT.sosFrom) renderSosAlert(); }, 280);
const renderStageT = () => (S && S.settings.eco && RT.mode !== 'ar' ? renderStageTe : renderStageTf)();
function niceRange(m){ const s = [150,300,600,1500,3000,6000,15000,30000,60000,150000,600000]; return s.find(x => x >= m) || 600000; }
function renderStage(){
  if(RT.tab !== 'radar' || document.visibilityState !== 'visible') return;
  demoTick();
  const center = RT.myLoc || (S.settings.demo ? FALLBACK : null);
  const note = $('#stageNote');
  const people = Object.values(S.friends).filter(f => f.status === 'friend' && f.loc && !f.hidden);
  if(RT.mode === 'ar'){ renderAR(center, people); }
  else {
    const box = $('#radarBox'); box.hidden = false; $('#arLayer').hidden = true;
    radarUpdate(box, center, people);
  }
  let msg = '';
  if(!RT.myLoc){ msg = RT.geoErr ? `${esc(RT.geoErr)}${S.settings.demo ? '. نعرض موقعاً تقريبياً للتجربة.' : '.'}` : 'نحدد موقعك…';
    if(RT.geoErr) msg += ` <button class="btn sm pri" data-act="geo-retry">إعادة المحاولة</button>`; }
  else if(!people.length && !(RT.near || []).length){ msg = `لا يظهر أحد بعد. أضف صديقاً برقم VibeMap الخاص به. <button class="btn sm pri" data-act="tab" data-tab="friends">إضافة</button>`; }
  else if(RT.mode === 'ar' && RT.heading == null){ msg = `فعّل البوصلة ليعرف التطبيق اتجاه كاميرتك. <button class="btn sm pri" data-act="compass">تفعيل</button>`; }
  note.hidden = !msg; note.innerHTML = msg;
  renderTalk();
}
/* ════════ v7.7: رادار سلس — العناصر تُبنى مرة وحدة وتتحرك بنعومة، والبوصلة تدوّر طبقة واحدة فقط ════════ */
function radarBuild(box){
  box.innerHTML = `<div class="disc"><div class="sweep"></div>${[1/3, 2/3, 1].map(r => `<div class="ringl" style="width:${r*96}%;height:${r*96}%"></div>`).join('')}
    <div class="axis" style="left:50%;top:2%;bottom:2%;width:1px"></div><div class="axis" style="top:50%;left:2%;right:2%;height:1px"></div></div>
    ${[1/3, 2/3, 1].map((r, i) => `<div class="rlabel" id="rl${i}" style="top:${50 + r*48}%"></div>`).join('')}
    <div class="rotor" id="rotor"><div class="north"><span>N</span></div><div id="rItems"></div></div>
    <div class="me-cone" id="meCone" hidden></div><div class="me-dot" title="أنت"></div><div id="meBub"></div>
    <div class="rzoom"><button data-act="zoom" data-z="in" aria-label="تقريب">＋</button><button data-act="zoom" data-z="auto" id="zAuto" class="${RT.zoom ? '' : 'on'}" aria-label="تكبير تلقائي">A</button><button data-act="zoom" data-z="out" aria-label="تبعيد">－</button></div>`;
  box._built = true; box._items = {}; radarGestures(box);
}
/* دوران البوصلة: نحدّث الاتجاه بضع مرات في الثانية فقط، والانتقال الناعم بينها يسويه معالج الرسوم (بدون تشغيل المعالج كل إطار) */
function radarHeading(){
  if(RT.hTimer) return;
  const apply = () => {
    RT.hTimer = 0; const rot = $('#rotor');
    if(!rot || RT.tab !== 'radar' || RT.mode !== 'radar' || document.visibilityState !== 'visible') return;
    const target = RT.heading == null ? 0 : RT.heading;
    if(RT.hDraw == null){ RT.hDraw = target; RT.hUnw = target; }
    const d = norm180(target - RT.hDraw); if(Math.abs(d) < .5 && RT.hInit) return;
    RT.hUnw += d; RT.hDraw = target; RT.hInit = true; /* زاوية متصلة بدون قفزة 359→0 */
    rot.style.transform = `rotate(${(-RT.hUnw).toFixed(1)}deg)`; rot.style.setProperty('--hc', `${RT.hUnw.toFixed(1)}deg`);
    const cone = $('#meCone'); if(cone) cone.hidden = RT.heading == null;
  };
  RT.hTimer = setTimeout(apply, S.settings.eco ? 220 : 120);
}
function thumbOf(s){
  if(s.t !== 'photo' || !s.data) return null;
  if(RT.thumbs && RT.thumbs[s.id]) return RT.thumbs[s.id];
  RT.thumbs = RT.thumbs || {}; RT.thumbs[s.id] = '';
  const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 240; c.height = 320; const g = c.getContext('2d');
    const sc = Math.max(240 / im.width, 320 / im.height); g.drawImage(im, (240 - im.width * sc) / 2, (320 - im.height * sc) / 2, im.width * sc, im.height * sc);
    RT.thumbs[s.id] = c.toDataURL('image/jpeg', .7); const el = document.querySelector(`.spin[data-id="${CSS.escape(s.id)}"]`); if(el) el.style.backgroundImage = `url('${RT.thumbs[s.id]}')`;
    if(RT.tab === 'stories'){ clearTimeout(RT.thT); RT.thT = setTimeout(() => { const v = $('#v-stories'); if(v) v._h = null; renderStoriesTab(); }, 60); } };
  im.src = s.data; return '';
}
/* يباعد الفقاعات المتلاصقة حتى لا تغطي بعضها */
function declutter(items, minD){
  for(let it = 0; it < 6; it++){ let moved = false;
    for(let i = 0; i < items.length; i++) for(let j = i + 1; j < items.length; j++){
      const a = items[i], b = items[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      const need = (a.r || minD) / 2 + (b.r || minD) / 2; if(d >= need) continue;
      if(d < .01){ dx = Math.cos(i + j); dy = Math.sin(i + j); d = 1; }
      const push = (need - d) / (a.fixed || b.fixed ? 1 : 2);
      if(!a.fixed){ a.x -= dx / d * push; a.y -= dy / d * push; } if(!b.fixed){ b.x += dx / d * push; b.y += dy / d * push; } moved = true; }
    if(!moved) break; }
  items.forEach(p => { if(p.fixed) return; const r = Math.hypot(p.x - 50, p.y - 50); if(r > 47){ p.x = 50 + (p.x - 50) * 47 / r; p.y = 50 + (p.y - 50) * 47 / r; } });
}
function radarUpdate(box, center, people){
  if(!box._built) radarBuild(box);
  const dists = center ? people.map(f => distance(center, f.loc)) : [];
  const near = center && !S.settings.hideNear ? (RT.near || []) : [];
  const nd = near.map(x => distance(center, x.loc)).filter(d => d <= 2000);
  const range = RT.zoom || niceRange(Math.max(150, ...dists.map(d => d * 1.15), ...nd.map(d => d * 1.1)));
  if(box._range !== range){ box._range = range; [1/3, 2/3, 1].forEach((r, i) => { const l = $('#rl' + i); if(l) l.textContent = fmtDist(range * r); }); }
  const pos = (loc) => { const d = distance(center, loc), b = bearing(center, loc), r = Math.min(1, d / range) * 46; return { d, x:50 + r * Math.sin(rad(b)), y:50 - r * Math.cos(rad(b)) }; };
  const want = [];
  if(center){
    const blips = people.map(f => { const p = pos(f.loc); return { key:'b:' + f.pin, kind:'blip', f, ...p, r:19 }; });
    near.forEach(x => { const p = pos(x.loc); if(p.d <= range * 1.02) blips.push({ key:'n:' + x.pin, kind:'stranger', nr:x, ...p, d:x.d || p.d, r:16 }); });
    const pins = [];
    Object.values(S.friends).filter(f => f.status === 'friend' && !f.muteStories).forEach(f => friendStories(f.pin).forEach(x => { if(x.loc && !(f.loc && !f.hidden && distance(f.loc, x.loc) < 40)) pins.push({ pin:f.pin, s:x }); }));
    activeMine().forEach(x => { if(x.loc && distance(center, x.loc) >= 40) pins.push({ pin:'me', s:x }); });
    const pinItems = pins.sort((a, b) => b.s.ts - a.s.ts).slice(0, 12).map(({ pin, s }) => ({ key:'p:' + s.id, kind:'pin', pin, s, ...pos(s.loc), r:8 }));
    const all = [...blips, ...pinItems], me = { x:50, y:50, r:9, fixed:true }; declutter([me, ...all], 10); want.push(...all);
  }
  const L = $('#rItems'), seen = new Set();
  want.forEach(it => {
    seen.add(it.key); let el = box._items[it.key];
    let sig, cls, html;
    if(it.kind === 'blip'){ const f = it.f, st = f.muteStories ? [] : friendStories(f.pin), latest = st[st.length - 1];
      const on = isOnline(f.pin), talk = RT.rxTalking.has(f.pin);
      cls = ['blip', on ? 'on' : 'off', talk ? 'talk' : '', f.sos ? 'sos' : '', !f.muteStories && hasUnseen(f.pin) ? 'story' : '', RT.poked && now() - (RT.poked[f.pin] || 0) < 4000 ? 'poked' : ''].join(' ');
      html = `<span class="bin">${latest ? `<span class="sbub ${latest.seen ? 'seen' : ''}"><b>${esc(storyShort(latest))}</b></span>` : ''}<span class="av" style="${avCss(f)}">${esc(initial(f.name))}${talk ? '<i class="wave"></i>' : ''}<i class="dot"></i></span><span class="lab">${esc(f.name.split(' ')[0])}<small>${fmtDist(it.d)}</small></span></span>`;
      sig = cls + html;
      if(!el){ el = document.createElement('button'); el.dataset.act = 'friend'; el.dataset.pin = f.pin; L.appendChild(el); box._items[it.key] = el; }
      el.setAttribute('aria-label', `${f.name} على بعد ${fmtDist(it.d)}`);
    } else if(it.kind === 'stranger'){ const x = it.nr;
      cls = 'blip stranger'; html = `<span class="bin"><span class="av" style="background:${x.c}">${esc(initial(x.n))}</span><span class="lab">${esc(x.n.split(' ')[0])}<small>~${fmtDist(it.d)}</small></span></span>`; sig = cls + html;
      if(!el){ el = document.createElement('button'); el.dataset.act = 'stranger'; el.dataset.pin = x.pin; L.appendChild(el); box._items[it.key] = el; }
      el.setAttribute('aria-label', `${x.n} (ظاهر للجميع) تقريباً ${fmtDist(it.d)}`);
    } else { const s = it.s, th = thumbOf(s);
      cls = `spin ${it.pin !== 'me' && !s.seen ? 'new' : ''} ${s.t === 'photo' ? 'ph' : ''}`;
      html = `<span class="bin">${s.t === 'photo' ? '' : '💬'}</span>`; sig = cls;
      if(!el){ el = document.createElement('button'); el.dataset.act = 'story-open'; el.dataset.pin = it.pin; el.dataset.id = s.id; el.setAttribute('aria-label', 'حالة');
        el.style.background = s.t === 'photo' ? '#222' : (SBG[s.bg] || SBG[0]); if(th) el.style.backgroundImage = `url('${th}')`; L.appendChild(el); box._items[it.key] = el; } }
    if(el._sig !== sig){ el.className = cls; el.innerHTML = html; el._sig = sig; }
    const lx = it.x.toFixed(1) + '%', ly = it.y.toFixed(1) + '%'; if(el.style.left !== lx) el.style.left = lx; if(el.style.top !== ly) el.style.top = ly;
  });
  Object.keys(box._items).forEach(k => { if(!seen.has(k)){ box._items[k].remove(); delete box._items[k]; } });
  const mb = $('#meBub'); if(mb){ const mine = activeMine(), last = mine[mine.length - 1];
    const h = last && S.settings.storiesOn ? `<button class="sbub me-bub" data-act="story-open" data-pin="me"><b>${esc(storyShort(last))}</b></button>` : ''; if(mb._h !== h){ mb.innerHTML = h; mb._h = h; } }
  radarHeading();
}

function renderAR(center, people){
  $('#radarBox').hidden = true; const L = $('#arLayer'); L.hidden = false;
  if(!center || RT.heading == null){ L.innerHTML = RT.heading == null ? '' : ''; if(RT.heading == null){ L.innerHTML = '<div class="arhud">البوصلة غير مفعّلة</div>'; } return; }
  const FOV = 30; let html = `<div class="arhud">${Math.round(RT.heading)}°</div>`;
  people.forEach(f => {
    const d = distance(center, f.loc), rel = norm180(bearing(center, f.loc) - RT.heading);
    const on = isOnline(f.pin);
    if(Math.abs(rel) <= FOV){
      const x = 50 + rel / FOV * 45, near = 1 - Math.min(d, 3000) / 3000, size = Math.round(46 + near * 44), y = 42 + near * 18;
      html += `<button class="orb ${RT.rxTalking.has(f.pin) ? 'talk' : ''}" style="left:${x}%;top:${y}%;color:${f.sos ? '#FF4D5E' : f.color}" data-act="friend" data-pin="${f.pin}">
        <span class="ball" style="width:${size}px;height:${size}px;background:${f.sos ? '#FF4D5E' : f.color};font-size:${Math.round(size/2.6)}px;opacity:${on ? 1 : .55}">${esc(initial(f.name))}</span>
        <span class="tag">${esc(f.name.split(' ')[0])}<small>${fmtDist(d)}</small></span></button>`;
    } else {
      const left = rel < 0; html += `<button class="edge" style="left:${left ? 12 : 88}%;top:${30 + (people.indexOf(f) % 5) * 9}%;pointer-events:auto" data-act="friend" data-pin="${f.pin}">${left ? '◀ ' : ''}${esc(f.name.split(' ')[0])} <span class="mono">${fmtDist(d)}</span>${left ? '' : ' ▶'}</button>`;
    }
  });
  L.innerHTML = html;
}
async function startAR(){
  RT.mode = 'ar'; renderToolbar();
  const v = $('#arVideo'); $('#stage').classList.add('ar');
  if(!RT.camStream){
    try{ RT.camStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:'environment' } }, audio:false }); }
    catch(e){ toast('تعذّر فتح الكاميرا. اسمح بها من إعدادات المتصفح.'); stopAR(); return; }
  }
  v.srcObject = RT.camStream; v.hidden = false; v.play().catch(() => {});
  if(RT.heading == null) enableCompass();
  renderStage();
}
function stopAR(){
  if(RT.camStream){ RT.camStream.getTracks().forEach(t => t.stop()); RT.camStream = null; }
  const v = $('#arVideo'); v.srcObject = null; v.hidden = true; $('#stage').classList.remove('ar');
  if(RT.tab === 'radar' && RT.mode === 'ar'){ RT.mode = 'radar'; }
  renderToolbar(); renderStage();
}

/* ─── المحادثات ─── */
function renderChats(){
  const lastOf = c => (MSG[c] || []).filter(m => m.from !== 'sys').slice(-1)[0];
  const list = [
    ...Object.values(S.rooms).map(r => { const c = 'R:' + r.id, last = lastOf(c); return { c, r, last, t: last ? last.ts : r.created || 0 }; }),
    ...Object.values(S.friends).filter(f => f.status === 'friend').map(f => { const last = lastOf(f.pin); return { c:f.pin, f, last, t: last ? last.ts : f.added || 0 }; })
  ].sort((a, b) => b.t - a.t);
  let h = `<div class="pad"><div class="h1">المحادثات</div><div class="storybar" id="storyBarC" style="padding:0 0 4px">${storyBarHtml()}</div>
    <button class="btn block" data-act="room-new">${I.plus}غرفة جديدة</button>`;
  if(!list.length) h += `<div class="card empty"><b>لا توجد محادثات</b>أضف صديقاً من تبويب الأصدقاء لتبدأ.</div>`;
  else { h += `<div class="card list">`;
    list.forEach(({ c, f, r, last }) => { const u = unread(c);
      const who = last && r && last.from === 'them' ? esc((last.sname || '').split(' ')[0]) + ': ' : '';
      const av = r ? `<span class="av" style="background:${r.color};font-size:20px">${esc(r.emoji)}</span>` : `<span class="av" style="${avCss(f)}">${esc(initial(f.name))}<i class="st ${isOnline(f.pin) ? 'on' : ''}"></i></span>`;
      const title = r ? `${esc(r.name)} <span class="pill">${r.members.length} أعضاء</span>` : `${esc(f.name)} ${f.demo ? '<span class="pill demo">تجريبي</span>' : ''}`;
      const mute = (r || f).mute ? ' 🔕' : '';
      h += `<button class="row" data-act="chat" data-pin="${esc(c)}">${av}
      <span class="grow"><span class="t1" style="display:block">${title}${mute}</span>
      <span class="t2" style="display:block">${last ? (last.from === 'me' ? 'أنت: ' : who) + esc(msgLabel(last)) : r ? 'ابدأوا الحديث في الغرفة' : 'ابدأ المحادثة'}</span></span>
      <span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="t2 num">${last ? fmtTime(last.ts) : ''}</span>${u ? `<span class="badge num">${u}</span>` : ''}</span></button>`; });
    h += `</div>`; }
  h += `<p class="note">${I.lock.replace('<svg','<svg style="width:16px;height:16px;display:inline;vertical-align:-3px"')} الرسائل والصور والصوت مشفّرة بينك وبين أصدقائك، ولا تُحفظ إلا على أجهزتكم.</p></div>`;
  $('#v-chats').innerHTML = h;
}
function openChat(pin){ RT.chatWith = pin; $('#chatView').hidden = false; markRead(pin); renderChat(); renderTabs();
  setTimeout(() => { const i = $('#chatInput'); if(i && matchMedia('(pointer:fine)').matches) i.focus(); }, 50); }
function closeChat(){ RT.chatWith = null; const el = $('#chatView'); el.hidden = true; el.dataset.pin = ''; el.innerHTML = ''; renderAll(); }
function renderChatIfOpen(pin){ if(RT.chatWith === pin) renderChat(); }
function chatMsgsHtml(pin){
  const room = isRoom(pin), on = room ? convTargets(pin).length > 0 : isOnline(pin);
  const head = room ? 'غرفة مشفّرة: كل رسالة تُشفّر لكل عضو على حدة' : 'مشفّرة بين الطرفين';
  return `<div class="sys">${I.lock.replace('<svg','<svg style="width:13px;height:13px;display:inline;vertical-align:-2px"')} ${head}${on ? '' : ' · ستُرسل الرسائل عندما يتصلون'}</div>` + (MSG[pin] || []).map(m => {
    if(m.from === 'sys') return `<div class="sys">${esc(m.text)}</div>`;
    const me = m.from === 'me';
    if(m.type === 'voice') return voiceBubble(pin, m);
    const st = me ? tickHtml(m.st) : '';
    const ttlTxt = m.ttl === '24h' ? '24س' : m.ttl === 'read' ? (m.readAt ? `يختفي خلال ${Math.max(0, Math.ceil((10000 - (now() - m.readAt)) / 1000))}ث` : 'يختفي بعد القراءة') : '';
    const snd = room && !me ? `<div class="snd" style="color:${senderColor(m.sender)}">${esc(m.sname || '')}</div>` : '';
    return `<div class="bub ${me ? 'me' : ''}">${snd}${m.type === 'photo' ? (V.photo(m.data) ? `<img src="${esc(m.data)}" alt="صورة">` : '<i>صورة غير صالحة</i>') : esc(m.text)}<div class="meta"><span class="ttl">${ttlTxt}</span><span>${fmtTime(m.ts)}</span><span>${st}</span></div></div>`;
  }).join('');
}
function renderChat(){
  const pin = RT.chatWith; if(!pin) return; const ci = convInfo(pin); if(!ci){ closeChat(); return; }
  const el = $('#chatView'); const ttl = ci.ttl; const room = ci.room;
  if(el.dataset.pin !== pin || !$('#msgs')){
    el.dataset.pin = pin;
    el.innerHTML = `<div class="chead"><button class="iconbtn" data-act="chat-close" aria-label="رجوع">${I.back}</button>
      <${room ? 'span' : 'button'} class="av" id="chatAv" ${room ? '' : `data-act="av-open" data-pin="${esc(pin)}" aria-label="عرض الصورة"`} style="${room ? 'background:' + ci.color + ';font-size:20px' : avCss(ci.f)}">${room ? esc(ci.emoji) : esc(initial(ci.name))}<i class="st"></i></${room ? 'span' : 'button'}>
      <button class="grow" style="text-align:start" data-act="${room ? 'conv-set' : 'friend'}" data-pin="${esc(pin)}"><span class="t1" id="chatName" style="display:block"></span><span class="t2" id="chatSt" style="display:block"></span></button>
      ${room ? '' : `<button class="iconbtn" data-act="poke" data-pin="${esc(pin)}" aria-label="وكز" style="font-size:18px">👉</button>`}
      <button class="iconbtn sosmini" data-act="chat-sos" aria-label="إرسال استغاثة لهذه المحادثة">SOS</button>
      <button class="iconbtn" data-act="conv-set" data-pin="${esc(pin)}" aria-label="تخصيص المحادثة">${I.gear}</button></div>
      <div class="ttlbar" id="ttlbar"></div>
      <div class="msgs" id="msgs"></div>
      <form class="composer" id="composer" autocomplete="off">
        <button type="button" class="iconbtn" data-act="photo" aria-label="إرسال صورة">${I.cam}</button>
        <span class="grow cwrap"><input class="input" id="chatInput" placeholder="اكتب رسالة" enterkeyhint="send"><span id="recInfo" class="recinfo" hidden></span></span>
        <button type="button" class="iconbtn mic" id="micBtn" aria-label="اضغط مطولاً للتحدث وتسجيل رسالة صوتية">${I.mic}</button>
        <button type="submit" class="iconbtn send" aria-label="إرسال">${I.send}</button></form>`;
    $('#composer').onsubmit = e => { e.preventDefault(); const i = $('#chatInput'); const v = i.value; i.value = ''; sendChat(RT.chatWith, v); i.focus(); };
    bindMic($('#micBtn'));
  }
  $('#chatName').textContent = ci.name;
  const talkers = [...RT.rxTalking].filter(p => room ? ci.r.members.includes(p) : p === pin);
  $('#chatSt').textContent = talkers.length ? `🔊 ${talkers.map(p => memberName(ci.r, p).split(' ')[0]).join('، ')} يتحدث الآن` : ci.sub;
  $('#chatAv .st').className = 'st' + ((room ? convTargets(pin).length : ci.on) ? ' on' : '');
  $('#msgs').style.background = WALLS[ci.wall] || 'none';
  $('#ttlbar').innerHTML = `<span>مدة الرسائل:</span>` + ['read','24h','keep'].map(k => `<button class="${ttl === k ? 'on' : ''}" data-act="ttl" data-ttl="${k}">${TTL_LABEL[k]}</button>`).join('');
  const box = $('#msgs'); const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  const html = chatMsgsHtml(pin);
  if(box._html !== html){ box.innerHTML = html; box._html = html; if(atBottom || !box._init){ box.scrollTop = box.scrollHeight; box._init = true; box.querySelectorAll('img').forEach(im => im.onload = () => { box.scrollTop = box.scrollHeight; }); } }
}

/* ─── الأصدقاء ─── */
function renderFriends(){
  const all = Object.values(S.friends);
  const req = all.filter(f => f.status === 'in'), out = all.filter(f => f.status === 'out'), fr = all.filter(f => f.status === 'friend');
  const c = RT.myLoc || (S.settings.demo ? FALLBACK : null);
  let h = `<div class="pad"><div class="h1">الأصدقاء</div>
  <div class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px">
    <label for="addPin" class="t1">إضافة صديق برقمه</label>
    <form class="field" id="addForm"><input class="input mono" id="addPin" placeholder="VM-XXXX-XXXX" maxlength="12" autocapitalize="characters" spellcheck="false"><button class="btn pri" type="submit">${I.plus}إضافة</button></form>
    <div class="btns"><button class="btn" data-act="scan">${I.qr}مسح رمز QR</button><button class="btn" data-act="mycard">${I.share}شارك رقمي</button></div>
  </div>`;
  if(req.length){ h += `<div class="h2">طلبات صداقة</div><div class="card list">`;
    req.forEach(f => { h += `<div class="row"><span class="av" style="${avCss(f)}">${esc(initial(f.name))}</span><span class="grow"><span class="t1" style="display:block">${esc(f.name)}${badge(f)}</span><span class="t2" style="display:block">${f.hidePin ? `من «${esc((S.rooms[f.via] || {}).name || "غرفة")}»` : f.fromPub ? '🌍 من الناس القريبين' : `<span class="mono">${f.pin}</span>`}</span>${f.bio && f.bio.about ? `<span class="t2" style="display:block;white-space:normal">${esc(f.bio.about)}</span>` : ''}${f.reqVoice ? `<button class="btn sm" data-act="req-play" data-pin="${f.pin}" style="margin-top:6px">▶ سماع الفويس ${f.reqDur ? fmtDur(f.reqDur) : ''}</button>` : ''}</span>
      <button class="btn sm pri" data-act="accept" data-pin="${f.pin}">قبول</button><button class="btn sm" data-act="decline" data-pin="${f.pin}">رفض</button><button class="btn sm danger" data-act="block" data-pin="${f.pin}">حظر</button></div>`; });
    h += `</div>`; }
  h += `<div class="h2">أصدقائي (${fr.length})</div>`;
  if(!fr.length) h += `<div class="card empty"><b>لا يوجد أصدقاء بعد</b>شارك رقمك أو رمز QR مع من تحب ليضيفك.</div>`;
  else { h += `<div class="card list">`;
    fr.sort((a, b) => isOnline(b.pin) - isOnline(a.pin)).forEach(f => { const d = c && f.loc && !f.hidden ? distance(c, f.loc) : null; const on = isOnline(f.pin);
      h += `<button class="row" data-act="friend" data-pin="${f.pin}"><span class="av" style="${avCss(f)}">${esc(initial(f.name))}<i class="st ${on ? 'on' : ''}"></i></span>
      <span class="grow"><span class="t1" style="display:block">${esc(f.name)}${badge(f)} ${f.demo ? '<span class="pill demo">تجريبي</span>' : ''}</span>
      <span class="t2" style="display:block">${on ? 'متصل' : fmtAgo(f.seen)}${f.hidden ? ' · مخفي' : d != null ? ' · ' + fmtDist(d) : ''}</span></span>
      ${RT.rxTalking.has(f.pin) ? '<span class="pill ok">يتحدث</span>' : ''}</button>`; });
    h += `</div>`; }
  if(out.length){ h += `<div class="h2">بانتظار القبول</div><div class="card list">`;
    out.forEach(f => { h += `<div class="row"><span class="av" style="${avCss(f)}">${f.hidePin ? esc(initial(f.name)) : '…'}</span><span class="grow"><span class="t1 ${f.hidePin ? '' : 'mono'}" style="display:block">${f.hidePin ? esc(f.name) : f.pin}</span><span class="t2" style="display:block">${f.rq === 'retry' || f.rq === 'wait' ? '⏳ جاري الإرسال — نعيد المحاولة تلقائياً' : '✓ وصله الطلب، بانتظار موافقته'}</span></span><button class="btn sm" data-act="cancel-req" data-pin="${f.pin}">إلغاء</button></div>`; });
    h += `</div>`; }
  h += `</div>`;
  $('#v-friends').innerHTML = h;
  $('#addForm').onsubmit = e => { e.preventDefault(); if(addFriendByPin($('#addPin').value)) $('#addPin').value = ''; };
}

/* ─── حسابي ─── */
function renderMe(){
  const st = S.settings, r = myRep();
  const std = IS_NATIVE || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const notif = IS_NATIVE ? (RT.lnPerm || 'default') : 'Notification' in window ? Notification.permission : 'unsupported';
  const sw = (on, act) => `<button class="switch" role="switch" aria-checked="${on}" data-act="${act}" aria-label="تبديل"></button>`;
  let h = `<div class="pad"><div class="h1">حسابي</div>
  <div class="pincard"><div><div class="lbl">رقم VIBEMAP الخاص بك</div><div class="pin">${S.me.pin}</div><div class="nm">${esc(S.me.name)}${badge(S.me)}</div>
    <div class="btns" style="margin-top:12px"><button class="btn sm" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.2)" data-act="copy-pin">${I.copy}نسخ</button><button class="btn sm" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.2)" data-act="share-pin">${I.share}مشاركة</button></div></div>
    <button class="qr" data-act="mycard" aria-label="تكبير رمز QR">${qrSvg(inviteUrl())}</button></div>`;
  if(!std) h += `<div class="note"><b>ثبّت VibeMap على شاشتك الرئيسية</b><br>${ios ? 'في Safari اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية». هذا يلزم لاستلام الإشعارات على الآيفون.' : 'افتح قائمة المتصفح ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'}${RT.installEvt ? ' <button class="btn sm pri" data-act="install">تثبيت الآن</button>' : ''}</div>`;
  h += `<div class="h2">مستواي</div>${levelCard()}<div class="h2">نبذة عني</div>${bioForm()}`;
  h += `<div class="h2">سمعتي عند أصدقائي</div><div class="card" style="padding:14px">${r ? `<div class="rate">${[['t','المصداقية'],['e','التفاعل'],['h','المساعدة']].map(([k, n]) => `<div class="rrow"><span>${n}</span><span class="bar"><i style="width:${r[k] / 5 * 100}%"></i></span><span class="num">${r[k].toFixed(1)}</span></div>`).join('')}<div class="t2">من ${r.n} ${r.n === 1 ? 'تقييم' : 'تقييمات'}</div></div>` : '<div class="t2" style="white-space:normal">لا توجد تقييمات بعد. يستطيع أصدقاؤك تقييمك من صفحتك لديهم.</div>'}</div>
  <div class="h2">الملف الشخصي</div><div class="card list">
    <div class="set"><span class="av" style="${avCss(S.me)};width:56px;height:56px;font-size:22px">${esc(initial(S.me.name))}</span><span class="grow"><span class="t1" style="display:block">صورتك</span><span class="t2" style="display:block">تظهر لأصدقائك على الرادار وفي المحادثات</span></span>
      <div class="btns" style="flex:none"><button class="btn sm pri" data-act="me-photo">${S.me.photo ? 'تغيير' : 'إضافة صورة'}</button>${S.me.photo ? '<button class="btn sm" data-act="me-photo-del">إزالة</button>' : ''}</div></div>
    <div class="set"><label class="grow" for="nameIn"><span class="t1" style="display:block">الاسم</span></label><input class="input" id="nameIn" style="max-width:55%" value="${esc(S.me.name)}" maxlength="24"></div>
    <div class="set"><span class="grow t1">لونك</span><div class="swatches">${COLORS.slice(0, 6).map(c => `<button style="background:${c}" class="${S.me.color === c ? 'on' : ''}" data-act="color" data-color="${c}" aria-label="لون"></button>`).join('')}</div></div>
  </div>
  ${FB_CFG ? `<div class="h2">الحساب (اختياري)</div><div class="card list">
    <button class="set" data-act="acc-open" style="width:100%;text-align:start"><span class="grow"><span class="t1" style="display:block">${S.account ? `<bdi>${esc(S.account.label)}</bdi>` : 'تسجيل الدخول'}</span><span class="t2" style="display:block">${S.account ? (S.account.salt ? 'نسخة احتياطية مشفّرة' + (S.account.lastBk ? ' · آخرها ' + fmtAgo(S.account.lastBk) : '') : 'فعّل النسخ الاحتياطي') : (acProviders().google ? 'Google أو البريد' + (acProviders().phone ? ' أو الجوال' : '') : 'البريد' + (acProviders().phone ? ' أو الجوال' : '')) + ' — لحفظ نسخة احتياطية من حسابك'}</span></span><span class="t2 chev">‹</span></button>
  </div>` : ''}
  <div class="h2">الأداء وحرارة الجهاز</div><div class="card list">
    <div class="set"><span class="grow"><span class="t1" style="display:block">توفير الطاقة</span><span class="t2" style="display:block">${st.eco ? 'مفعّل: GPS دقيق فقط والرادار أمامك، رسم أقل، بدون حركة مستمرة — الجوال يبرد والبطارية تطول' : 'متوقف: أعلى دقة وتحديث أسرع، لكن الجوال يسخن أسرع'}</span></span>${sw(st.eco, 'eco')}</div>
  </div>
  ${bgSection()}
  ${pttKeySection()}
  <div class="h2">الحالات</div><div class="card list">
    <div class="set"><span class="grow"><span class="t1" style="display:block">إظهار حالاتي لأصدقائي</span><span class="t2" style="display:block">${st.storiesOn ? 'تظهر حالاتك 24 ساعة على رادار أصدقائك' : 'حالاتك مخفية عن الجميع الآن'}${Object.values(S.friends).filter(f => f.hideStories).length ? ` · مخفية عن ${Object.values(S.friends).filter(f => f.hideStories).length} من الأصدقاء` : ''}</span></span>${sw(st.storiesOn, 'stories-toggle')}</div>
    <div class="set"><span class="grow"><span class="t1" style="display:block">حالاتي النشطة: ${activeMine().length}</span></span><button class="btn sm pri" data-act="story-new">+ حالة</button></div>
  </div>
  <div class="h2">الإعدادات</div><div class="card list">
    <div class="set"><span class="grow"><span class="t1" style="display:block">المظهر</span></span><div class="segs">${[['system','النظام'],['dark','داكن'],['light','فاتح']].map(([k, n]) => `<button class="${st.theme === k ? 'on' : ''}" data-act="theme" data-theme="${k}">${n}</button>`).join('')}</div></div>
    <div class="set"><span class="grow"><span class="t1" style="display:block">اللغة</span><span class="t2" style="display:block;white-space:normal">${(st.lang || 'auto') === 'auto' ? 'تتبع لغة جهازك تلقائياً' : 'اخترتها أنت'}</span></span><div class="segs" translate="no">${[['auto','🌐'],['ar','عربي'],['en','EN']].map(([k, n]) => `<button class="${(st.lang || 'auto') === k ? 'on' : ''}" data-act="lang" data-lang="${k}" aria-label="${k === 'auto' ? 'لغة الجهاز' : k === 'ar' ? 'العربية' : 'English'}">${n}</button>`).join('')}</div></div>
    <div class="set"><span class="grow"><span class="t1" style="display:block">مدة الرسائل الافتراضية</span></span><div class="segs">${['read','24h','keep'].map(k => `<button class="${st.ttl === k ? 'on' : ''}" data-act="def-ttl" data-ttl="${k}">${k === 'read' ? 'بعد القراءة' : k === '24h' ? '24 ساعة' : 'دائم'}</button>`).join('')}</div></div>
    <div class="set"><span class="grow"><span class="t1" style="display:block">وضع التخفي</span><span class="t2" style="display:block">يخفي موقعك عن الجميع، وتبقى قادراً على السماع والتحدث</span></span>${sw(st.ghost, 'ghost')}</div>
    <div class="set"><span class="grow"><span class="t1" style="display:block">الإشعارات</span><span class="t2" style="display:block">${notif === 'granted' ? 'مفعّلة' : notif === 'denied' ? 'مرفوضة، فعّلها من إعدادات الجهاز' : notif === 'unsupported' ? (ios ? 'ثبّت التطبيق على الشاشة الرئيسية أولاً' : 'غير مدعومة في هذا المتصفح') : 'تنبيه عند الرسائل والتحدث والاستغاثة'}</span></span>${notif === 'default' ? '<button class="btn sm pri" data-act="notif">تفعيل</button>' : ''}</div>
    <div class="set"><span class="grow"><span class="t1" style="display:block">نص الرسالة في الإشعار</span><span class="t2" style="display:block">أوقفه ليظهر «رسالة جديدة» فقط على شاشة القفل</span></span>${sw(st.notifPreview, 'notif-preview')}</div>
    <div class="set"><span class="grow"><span class="t1" style="display:block">إبقاء الشاشة مضاءة</span><span class="t2" style="display:block">يحافظ على الاتصال أثناء المشي أو القيادة</span></span>${sw(st.wake, 'wake')}</div>
  </div>

  <div class="h2">تواصل معنا</div><div class="card list">
    <button class="set" data-act="contact" style="width:100%;text-align:start"><span class="grow"><span class="t1" style="display:block">أرسل اقتراحاً أو شكوى أو فكرة</span><span class="t2" style="display:block">توصل رسالتك مباشرة لبريد فريق VibeMap</span></span><span class="t2 chev">‹</span></button>
  </div>
  ${Object.keys(S.blocked).length ? `<div class="h2">المحظورون</div><div class="card list">${Object.entries(S.blocked).map(([p, x]) => `<div class="set"><span class="grow"><span class="t1" style="display:block">${esc(x.name)}</span>${x.hidePin ? '' : `<span class="t2 mono" style="display:block">${esc(p)}</span>`}</span><button class="btn sm" data-act="unblock" data-pin="${esc(p)}">إلغاء الحظر</button></div>`).join('')}</div>` : ''}
  <div class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px"><div class="t1">حذف الحساب من هذا الجهاز</div><div class="t2" style="white-space:normal">يحذف رقمك ومفاتيح التشفير والأصدقاء والرسائل. لا يمكن التراجع.</div>
    <div id="resetBox"><button class="btn danger" data-act="reset-ask">حذف كل شيء</button></div></div>
  ${st.dev ? `<div class="h2">خيارات متقدمة</div>
  ${diagSection()}
  <div class="card list">    <div class="set"><span class="grow"><span class="t1" style="display:block">الوضع التجريبي</span><span class="t2" style="display:block">يضيف «صدى» لاختبار صوتك و«سارة» لتجربة الرادار والمحادثة</span></span>${sw(st.demo, 'demo')}</div>
</div>
  <details class="card" style="padding:14px"><summary class="t1" style="cursor:pointer">إعدادات الاتصال المتقدمة (TURN)</summary>
    <p class="t2" style="white-space:normal;margin:10px 0">يعمل الاتصال مباشرة بين الجوالات. إذا لم يسمع أحدكما الآخر على شبكة الجوال، أضف خادم TURN مجاني (مثل Metered) وضع بياناته هنا على الجهازين.</p>
    <form id="turnForm" style="display:flex;flex-direction:column;gap:8px"><input class="input" id="turnUrl" dir="ltr" placeholder="turn:relay.example.com:443" value="${esc(st.turnUrl)}"><input class="input" id="turnUser" dir="ltr" placeholder="username" value="${esc(st.turnUser)}"><input class="input" id="turnPass" dir="ltr" placeholder="credential" type="password" value="${esc(st.turnPass)}"><button class="btn pri" type="submit">حفظ وإعادة الاتصال</button></form>
    <div class="set" style="padding:12px 0 0;border:0"><span class="grow"><span class="t1" style="display:block">إخفاء عنوان IP عن الأصدقاء</span><span class="t2" style="display:block">يمرّر الصوت عبر خادم TURN فقط. يحتاج خادم TURN أعلاه.</span></span>${st.turnUrl ? sw(st.relayOnly, 'relay') : '<span class="t2">أضف TURN أولاً</span>'}</div></details>
  <button class="btn sm" data-act="dev-off" style="align-self:center">إخفاء الخيارات المتقدمة</button>` : ''}
  ${aboutCard()}
  <p class="t2" style="text-align:center;white-space:normal"><span data-act="ver-tap" style="cursor:default;user-select:none">VibeMap ${VERSION}</span> · <a href="privacy.html" style="color:var(--accent)">سياسة الخصوصية</a></p></div>`;
  $('#v-me').innerHTML = h; fillRoutes();
  $('#nameIn').onchange = e => { const v = e.target.value.trim(); if(v){ S.me.name = v; save(); rehello(); toast('تم حفظ الاسم'); } };
  if($('#turnForm')) $('#turnForm').onsubmit = e => { e.preventDefault(); st.turnUrl = $('#turnUrl').value.trim(); st.turnUser = $('#turnUser').value.trim(); st.turnPass = $('#turnPass').value; save(); RT.conns = {}; RT.outCalls = {}; startPeer(); toast('يعيد الاتصال بالإعدادات الجديدة'); };
}
/* v7.1: تشخيص الاتصال — صورة شاشة منه تكفي لمعرفة سبب أي مشكلة */
const ERR_AR = { network:'لا يوجد إنترنت أو الخادم لا يرد', 'server-error':'خطأ في خادم التعارف', 'socket-error':'انقطع الاتصال بالخادم', 'socket-closed':'أُغلق الاتصال بالخادم', 'unavailable-id':'رقمك محجوز مؤقتاً (يعيد المحاولة)', 'peer-unavailable':'صديق غير متصل الآن', 'browser-incompatible':'الجهاز لا يدعم WebRTC', webrtc:'فشل WebRTC' };
function diagSection(){
  const net = RT.net === 'on' ? '<b style="color:var(--ok)">متصل</b>' : RT.net === 'wait' ? '<b style="color:var(--warn)">يحاول الاتصال…</b>' : '<b style="color:var(--sos)">غير متصل</b>';
  const err = RT.lastErr ? `${ERR_AR[RT.lastErr.type] || RT.lastErr.type} · ${fmtAgo(RT.lastErr.ts)}` : 'لا يوجد';
  const fr = Object.values(S.friends).filter(f => f.status === 'friend' && !isDemo(f.pin));
  const rows = fr.map(f => { const on = isOnline(f.pin), fail = RT.iceFail && RT.iceFail[f.pin];
    const st = on ? `<span style="color:var(--ok)">متصل</span> <span class="t2" data-route="${esc(f.pin)}"></span>` : fail ? '<span style="color:var(--sos)">الشبكة منعت الاتصال المباشر — جرّب واي فاي أو أضف TURN</span>' : '<span class="t2">غير متصل الآن (يجب أن يفتح التطبيق)</span>';
    return `<div class="t2" style="white-space:normal">${esc(f.name)}: ${st}</div>`; }).join('');
  return `<div class="h2" id="diag">تشخيص الاتصال</div><div class="card" style="padding:14px;display:flex;flex-direction:column;gap:6px">
    <div class="t2" style="white-space:normal">خادم التعارف: ${net}</div>
    <div class="t2" style="white-space:normal">آخر خطأ: ${esc(err)}</div>
    <div class="t2" style="white-space:normal">النسخة: v${VERSION} · ${PLATFORM === 'android' ? 'أندرويد' : PLATFORM === 'ios' ? 'آيفون' : 'متصفح'} · WebRTC ${typeof RTCPeerConnection === 'function' ? '✓' : '✗'}</div>
    ${rows || '<div class="t2">أضف صديقاً حقيقياً لرؤية حالة الاتصال معه</div>'}
    <button class="btn sm" data-act="reconnect" style="align-self:flex-start;margin-top:4px">إعادة الاتصال</button></div>`;
}
async function fillRoutes(){ for(const el of document.querySelectorAll('[data-route]')){ const r = await routeOf(el.dataset.route); if(r) el.textContent = r === 'relay' ? '(عبر TURN)' : r === 'lan' ? '(نفس الشبكة)' : '(مباشر)'; } }
/* صورة المستخدم: مربعة 192px تُرسل مشفّرة لكل صديق */
function avatarFrom(file){ return new Promise((res, rej) => { const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => { const z = 192, c = document.createElement('canvas'); c.width = z; c.height = z; const m = Math.min(im.width, im.height);
    c.getContext('2d').drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, z, z); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .8)); };
  im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); }; im.src = url; }); }
function sendAvatar(pin){ if(isDemo(pin)) return; sendEnc(pin, { k:'avatar', data:S.me.photo || '', v:S.me.photoV || 0 }); }
function rehello(){ Object.entries(RT.conns).forEach(([pin, c]) => { if(c.open) c.send({ type:'hello', v:VERSION, pin:S.me.pin, name:S.me.name, color:S.me.color, pub:S.keys.pub, rep:myRep(), lvl:myLevel(), bio:S.me.bio || null }); }); }

/* ─── ورقة الصديق ─── */
function friendSheet(pin){
  const f = S.friends[pin]; if(!f) return '';
  const c = RT.myLoc || (S.settings.demo ? FALLBACK : null);
  const d = c && f.loc && !f.hidden ? distance(c, f.loc) : null, on = isOnline(pin);
  const my = f.myRating || { t:0, e:0, h:0 };
  const stars = (k) => `<div class="stars">${[1,2,3,4,5].map(n => `<button class="${my[k] >= n ? 'on' : ''}" data-act="rate" data-k="${k}" data-n="${n}" aria-label="${n} من 5">${I.star}</button>`).join('')}</div>`;
  return `<div class="grab"></div>
  <div class="shead"><button class="av" data-act="av-open" data-pin="${pin}" aria-label="عرض الصورة" style="${avCss(f)};width:56px;height:56px;font-size:22px">${esc(initial(f.name))}<i class="st ${on ? 'on' : ''}"></i></button>
    <div class="grow"><div class="t1" style="font-size:18px">${esc(f.name)}${badge(f)}</div>${f.hidePin ? '' : `<div class="t2 mono">${f.pin}</div>`}<div class="t2">${on ? 'متصل الآن' : 'آخر ظهور ' + fmtAgo(f.seen)}${f.hidden ? ' · مخفي' : d != null ? ' · على بعد ' + fmtDist(d) : ''}</div></div></div>
  ${f.keyAlert ? `<div class="note" style="border:1px solid var(--sos)"><b style="color:var(--sos)">⚠️ تغيّر رمز الأمان</b><br>قد يكون صديقك أعاد تثبيت التطبيق، وقد يكون شخص آخر ينتحل رقمه. قارنا الرمز الجديد وجهاً لوجه أو باتصال هاتفي قبل المتابعة.<div class="code" style="font-size:16px;margin:10px 0">${esc(f._newCode || '…')}</div><div class="btns"><button class="btn pri" data-act="trust-key" data-pin="${pin}">تحققت، تابع</button><button class="btn danger" data-act="remove-ask" data-pin="${pin}">إزالته</button></div></div>` : ''}
  ${bioHtml(f.bio)}
  <div class="btns"><button class="btn grad" data-act="solo" data-pin="${pin}">${I.mic}التحدث معه فقط</button><button class="btn" data-act="chat" data-pin="${pin}">${I.chat}محادثة</button><button class="btn" data-act="poke" data-pin="${pin}">👉 وكز</button></div>
  ${f.rep ? `<div class="card" style="padding:14px"><div class="t1" style="margin-bottom:8px">سمعته حسب أصدقائه</div><div class="rate">${[['t','المصداقية'],['e','التفاعل'],['h','المساعدة']].map(([k, n]) => `<div class="rrow"><span>${n}</span><span class="bar"><i style="width:${(f.rep[k] || 0) / 5 * 100}%"></i></span><span class="num">${(+f.rep[k] || 0).toFixed(1)}</span></div>`).join('')}</div><div class="t2" style="margin-top:6px">من ${+f.rep.n || 0} تقييم</div></div>` : ''}
  <div class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px"><div class="t1">قيّم ${esc(f.name.split(' ')[0])}</div>
    <div class="rrow" style="grid-template-columns:84px 1fr"><span>المصداقية</span>${stars('t')}</div>
    <div class="rrow" style="grid-template-columns:84px 1fr"><span>التفاعل</span>${stars('e')}</div>
    <div class="rrow" style="grid-template-columns:84px 1fr"><span>المساعدة</span>${stars('h')}</div>
    <button class="btn pri" data-act="rate-send" data-pin="${pin}">إرسال التقييم</button></div>
  ${friendStories(pin).length ? `<button class="btn grad" data-act="story-open" data-pin="${pin}">عرض حالاته (${friendStories(pin).length})</button>` : ''}
  <div class="set card" style="border:1px solid var(--line)"><span class="grow"><span class="t1" style="display:block">كتم حالاته</span><span class="t2" style="display:block">ما تطلع حالاته في الشريط ولا على الرادار</span></span><button class="switch" role="switch" aria-checked="${!!f.muteStories}" data-act="mute-stories" data-pin="${pin}" aria-label="كتم حالاته"></button></div>
  ${f.demo ? '' : `<div class="set card" style="border:1px solid var(--line)"><span class="grow"><span class="t1" style="display:block">إخفاء حالاتي عنه</span><span class="t2" style="display:block">لا يرى حالاتك، ويبقى صديقك في كل شيء آخر</span></span><button class="switch" role="switch" aria-checked="${!!f.hideStories}" data-act="hide-stories" data-pin="${pin}" aria-label="إخفاء حالاتي عنه"></button></div>`}
  <button class="btn" data-act="safety" data-pin="${pin}">${I.lock}رمز الأمان للتحقق من التشفير</button>
  ${f.demo ? '' : `<div class="btns"><button class="btn danger" data-act="block" data-pin="${pin}">حظر</button><button class="btn danger" data-act="report" data-pin="${pin}">حظر وإبلاغ</button></div>`}
  <div id="rmBox"><button class="btn danger block" data-act="remove-ask" data-pin="${pin}">${f.demo ? 'إيقاف الوضع التجريبي' : 'إزالة الصديق'}</button></div>`;
}
let sheetPin = null;
function openSheet(html, pin){ sheetPin = pin || null; $('#sheet').innerHTML = html; $('#sheetWrap').hidden = false; }
function closeSheet(){ $('#sheetWrap').hidden = true; sheetPin = null; stopScan(); }

/* ─── مسح QR ─── */
let scanStream = null, scanRAF = null;
async function openScan(){
  openSheet(`<div class="grab"></div><div class="h1">امسح رمز صديقك</div><div class="scanbox"><video id="scanVid" playsinline muted></video><div class="frame"></div></div><p class="t2" style="white-space:normal;text-align:center">وجّه الكاميرا إلى رمز QR الظاهر في «حسابي» لدى صديقك.</p><button class="btn" data-act="sheet-close">إغلاق</button>`);
  try{ scanStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ ideal:'environment' } }, audio:false }); }
  catch(e){ toast('تعذّر فتح الكاميرا'); closeSheet(); return; }
  const v = $('#scanVid'); v.srcObject = scanStream; await v.play().catch(() => {});
  const det = 'BarcodeDetector' in window ? new BarcodeDetector({ formats:['qr_code'] }) : null;
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently:true });
  const loop = async () => {
    if(!scanStream) return;
    try{
      let text = null;
      if(v.readyState >= 2){
        if(det){ const r = await det.detect(v); if(r[0]) text = r[0].rawValue; }
        else if(typeof jsQR === 'function'){ const w = 480, h = Math.round(v.videoHeight / v.videoWidth * w) || 480; cv.width = w; cv.height = h; cx.drawImage(v, 0, 0, w, h); const r = jsQR(cx.getImageData(0, 0, w, h).data, w, h); if(r) text = r.data; }
      }
      if(text && PIN_RE.test(text)){ vibrate(40); closeSheet(); addFriendByPin(text); return; }
    }catch(e){}
    scanRAF = requestAnimationFrame(loop);
  };
  loop();
}
function stopScan(){ if(scanStream){ scanStream.getTracks().forEach(t => t.stop()); scanStream = null; } cancelAnimationFrame(scanRAF); }

async function sharePin(){
  const text = T(`أضفني في VibeMap برقمي ${S.me.pin}`); const url = inviteUrl();
  if(navigator.share){ try{ await navigator.share({ title:'VibeMap', text, url }); return; }catch(e){ if(e.name === 'AbortError') return; } }
  copyText(`${text}\n${url}`);
}
function copyText(t){ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast('تم النسخ'), () => toast(t)); else toast(t); }

/* ════════ الأحداث ════════ */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if(!b) return;
  const a = b.dataset.act, pin = b.dataset.pin;
  if(/^(acc|bk)-/.test(a)){ acAction(a, b); return; }
  if(featOfAct(a)){ featOff(); return; }
  if(a === 'ann-x'){ if(RT.cfg && RT.cfg.ann){ S.settings.annSeen = RT.cfg.ann.id; save(); } applyCfg(); return; }
  if(a === 'upd-reload'){ location.reload(); return; }
  switch(a){
    case 'tab': closeSheet(); setTab(b.dataset.tab); break;
    case 'mode': if(b.dataset.mode === 'ar') startAR(); else { stopAR(); } break;
    case 'compass': enableCompass(); break;
    case 'target-all': openTargetPicker(); break;
    case 'target-set': { const t = b.dataset.t || null; RT.target = t; closeSheet(); renderToolbar(); renderTalk();
      toast(!t ? 'تتحدث إلى كل الأصدقاء المتصلين' : isRoom(t) ? `تتحدث في غرفة «${(roomOf(t) || {}).name}»` : `تتحدث إلى ${(S.friends[t] || {}).name} فقط`); break; }
    case 'ghost': openSheet(visSheet()); break;
    case 'ghost-quick': S.settings.ghost = !S.settings.ghost; save(); broadcastLoc(true); pubSync(true); renderToolbar(); if(RT.tab === 'me') renderMe(); toast(S.settings.ghost ? 'أنت مخفي الآن عن الرادار' : 'أصدقاؤك يرونك الآن على الرادار'); break;
    case 'vis-set': { const v = b.dataset.v; S.settings.ghost = v === 'hidden'; S.settings.pubVis = v === 'public'; save(); closeSheet(); broadcastLoc(true); pubSync(true); renderToolbar(); if(RT.tab === 'me') renderMe();
      toast(v === 'hidden' ? 'أنت مخفي الآن عن الرادار' : v === 'public' ? '🌍 الناس القريبين يشوفونك الحين' : 'أصدقاؤك بس يشوفونك'); break; }
    case 'near-toggle': S.settings.hideNear = !S.settings.hideNear; save(); nearFetch(true); openSheet(visSheet()); break;
    case 'stranger': { if(!nearOf(pin)) break; openSheet(strangerSheet(pin)); const mb = $('#strMic'); if(mb) bindHoldRec(mb, 30, async v => { toast('يرسل…'); const ok = await strangerRequest(pin, v); toast(ok ? '🎤 وصل الفويس مع طلب الصداقة' : 'تعذّر الإرسال — حاول بعد شوي'); if(ok) openSheet(strangerSheet(pin)); }); break; }
    case 'pub-add': strangerRequest(pin).then(ok => { toast(ok ? 'أُرسل طلب الصداقة ✓' : 'تعذّر الإرسال — حاول بعد شوي'); if(ok && nearOf(pin)) openSheet(strangerSheet(pin)); }); break;
    case 'req-play': playReqVoice(pin); break;
    case 'poke-pick': openSheet(pokeSheet()); break;
    case 'poke': pokeFriend(pin); if(b.closest('#sheet') && !b.closest('.shead')) closeSheet(); break;
    case 'net-set': setOffline(b.dataset.v === 'off'); break;
    case 'diag-open': closeSheet(); setTab('me'); setTimeout(() => { const d = $('#diag'); if(d) d.scrollIntoView({ block:'start', behavior:'smooth' }); }, 60); break;
    case 'bio-save': { S.me.bio = V.bio({ about:$('#bioAbout').value, work:$('#bioWork').value, tags:$('#bioTags').value }); save(); rehello(); pubSync(true); toast('حُفظت نبذتك ✓'); renderMe(); break; }
    case 'av-open': openAvatar(pin); break;
    case 'av-close': closeAvatar(); break;
    case 'sv-react': storyReact(b.dataset.e); break;
    case 'st-seg': RT.stSeg = b.dataset.v; { const v = $('#v-stories'); if(v) v._h = null; } if(RT.stSeg === 'square' && !SQ.loaded) sqLoad(true); renderStoriesTab(); break;
    case 'sq-tag': SQ.tag = b.dataset.tag || ''; RT.stSeg = 'square'; closeSheet(); sqLoad(true); if(RT.tab !== 'stories') setTab('stories'); else renderStoriesTab(); break;
    case 'sq-reload': sqLoad(true); break;
    case 'sq-more': sqLoad(false); break;
    case 'sq-new': openSheet(S.settings.sqRules ? sqComposeSheet() : sqRulesSheet()); break;
    case 'sq-rules-ok': S.settings.sqRules = true; save(); openSheet(sqComposeSheet()); break;
    case 'sq-addtag': { const ta = $('#sqText'); if(ta){ const t = '#' + b.dataset.tag; if(!ta.value.includes(t)) ta.value = (ta.value.trim() + ' ' + t + ' ').trimStart(); ta.focus(); } break; }
    case 'sq-photo': sqPickPhoto(); break;
    case 'sq-photo-x': SQ.photo = null; { const pv = $('#sqPrev'); if(pv) pv.innerHTML = ''; } break;
    case 'sq-send': sqSend(); break;
    case 'sq-like': { const p = SQ.items.find(x => x.id === b.dataset.id); if(!p) break; p.liked = !p.liked; p.likes = Math.max(0, (p.likes || 0) + (p.liked ? 1 : -1)); renderStoriesTab();
      relayPost('/api/sq/like', { id:p.id }).then(j => { if(j && j.ok){ p.likes = j.likes; p.liked = j.liked; renderStoriesTab(); } }); break; }
    case 'sq-menu': openSheet(sqMenuSheet(b.dataset.id)); break;
    case 'sq-report': relayPost('/api/sq/report', { id:b.dataset.id }).then(() => {}); SQ.items = SQ.items.filter(x => x.id !== b.dataset.id); closeSheet(); renderStoriesTab(); toast('شكراً — وصل البلاغ وانخفى المنشور عندك'); break;
    case 'sq-block': { const p = SQ.items.find(x => x.id === b.dataset.id); if(p) blockUser(p.pin, false); closeSheet(); renderStoriesTab(); break; }
    case 'sq-del': { const j = await relayPost('/api/sq/del', { id:b.dataset.id }); if(j && j.ok){ SQ.items = SQ.items.filter(x => x.id !== b.dataset.id); toast('انحذف منشورك'); } closeSheet(); renderStoriesTab(); break; }
    case 'zoom': radarZoom(b.dataset.z); break;
    case 'friend': { if(b.classList.contains('blip') && hasUnseen(pin) && !S.friends[pin]?.sos){ openStories(pin); break; } const f = S.friends[pin]; if(f && f.keyAlert && !f._newCode){ f._newCode = await safetyCode(pin, true); } openSheet(friendSheet(pin), pin); break; }
    case 'trust-key': { const f = S.friends[pin]; if(!f || !f.newPub) break; f.pub = f.newPub; delete f.newPub; delete f._newCode; f.keyAlert = false; save(); markConnOk(pin);
      await deriveFor(pin); sysMsg(pin, 'تم التحقق من رمز الأمان الجديد. عادت الرسائل والصوت.'); if(isOnline(pin)) onFriendOnline(pin); openSheet(friendSheet(pin), pin); renderAll(); break; }
    case 'add-confirm': closeSheet(); addFriendByPin(pin); setTab('friends'); break;
    case 'chat': closeSheet(); openChat(pin); break;
    case 'chat-close': closeChat(); break;
    case 'solo': RT.target = pin; closeSheet(); if(RT.chatWith) closeChat(); setTab('radar'); toast(`زر التحدث موجّه الآن إلى ${S.friends[pin].name} فقط`); break;
    case 'ttl': { const o = roomOf(RT.chatWith) || S.friends[RT.chatWith]; if(!o) break; o.ttl = V.ttl(b.dataset.ttl); save(); renderChat(); toast('الرسائل الجديدة: ' + TTL_LABEL[o.ttl]); break; }
    case 'photo': $('#photoInput').click(); break;
    case 'safety': { const code = await safetyCode(pin); openSheet(`<div class="grab"></div><div class="h1">رمز الأمان مع ${esc(S.friends[pin].name)}</div><div class="code">${code || 'غير متاح حتى يتصل'}</div><p class="note">قارن هذا الرمز مع الرمز الظاهر في جوال صديقك وأنتما معاً. إذا تطابق، فالتشفير بينكما سليم ولا أحد في المنتصف.</p><button class="btn" data-act="sheet-close">تم</button>`); break; }
    case 'rate': { const f = S.friends[sheetPin]; f.myRating = f.myRating || { t:0, e:0, h:0 }; f.myRating[b.dataset.k] = +b.dataset.n; save(); openSheet(friendSheet(sheetPin), sheetPin); break; }
    case 'rate-send': { const f = S.friends[pin]; const r = f.myRating || {}; if(!r.t || !r.e || !r.h){ toast('اختر نجوماً للمعايير الثلاثة'); break; } const ok = await sendEnc(pin, { k:'rate', t:r.t, e:r.e, h:r.h }); toast(ok ? 'أُرسل التقييم' : 'سيصل التقييم عندما يتصل صديقك'); if(!ok){ f.rateQueued = true; save(); } break; }
    case 'remove-ask': $('#rmBox').innerHTML = `<div class="btns"><button class="btn danger" data-act="remove" data-pin="${pin}">تأكيد الإزالة</button><button class="btn" data-act="friend" data-pin="${pin}">تراجع</button></div>`; break;
    case 'remove': removeFriend(pin); break;
    case 'accept': acceptFriend(pin); break;
    case 'decline': declineFriend(pin); break;
    case 'block': blockUser(pin, false); break;
    case 'report': blockUser(pin, true); break;
    case 'unblock': delete S.blocked[pin]; save(); renderMe(); toast('أُلغي الحظر'); break;
    case 'cancel-req': delete S.friends[pin]; save(); try{ RT.conns[pin] && RT.conns[pin].close(); }catch(x){} renderAll(); break;
    case 'scan': openScan(); break;
    case 'mycard': openSheet(`<div class="grab"></div><div class="h1">بطاقتي</div><div class="qr big">${qrSvg(inviteUrl())}</div><div class="code">${S.me.pin}</div><p class="t2" style="white-space:normal;text-align:center">يمسح صديقك الرمز بكاميرا جواله أو من داخل VibeMap، فيصلك طلب صداقة.</p><div class="btns"><button class="btn" data-act="copy-pin">${I.copy}نسخ الرقم</button><button class="btn pri" data-act="share-pin">${I.share}مشاركة</button></div>`); break;
    case 'copy-pin': copyText(S.me.pin); break;
    case 'share-pin': sharePin(); break;
    case 'install': if(RT.installEvt){ RT.installEvt.prompt(); RT.installEvt = null; renderMe(); } break;
    case 'color': S.me.color = b.dataset.color; save(); rehello(); renderMe(); break;
    case 'theme': S.settings.theme = b.dataset.theme; save(); applyTheme(); renderMe(); break;
    case 'lang': { const l = ['auto', 'ar', 'en'].includes(b.dataset.lang) ? b.dataset.lang : 'auto'; S.settings.lang = l; save(); applyLang(); renderAll(); renderMe(); break; }
    case 'def-ttl': S.settings.ttl = b.dataset.ttl; save(); renderMe(); break;
    case 'notif': { const LN = NP('LocalNotifications'); try{ if(LN){ const r = await LN.requestPermissions(); RT.lnPerm = r.display === 'granted' ? 'granted' : 'denied'; } else await Notification.requestPermission(); }catch(x){} renderMe(); break; }
    case 'wake': S.settings.wake = !S.settings.wake; save(); applyWake(); renderMe(); break;
    case 'demo': S.settings.demo = !S.settings.demo; applyDemo(); renderAll(); break;
    case 'ptt-key': { const k = b.dataset.key; if(!pttKeyAvail(k)) break; S.settings.pttKey = k; save(); await hwApply(); renderMe(); toast(k === 'none' ? 'زر التحدث على الشاشة فقط' : `زر ${PTT_KEYS[k].lbl} يشغّل التحدث الآن`); break; }
    case 'ptt-mode': S.settings.pttMode = b.dataset.mode === 'toggle' ? 'toggle' : 'hold'; save(); renderMe(); break;
    case 'relay': S.settings.relayOnly = !S.settings.relayOnly; save(); renderMe(); RT.conns = {}; RT.outCalls = {}; startPeer(); break;
    case 'notif-preview': S.settings.notifPreview = !S.settings.notifPreview; save(); renderMe(); break;
    case 'reconnect': RT.conns = {}; RT.outCalls = {}; RT.pending = {}; RT.iceFail = {}; startPeer(); toast('يعيد الاتصال…'); setTimeout(() => { if(RT.tab === 'me') renderMe(); }, 4000); break;
    case 'eco': S.settings.eco = !S.settings.eco; save(); applyEco(); geoRefresh(); { const P = BG(); if(P) P.update({ eco:S.settings.eco }).catch(() => {}); } renderMe(); toast(S.settings.eco ? 'فعّلت توفير الطاقة' : 'أوقفت توفير الطاقة'); break;
    case 'bg-toggle': S.settings.bgMode = !S.settings.bgMode; save(); await bgApply(); toast(S.settings.bgMode ? 'VibeMap يعمل الآن في الخلفية' : 'أوقفت العمل في الخلفية'); break;
    case 'bubble-toggle': { S.settings.bubble = !S.settings.bubble; save(); const P = BG(); if(!P) break;
      await bgRefresh(); if(S.settings.bubble && RT.bg && RT.bg.canOverlay === false){ toast('اسمح لـ VibeMap بالظهور فوق التطبيقات ثم ارجع'); P.overlaySettings().catch(() => {}); }
      else toast(S.settings.bubble ? 'تظهر الفقاعة لما تطلع من التطبيق' : 'أوقفت الفقاعة');
      await P.update({ bubble:!!S.settings.bubble }).catch(() => {}); renderMe(); break; }
    case 'bubble-perm': { const P = BG(); if(P){ toast('فعّل «السماح بالظهور فوق التطبيقات» ثم ارجع'); P.overlaySettings().catch(() => {}); } break; }
    case 'bg-battery': { const P = BG(); if(P) P.batterySettings().catch(() => {}); break; }
    case 'room-new': openRoomEditor(); break;
    case 'room-addfriend': { const r = S.rooms[b.dataset.room]; if(!r || !r.members.includes(pin) || !PIN_STRICT.test(pin) || S.friends[pin]) break;
      S.friends[pin] = { pin, name:memberName(r, pin), color:senderColor(pin), status:'out', added:now(), via:r.id, hidePin:true };
      S.friends[pin].rq = 'wait'; save(); connectTo(pin); sendReq(pin, { via:r.id }, true); toast(`أُرسل طلب صداقة إلى ${memberName(r, pin)}`); openConvSettings(RT.cvConv); break; }
    case 'room-edit': openRoomEditor(pin); break;
    case 're-emoji': reKeep(); if(EMOJIS.includes(b.dataset.e)) RE.emoji = b.dataset.e; renderRoomEditor(); break;
    case 're-color': reKeep(); RE.color = V.color(b.dataset.color); renderRoomEditor(); break;
    case 're-save': saveRoomEditor(); break;
    case 'conv-set': openConvSettings(pin || RT.chatWith); break;
    case 'cv-wall': { const o = roomOf(RT.cvConv) || S.friends[RT.cvConv]; if(!o) break; o.wall = Math.max(0, Math.min(WALLS.length - 1, +b.dataset.i || 0)); save(); openConvSettings(RT.cvConv); renderChatIfOpen(RT.cvConv); break; }
    case 'cv-mute': { const o = roomOf(RT.cvConv) || S.friends[RT.cvConv]; if(!o) break; o.mute = !o.mute; save(); openConvSettings(RT.cvConv); toast(o.mute ? 'كتمت إشعارات هذه المحادثة' : 'رجعت الإشعارات'); break; }
    case 'cv-ttl': { const o = roomOf(RT.cvConv) || S.friends[RT.cvConv]; if(!o) break; o.ttl = V.ttl(b.dataset.ttl); save(); openConvSettings(RT.cvConv); renderChatIfOpen(RT.cvConv); break; }
    case 'room-talk': RT.target = pin; closeSheet(); if(RT.chatWith) closeChat(); setTab('radar'); toast(`زر التحدث موجّه الآن إلى غرفة «${roomOf(pin).name}»`); break;
    case 'room-leave-ask': $('#rlBox').innerHTML = `<div class="btns"><button class="btn danger" data-act="room-leave" data-pin="${esc(pin)}">تأكيد</button><button class="btn" data-act="conv-set" data-pin="${esc(RT.cvConv)}">تراجع</button></div>`; break;
    case 'room-leave': leaveRoom(pin); break;
    case 'vplay': if(RT.chatWith) playVoice(RT.chatWith, b.dataset.mid); break;
    case 'contact': openFeedback(); break;
    case 'fb-type': fbKeep(); if(FB_TYPES[b.dataset.k]) FB.type = b.dataset.k; renderFeedback(); break;
    case 'fb-send': sendFeedback(); break;
    case 'fb-mail': feedbackMail(); break;
    case 'story-new': openStoryComposer(); break;
    case 'cam-open': camOpen(); break;
    case 'cam-close': camClose(); break;
    case 'cam-flip': if(CAM){ CAM.facing = CAM.facing === 'user' ? 'environment' : 'user'; CAM.torch = false; const v = $('#camVid'); if(v) v.classList.toggle('mirror', CAM.facing === 'user'); camStart(); } break;
    case 'cam-torch': if(CAM && CAM.stream){ CAM.torch = !CAM.torch; try{ await CAM.stream.getVideoTracks()[0].applyConstraints({ advanced:[{ torch:CAM.torch }] }); }catch(x){ CAM.torch = false; } renderCamBar(); } break;
    case 'cam-shot': camShot(); break;
    case 'cam-gallery': $('#camFile').click(); break;
    case 'cam-text': camClose(); openStoryComposer(); break;
    case 'cam-f': camSetFilter(+b.dataset.i); break;
    case 'cam-retake': if(CAM){ CAM.mode = 'live'; CAM.stickers = []; CAM.shot = null; CAM.caption = ''; renderCam(); camStart(); } break;
    case 'cam-emoji': if(CAM){ const cp = $('#camCap'); if(cp) CAM.caption = cp.value; CAM.emojiOpen = !CAM.emojiOpen; renderCam(); } break;
    case 'cam-add': if(STICKERS.includes(b.dataset.e)) camAddSticker('emoji', b.dataset.e); break;
    case 'cam-time': camAddSticker('label', nowLabel()); break;
    case 'cam-place': camAddSticker('label', placeLabel()); break;
    case 'cam-loc': if(CAM){ const cp = $('#camCap'); if(cp) CAM.caption = cp.value; CAM.withLoc = !CAM.withLoc; renderCam(); toast(CAM.withLoc ? 'تظهر حالتك على الرادار في مكانك' : 'بدون مكان'); } break;
    case 'cam-post': camPost(); break;
    case 'mute-stories': { const f = S.friends[pin]; if(!f) break; f.muteStories = !f.muteStories; save(); renderAll(); if(sheetPin === pin) openSheet(friendSheet(pin), pin); toast(f.muteStories ? `كتمت حالات ${f.name}` : `ترجع تشوف حالات ${f.name}`); break; }
    case 'story-open': openStories(pin, b.dataset.id); break;
    case 'sc-bg': scKeep(); SC.bg = Math.max(0, Math.min(SBG.length - 1, +b.dataset.i || 0)); renderComposer(); break;
    case 'sc-photo': SC = null; closeSheet(); camOpen(); break;
    case 'sc-nophoto': scKeep(); SC.data = null; renderComposer(); break;
    case 'sc-loc': scKeep(); SC.withLoc = !SC.withLoc; renderComposer(); break;
    case 'sc-post': scKeep(); if(!SC.data && !SC.text.trim()){ toast('اكتب حالتك أو أضف صورة'); break; }
      postStory({ t:SC.data ? 'photo' : 'text', text:SC.text.trim(), bg:SC.bg, data:SC.data, withLoc:SC.withLoc }); SC = null; closeSheet(); break;
    case 'sv-close': closeStories(); break;
    case 'sv-views': if(SV){ SV.showViews = !SV.showViews; SV.paused = SV.showViews; renderStoryView(); } break;
    case 'sv-del': { const id = b.dataset.id; closeStories(); deleteStory(id); break; }
    case 'hide-stories': { const f = S.friends[pin]; if(!f) break; f.hideStories = !f.hideStories; save(); syncStories(pin); openSheet(friendSheet(pin), pin); toast(f.hideStories ? `حالاتك مخفية عن ${f.name}` : `${f.name} يقدر يشوف حالاتك`); break; }
    case 'stories-toggle': S.settings.storiesOn = !S.settings.storiesOn; save(); syncAllStories(); renderMe(); renderStage(); toast(S.settings.storiesOn ? 'حالاتك ظاهرة لأصدقائك' : 'أخفيت حالاتك عن الجميع'); break;
    case 'me-photo': $('#avatarFile').click(); break;
    case 'me-photo-del': S.me.photo = null; S.me.photoV = now(); save(); friendsOnline().forEach(sendAvatar); renderMe(); toast('أُزيلت صورتك'); break;
    case 'ver-tap': RT.verTaps = (RT.verTaps || 0) + 1; clearTimeout(RT.verT); RT.verT = setTimeout(() => { RT.verTaps = 0; }, 2500);
      if(RT.verTaps >= 7 && !S.settings.dev){ S.settings.dev = true; save(); renderMe(); toast('ظهرت الخيارات المتقدمة'); } break;
    case 'dev-off': S.settings.dev = false; save(); renderMe(); break;
    case 'reset-ask': $('#resetBox').innerHTML = `<div class="btns"><button class="btn danger" data-act="reset">نعم، احذف كل شيء</button><button class="btn" data-act="reset-no">تراجع</button></div>`; break;
    case 'reset-no': renderMe(); break;
    case 'reset': await relayPost('/api/unreg', {}); try{ localStorage.removeItem(LS_KEY); }catch(x){} await idb.clear(); if(RT.peer) RT.peer.destroy(); location.replace(location.pathname); break;
    case 'sheet-close': closeSheet(); break;
    case 'sos-cancel': cancelSOS(); break;
    case 'sos-to': S.settings.sosTo = b.dataset.t || 'all'; save(); renderSosBtn(); openSheet(sosPickSheet()); break;
    case 'sos-send-now': sendSOS(sosDefault()); break;
    case 'chat-sos': openSheet(sosConvSheet(RT.chatWith)); break;
    case 'sos-send-conv': sendSOS(b.dataset.pin); break;
    case 'sos-dismiss': stopSosAlert(); break;
    case 'geo-retry': startGeo(); break;
    case 'unlock': unlockAudio(); $('#tapAudio').hidden = true; break;
  }
});
$('#sheetWrap').addEventListener('click', e => { if(e.target.id === 'sheetWrap') closeSheet(); });
$('#avatarFile').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f) return;
  try{ S.me.photo = await avatarFrom(f); S.me.photoV = now(); save(); friendsOnline().forEach(sendAvatar); renderAll(); toast('حُفظت صورتك'); }catch(x){ toast('تعذّر فتح الصورة'); } });
$('#camFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if(f) camFromFile(f); });
$('#storyPhoto').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if(!f || !SC) return;
  try{ SC.data = await compressImage(f, 1080, .7); renderComposer(); }catch(x){ toast('تعذّر تجهيز الصورة'); } });
document.addEventListener('keydown', e => { if(e.key === 'Escape' && CAM) camClose(); if(e.key === 'Escape' && SV) closeStories(); if(SV && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)){ if(e.key === 'ArrowLeft') svNext(); if(e.key === 'ArrowRight') svPrev(); } });
$('#photoInput').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if(f && RT.chatWith) sendPhoto(RT.chatWith, f); e.target.value = ''; });
document.addEventListener('pointerdown', () => { const c = RT.ctx; if(c && c.state === 'suspended') c.resume().catch(() => {}); }, { passive:true });

/* ════════ v7.3: العمل في الخلفية (أندرويد) ════════
   خدمة أندرويد بإشعار دائم تُبقي التطبيق متصلاً والشاشة مقفلة: صوت الأصدقاء، الرسائل، الحالات، SOS.
   في الإشعار زر «تحدث» يشغّل ويوقف التحدث بدون فتح التطبيق. */
const BG = () => (PLATFORM === 'android' ? NP('VibeBg') : null);
async function bgRefresh(){ const P = BG(); if(!P) return; try{ RT.bg = await P.getStatus(); }catch(e){} }
async function bgApply(){
  const P = BG(); if(!P) return;
  try{ if(S.settings.bgMode){ await P.update({ eco:!!S.settings.eco, bubble:!!S.settings.bubble }); RT.bg = await P.start(); } else { await P.stop(); RT.bg = { running:false }; } }catch(e){ console.warn('bg', e); RT.bg = { running:false, err:true }; }
  if(RT.tab === 'me') renderMe();
}
function bgTalk(){ bgState(); }
/* حالة الإشعار والفقاعة: أحمر وأنت تتكلم، أخضر وأحد يكلمك */
let bgLast = '';
function bgState(){ const P = BG(); if(!P || !S.settings.bgMode) return; const st = `${RT.talking ? 1 : 0}${RT.rxTalking.size ? 1 : 0}`; if(st === bgLast) return; bgLast = st;
  P.update({ talking:RT.talking, rx:RT.rxTalking.size > 0 }).catch(() => {}); }
let bgReady = false;
async function bgInit(){
  const P = BG(); if(!P || bgReady) return; bgReady = true;
  try{ await P.addListener('bg', e => { if(e.state === 'stopped'){ S.settings.bgMode = false; save(); RT.bg = { running:false }; toast('أوقفت العمل في الخلفية'); if(RT.tab === 'me') renderMe(); } }); }catch(e){}
  await bgApply();
}
function bgSection(){
  if(PLATFORM === 'ios') return `<div class="h2">العمل في الخلفية</div><div class="card" style="padding:14px"><div class="t2" style="white-space:normal">في الآيفون يستقبل VibeMap الصوت والتطبيق مفتوح فقط. الاستقبال والشاشة مقفلة يحتاج إطار Apple للاسلكي (PushToTalk) وخادم إشعارات، وهو مخطط له في الإصدار القادم.</div></div>`;
  if(PLATFORM !== 'android') return `<div class="h2">العمل في الخلفية</div><div class="card" style="padding:14px"><div class="t2" style="white-space:normal">المتصفح يوقف التطبيق إذا قفلت الشاشة. للعمل في الخلفية استخدم نسخة أندرويد من المتجر.</div></div>`;
  const st = S.settings, bg = RT.bg || {};
  return `<div class="h2">العمل في الخلفية</div><div class="card list">
    <div class="set"><span class="grow"><span class="t1" style="display:block">استقبال والشاشة مقفلة</span><span class="t2" style="display:block">${st.bgMode ? (bg.running ? '<span style="color:var(--ok)">يعمل</span> · يظهر إشعار دائم فيه زر «تحدث»' : 'يبدأ الآن…') : 'متوقف: لن تسمع أحداً إذا قفلت الشاشة'}</span></span>${`<button class="switch" role="switch" aria-checked="${st.bgMode}" data-act="bg-toggle" aria-label="العمل في الخلفية"></button>`}</div>
    ${st.bgMode ? `<div class="set"><span class="grow"><span class="t1" style="display:block">فقاعة التحدث العائمة</span><span class="t2" style="display:block">${st.bubble && bg.canOverlay === false ? '<span style="color:var(--sos)">تحتاج إذن «الظهور فوق التطبيقات»</span>' : 'دائرة VibeMap فوق باقي التطبيقات: ضغطة تفتح التطبيق، ضغط مطوّل تتكلم، واسحبها لأي مكان. تصير خضراء إذا أحد يكلمك'}</span></span>${st.bubble && bg.canOverlay === false ? '<button class="btn sm pri" data-act="bubble-perm">السماح</button>' : `<button class="switch" role="switch" aria-checked="${!!st.bubble}" data-act="bubble-toggle" aria-label="الفقاعة العائمة"></button>`}</div>` : ''}
    ${st.bgMode && !st.bubble && bg.canOverlay === false ? `<div class="set"><span class="grow"><span class="t1" style="display:block">يرجع يشتغل لو انقفل</span><span class="t2" style="display:block">لو سحبت VibeMap من قائمة التطبيقات الأخيرة ينقفل. اسمح له «بالظهور فوق التطبيقات» عشان يرجع يشتغل في الخلفية تلقائياً</span></span><button class="btn sm pri" data-act="bubble-perm">السماح</button></div>` : ''}
    ${st.bgMode && !bg.batteryUnrestricted ? `<div class="set"><span class="grow"><span class="t1" style="display:block">البطارية تقيّد التطبيق</span><span class="t2" style="display:block">بعض الجوالات توقف التطبيق بعد دقائق. افتح الإعدادات واختر VibeMap ← «غير مقيّد» أو «بدون تحسين»</span></span><button class="btn sm pri" data-act="bg-battery">فتح</button></div>` : ''}
  </div>`;
}

/* ════════ v7: زر التحدث الخارجي (أزرار الصوت / السماعة / زر الإجراء) ════════
   التطبيق الأصلي (أندرويد/آيفون) يرسل حدث 'hwkey' عبر إضافة HwKeys: { key:'volup'|'voldown'|'headset'|'action', action:'down'|'up'|'press' }
   أندرويد: ضغط مطوّل حقيقي (down/up). آيفون: أزرار الصوت ترسل ضغطة فقط (press) فتعمل بوضع «ضغطة تشغيل وضغطة إيقاف». */
const PTT_KEYS = {
  none:    { lbl:'الشاشة فقط' },
  volup:   { lbl:'رفع الصوت', android:true },
  voldown: { lbl:'خفض الصوت', android:true },
  headset: { lbl:'زر السماعة' },
  action:  { lbl:'زر الإجراء', ios:true },
  home:    { lbl:'الزر الرئيسي', blocked:true },
};
function pttKeyAvail(k){
  const d = PTT_KEYS[k]; if(!d || d.blocked) return false;
  if(k === 'none') return true;
  if(!IS_NATIVE) return false;
  if(d.ios && PLATFORM !== 'ios') return false;
  if(d.android && PLATFORM !== 'android') return false;
  return true;
}
function pttModeEff(){ return (PLATFORM === 'ios' && S.settings.pttKey !== 'none') ? 'toggle' : S.settings.pttMode; }
let hwLast = 0;
function hwKey(key, action){
  if(!S || !S.me || key !== S.settings.pttKey || key === 'none') return;
  if(action === 'press' || pttModeEff() === 'toggle'){
    if(action === 'up') return;
    if(now() - hwLast < 350) return; hwLast = now();
    RT.talking ? pttUp() : pttDown(); return;
  }
  if(action === 'down') pttDown(); else if(action === 'up') pttUp();
}
async function hwApply(){
  const H = NP('HwKeys'); if(!H) return;
  try{ await H.setKey({ key: pttKeyAvail(S.settings.pttKey) ? S.settings.pttKey : 'none' }); }catch(e){ console.warn('hwkeys', e); }
}
let hwReady = false;
async function hwInit(){
  if(hwReady) return; hwReady = true;
  const H = NP('HwKeys');
  if(H){
    try{ await H.addListener('hwkey', e => { if(e.key === 'notif'){ RT.talking ? pttUp() : pttDown(); } else if(e.key === 'bubble'){ e.action === 'down' ? pttDown() : pttUp(); } else hwKey(e.key, e.action); }); }catch(e){}
    await hwApply();
    try{ const p = await H.consumePending(); if(p && p.key) setTimeout(() => hwKey(p.key, 'press'), 900); }catch(e){}
  }
  /* على الويب: بعض الأجهزة ترسل هذه المفاتيح للمتصفح (لوحات مفاتيح بلوتوث وبعض السماعات) */
  const map = { AudioVolumeUp:'volup', AudioVolumeDown:'voldown', MediaPlayPause:'headset', HeadsetHook:'headset' };
  document.addEventListener('keydown', e => { const k = map[e.key]; if(k && k === S?.settings.pttKey){ e.preventDefault(); if(!e.repeat) hwKey(k, 'down'); } });
  document.addEventListener('keyup', e => { const k = map[e.key]; if(k && k === S?.settings.pttKey){ e.preventDefault(); hwKey(k, 'up'); } });
}
function pttKeySection(){
  const st = S.settings, cur = pttKeyAvail(st.pttKey) ? st.pttKey : 'none';
  const keys = Object.keys(PTT_KEYS).filter(k => !(PTT_KEYS[k].ios && PLATFORM === 'android'));
  let note;
  if(!IS_NATIVE) note = 'أزرار الجوال الجانبية تعمل في نسخة التطبيق من Google Play و App Store فقط. في المتصفح استخدم زر الشاشة، أو المسافة في الكمبيوتر.';
  else if(PLATFORM === 'ios') note = 'زر الإجراء (آيفون 15 برو وأحدث): الإعدادات ← زر الإجراء ← اختصار ← «تحدث في VibeMap». زر السماعة: ضغطة للبدء وضغطة للإيقاف. أزرار الصوت لا تُستخدم في الآيفون لأن Apple تمنع تغيير وظيفتها.';
  else note = 'يعمل الزر والتطبيق مفتوح على الشاشة. اضغط مطولاً للتحدث، أو اختر «ضغطة تشغيل وضغطة إيقاف».';
  return `<div class="h2">زر التحدث</div><div class="card list">
  <div class="set col"><span><span class="t1" style="display:block">الزر الذي يشغّل التحدث</span><span class="t2" style="display:block;white-space:normal">${note}</span></span>
    <div class="segs">${keys.map(k => `<button class="${cur === k ? 'on' : ''}" data-act="ptt-key" data-key="${k}" ${pttKeyAvail(k) ? '' : 'disabled'}>${PTT_KEYS[k].lbl}</button>`).join('')}</div>
    <span class="t2" style="white-space:normal">الزر الرئيسي لا يمكن تغييره: Apple و Google تمنعان أي تطبيق من ذلك لحماية المستخدم.</span></div>
  ${PLATFORM !== 'ios' ? `<div class="set col"><span class="t1">طريقة الضغط</span><div class="segs">${[['hold','اضغط مطولاً وتكلم'],['toggle','ضغطة تشغيل وضغطة إيقاف']].map(([k, n]) => `<button class="${st.pttMode === k ? 'on' : ''}" data-act="ptt-mode" data-mode="${k}">${n}</button>`).join('')}</div></div>` : ''}
  </div>`;
}


/* ════════════════════════ v8.1 ════════════════════════ */

/* ─── المستويات: نقاط من التفاعل + شرط التقييم للمستويات العالية ─── */
const LEVELS = [
  { n:'جديد', i:'🌱', p:0 }, { n:'نشيط', i:'⚡', p:60 }, { n:'متفاعل', i:'🔥', p:200 },
  { n:'موثوق', i:'🛡️', p:500, r:3.5, rn:2 }, { n:'مميز', i:'💎', p:1200, r:4, rn:3 },
  { n:'نجم', i:'⭐', p:2500, r:4.3, rn:5 }, { n:'أسطورة', i:'👑', p:5000, r:4.6, rn:8 } ];
function stat(k, n = 1){
  if(!S) return; const st = S.stats || (S.stats = { talks:0, msgs:0, stories:0, sq:0, pokes:0, days:[] });
  st[k] = (st[k] || 0) + n; const d = new Date().toISOString().slice(0, 10);
  if(!Array.isArray(st.days)) st.days = [];
  if(!st.days.includes(d)){ st.days.push(d); if(st.days.length > 400) st.days.shift(); }
  save();
}
const repAvg = r => r && r.n ? +((r.t + r.e + r.h) / 3).toFixed(1) : null;
function myPoints(){ const st = S.stats || {}, r = myRep();
  return Math.round((st.talks || 0) * 2 + (st.msgs || 0) + (st.stories || 0) * 5 + (st.sq || 0) * 3 + (st.pokes || 0) * .5 + (st.days || []).length * 10 + (r ? r.n * 15 : 0)); }
function myLevel(){ const pts = myPoints(), r = myRep(), avg = repAvg(r), n = r ? r.n : 0; let lv = 0;
  LEVELS.forEach((L, i) => { if(pts >= L.p && (!L.r || (avg != null && avg >= L.r && n >= L.rn))) lv = i; }); return lv; }
function lvlRt(lv, rt){
  let h = ''; if(Number.isInteger(lv) && lv > 0 && LEVELS[lv]) h += `<span class="lvl" title="${LEVELS[lv].n}">${LEVELS[lv].i}</span>`;
  if(rt != null && rt > 0) h += `<span class="rt">★${(+rt).toFixed(1)}</span>`;
  return h ? ` <span class="bdg">${h}</span>` : ''; }
function badge(f){ if(!f) return ''; if(f === S.me) return lvlRt(myLevel(), repAvg(myRep())); return lvlRt(f.lvl, repAvg(f.rep)); }
function levelCard(){
  const lv = myLevel(), L = LEVELS[lv], nx = LEVELS[lv + 1], pts = myPoints(), r = myRep(), avg = repAvg(r);
  const pct = nx ? Math.min(100, Math.round((pts - L.p) / (nx.p - L.p) * 100)) : 100;
  const need = nx ? [pts < nx.p ? `${nx.p - pts} نقطة` : '', nx.r && !(avg != null && avg >= nx.r && r.n >= nx.rn) ? `تقييم ${nx.r}★ من ${nx.rn} أصدقاء` : ''].filter(Boolean).join(' + ') : '';
  return `<div class="card lvlcard"><div class="lvtop"><span class="lvic">${L.i}</span><span class="grow"><b>${L.n}</b><small>${pts} نقطة${avg != null ? ` · تقييمك ★${avg.toFixed(1)} من ${r.n}` : ''}</small></span></div>
    ${nx ? `<div class="lvbar"><i style="width:${pct}%"></i></div><div class="t2" style="white-space:normal">للوصول إلى ${nx.i} ${nx.n}: ${need || 'قريب جداً'}</div>` : '<div class="t2">وصلت أعلى مستوى 👑</div>'}
    <details class="lvhow"><summary>كيف أرتقي؟</summary><div class="t2" style="white-space:normal">كل يوم تفتح فيه التطبيق 10 نقاط · كل مرة تتكلم 2 · كل رسالة 1 · كل حالة 5 · كل منشور في الساحة 3 · كل تقييم يوصلك من صديق 15. المستويات العالية تحتاج تقييم حلو من أصدقائك. مستواك وتقييمك يطلعون جنب اسمك عند الكل.</div></details></div>`;
}

/* ─── النبذة ─── */
V.bio = x => { if(!x || typeof x !== 'object') return null; const o = { about:V.str(x.about || '', 160).trim(), work:V.str(x.work || '', 40).trim(), tags:V.str(x.tags || '', 80).trim() }; return o.about || o.work || o.tags ? o : null; };
V.lvl = x => { const n = V.num(x, 0, LEVELS.length - 1); return n == null ? null : Math.round(n); };
function bioHtml(b){
  if(!b) return '';
  const tags = (b.tags || '').split(/[،,]+/).map(t => t.trim()).filter(Boolean).slice(0, 8);
  return `<div class="card biocard">${b.about ? `<div class="bio-a">${esc(b.about)}</div>` : ''}${b.work ? `<div class="t2">💼 ${esc(b.work)}</div>` : ''}${tags.length ? `<div class="bio-t">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
}
function bioForm(){ const b = S.me.bio || {};
  return `<div class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px">
    <label class="t1" for="bioAbout">عني</label><textarea class="input" id="bioAbout" rows="2" maxlength="160" placeholder="مثال: أحب البر والقهوة ☕">${esc(b.about || '')}</textarea>
    <label class="t1" for="bioWork">العمل</label><input class="input" id="bioWork" maxlength="40" placeholder="مثال: مدير فرع" value="${esc(b.work || '')}">
    <label class="t1" for="bioTags">الاهتمامات</label><input class="input" id="bioTags" maxlength="80" placeholder="مثال: الرحلات، كرة القدم، التصوير" value="${esc(b.tags || '')}">
    <button class="btn pri" data-act="bio-save">حفظ النبذة</button><div class="t2" style="white-space:normal">تطلع لأصدقائك في صفحتك، وللناس القريبين إذا كنت «ظاهر للجميع».</div></div>`; }

/* ─── الوكز ─── */
function pokeFriend(pin){
  const f = S.friends[pin]; if(!f || f.status !== 'friend') return;
  RT.pokeT = RT.pokeT || {}; if(now() - (RT.pokeT[pin] || 0) < 8000){ toast('انتظر شوي قبل ما توكزه مرة ثانية'); return; }
  RT.pokeT[pin] = now(); vibrate(30); tone([[740,.05],[990,.07]], .15); stat('pokes');
  if(isDemo(pin)){ toast(`وكزت ${f.name} 👉`); return; }
  sendAny(pin, { k:'poke', ts:now() }, 'poke').then(r => toast(r ? `وكزت ${f.name} 👉` : 'تعذّر الوكز الآن — تأكد من الإنترنت'));
}
function recvPoke(pin, m){
  const f = S.friends[pin]; if(!f) return; const ts = V.num(m.ts, 1e12, 1e13) || now();
  if(now() - ts > 10 * 60e3 || f.pokeTs === ts) return; f.pokeTs = ts;
  (RT.poked || (RT.poked = {}))[pin] = now();
  if(!f.mute){ vibrate([90, 60, 90, 60, 220]); tone([[880,.07],[1175,.07],[880,.07],[1175,.1]], .28); notify(`👉 ${f.name} وكزك`, 'يبغاك تنتبه'); }
  toast(`👉 ${f.name} وكزك`); sysMsg(pin, `👉 ${f.name} وكزك`); saveMsgs(); renderStage(); renderChatIfOpen(pin);
  setTimeout(() => renderStage(), 4200);
}
function pokeSheet(){
  const fr = Object.values(S.friends).filter(f => f.status === 'friend').sort((a, b) => isOnline(b.pin) - isOnline(a.pin));
  return `<div class="grab"></div><div class="h1">👉 وكز</div><p class="note">اختر مين توكزه — يوصله تنبيه واهتزاز حتى لو التطبيق مقفل.</p>
  ${fr.length ? `<div class="card list" style="max-height:52vh;overflow:auto">${fr.map(f => `<button class="row" data-act="poke" data-pin="${f.pin}"><span class="av" style="${avCss(f)}">${esc(initial(f.name))}<i class="st ${isOnline(f.pin) ? 'on' : ''}"></i></span><span class="grow"><span class="t1" style="display:block">${esc(f.name)}${badge(f)}</span><span class="t2" style="display:block">${isOnline(f.pin) ? 'متصل' : 'يوصله إشعار'}</span></span><span style="font-size:24px" aria-hidden="true">👉</span></button>`).join('')}</div>` : '<div class="card empty"><b>ما عندك أصدقاء بعد</b>أضف صديق أول عشان توكزه.</div>'}`;
}

/* ─── طلبات الصداقة عبر الخادم: توصل حتى لو صديقك مقفل التطبيق ─── */
async function relaySendPlain(pin, obj, kind){
  if(!RELAY || !PIN_STRICT.test(pin)) return false;
  const j = await relayPost('/api/send', { to:pin, items:[{ id:uid(), iv:'PLAIN', ct:b64(TE.encode(JSON.stringify(obj))) }], push: kind ? { k:kind, n:S.me.name } : null });
  return !!(j && j.ok);
}
function reqPayload(extra){ return { k:'freq', name:S.me.name, color:S.me.color, pub:S.keys.pub, rep:myRep(), lvl:myLevel(), bio:S.me.bio || null, v:VERSION, ...(extra || {}) }; }
function acceptPayload(){ return { k:'facc', name:S.me.name, color:S.me.color, pub:S.keys.pub, rep:myRep(), lvl:myLevel(), bio:S.me.bio || null }; }
async function ecdhKey(pubJwk){
  const pub = await crypto.subtle.importKey('jwk', { kty:'EC', crv:'P-256', x:pubJwk.x, y:pubJwk.y }, { name:'ECDH', namedCurve:'P-256' }, false, []);
  return crypto.subtle.deriveKey({ name:'ECDH', public:pub }, myPriv, { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']);
}
/* رسالة مشفّرة لشخص مو صديق (من «ظاهر للجميع») بمفتاحه العام */
async function sealFor(pubJwk, obj){
  const key = await ecdhKey(pubJwk), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, TE.encode(JSON.stringify(obj)));
  return b64(TE.encode(JSON.stringify({ p:{ x:S.keys.pub.x, y:S.keys.pub.y }, iv:b64(iv), ct:b64(ct) })));
}
async function openSealed(ct){
  const w = JSON.parse(TD.decode(unb64(ct))); const p = V.pub({ kty:'EC', crv:'P-256', x:w.p && w.p.x, y:w.p && w.p.y }); if(!p) throw new Error('pub');
  const key = await ecdhKey(p); const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64(w.iv) }, key, unb64(w.ct));
  return { m:JSON.parse(TD.decode(pt)), pub:p };
}
function handlePlain(pin, m, sealedPub){
  if(!m || typeof m !== 'object' || !PIN_STRICT.test(pin) || isDemo(pin) || pin === S.me.pin || S.blocked[pin]) return;
  const pub = V.pub(m.pub); if(!pub) return; if(sealedPub && (sealedPub.x !== pub.x || sealedPub.y !== pub.y)) return;
  let f = S.friends[pin];
  /* v8.2: لو نعرف مفتاح هذا الرقم، أي رسالة بمفتاح مختلف مرفوضة (ما نسمح باستبدال المفتاح بصمت) */
  const samePub = f && f.pub && f.pub.x === pub.x && f.pub.y === pub.y;
  if(f && f.pub && !samePub) return;
  if(m.k === 'freq'){
    if(f && f.status === 'friend') return;
    if(f && f.status === 'out'){
      f.name = V.name(m.name); f.color = V.color(m.color); f.pub = pub; f.rep = V.rep(m.rep); f.lvl = V.lvl(m.lvl); f.bio = V.bio(m.bio); f.status = 'friend'; save(); markConnOk(pin);
      deriveFor(pin).then(() => { relaySendPlain(pin, acceptPayload(), 'accept'); onFriendOnline(pin); renderAll(); });
      toast(`أصبحت أنت و${f.name} أصدقاء`); renderAll(); return;
    }
    if(!f && Object.values(S.friends).filter(x => x.status === 'in').length >= 30) return;
    const isNew = !f;
    f = S.friends[pin] = { ...(f || {}), pin, name:V.name(m.name), color:V.color(m.color), status:'in', added:(f && f.added) || now(), pub, rep:V.rep(m.rep), lvl:V.lvl(m.lvl), bio:V.bio(m.bio), fromPub:m.pubreq === true }; markConnOk(pin);
    { const vr = V.id(m.via), rr = vr && S.rooms[vr]; if(rr && rr.members.includes(pin)){ f.via = vr; f.hidePin = true; } }
    const voice = m.voice && String(m.voice).length <= 450000 ? V.audio(m.voice) : null; /* v8.2: حد للحجم (ضد ملء التخزين) */
    if(voice){ f.reqVoice = voice; f.reqDur = V.num(m.dur, 0, 60) || 0;
      const vs = Object.values(S.friends).filter(x => x.status === 'in' && x.reqVoice).sort((a, b) => (a.added || 0) - (b.added || 0));
      while(vs.length > 5){ const o = vs.shift(); delete o.reqVoice; delete o.reqDur; } }
    save();
    if(isNew || voice){ tone(BEEP.msg); vibrate(40);
      notify(voice ? `🎤 ${f.name}` : 'طلب صداقة جديد', voice ? 'أرسل لك رسالة صوتية مع طلب صداقة' : `${f.name} يبغى يضيفك في VibeMap`);
      toast(voice ? `🎤 ${f.name} أرسل لك فويس مع طلب صداقة` : `طلب صداقة من ${f.name}`); }
    renderAll(); return;
  }
  if(m.k === 'facc'){
    if(!f || (f.status !== 'out' && f.status !== 'friend')) return;
    if(f.status === 'friend' && !samePub) return;
    const was = f.status;
    Object.assign(f, { pub, name:V.name(m.name), color:V.color(m.color), rep:V.rep(m.rep), lvl:V.lvl(m.lvl), bio:V.bio(m.bio), status:'friend' }); save(); markConnOk(pin);
    deriveFor(pin).then(() => { if(was !== 'friend'){ toast(`${f.name} قبل طلب الصداقة`); notify('✅ ' + f.name, 'قبل طلب الصداقة'); onFriendOnline(pin); } renderAll(); });
    return;
  }
  if(m.k === 'fdec'){ if(f && f.status === 'out' && (!f.pub || samePub)){ const n = f.name; delete S.friends[pin]; save(); toast(`${n} رفض طلب الصداقة`); renderAll(); } }
}
/* مفتاح الصديق تأكد عبر الخادم — لو فيه اتصال مباشر مفتوح بنفس المفتاح نعتبره موثوق */
function markConnOk(pin){ const c = RT.conns[pin], f = S.friends[pin]; if(c && c._hp && f && f.pub && c._hp.x === f.pub.x && c._hp.y === f.pub.y && !f.keyAlert){ c._ok = true; if(f.status === 'friend') setTimeout(() => onFriendOnline(pin), 50); } }
function playReqVoice(pin){
  const f = S.friends[pin]; if(!f || !f.reqVoice) return;
  if(RT.reqAudio){ try{ RT.reqAudio.pause(); }catch(e){} }
  const a = new Audio(f.reqVoice); RT.reqAudio = a; a.play().catch(() => toast('تعذّر التشغيل'));
}

/* ─── الظهور: مخفي / للأصدقاء / للجميع ─── */
function visMode(){ return S.settings.ghost ? 'hidden' : S.settings.pubVis ? 'public' : 'friends'; }
function visSheet(){ const v = visMode();
  const row = (k, ic, t, d) => `<button class="row ${v === k ? 'on' : ''}" data-act="vis-set" data-v="${k}"><span class="av" style="background:var(--surface-2);font-size:20px">${ic}</span><span class="grow"><span class="t1" style="display:block">${t}</span><span class="t2" style="display:block;white-space:normal">${d}</span></span><span aria-hidden="true">${v === k ? '✓' : ''}</span></button>`;
  return `<div class="grab"></div><div class="h1">مين يشوفك على الرادار؟</div><div class="card list">
    ${row('friends', '👥', 'أصدقائي فقط', 'موقعك الدقيق مشفّر ويوصل لأصدقائك بس')}
    ${row('public', '🌍', 'الجميع', 'الناس القريبين منك (5 كم) يشوفونك بموقع تقريبي، ويقدرون يرسلون لك طلب صداقة أو فويس')}
    ${row('hidden', '🙈', 'مخفي', 'ما أحد يشوف موقعك، وتبقى تسمع وتتكلم')}</div>
    <div class="set card" style="border:1px solid var(--line)"><span class="grow"><span class="t1" style="display:block">أشوف الناس القريبين</span><span class="t2" style="display:block">يطلع لك على الرادار اللي مختارين «الجميع»</span></span><button class="switch" role="switch" aria-checked="${!S.settings.hideNear}" data-act="near-toggle" aria-label="أشوف الناس القريبين"></button></div>`; }
async function pubSync(force){
  if(!RELAY || !S || !S.me) return;
  const want = visMode() === 'public' && !S.settings.offline && !!RT.myLoc;
  if(!want){ if(RT.pubOn || force){ RT.pubOn = false; RT.pubLast = null; relayPost('/api/pub/set', { on:false }); } return; }
  /* v8.2: ما نرسل موقعك الدقيق أبداً — نثبّته على شبكة ~275م بإزاحة ثابتة خاصة فيك (ما أحد يقدر يحدد مكانك بالضبط) */
  if(!S.me.fz){ const r = crypto.getRandomValues(new Uint32Array(2)); S.me.fz = [r[0] / 2 ** 32, r[1] / 2 ** 32]; save(); }
  const G = 0.0025, q = (v, o) => +(Math.floor(v / G + o) - o + .5) * G;
  const L = { lat:q(RT.myLoc.lat, S.me.fz[0]), lng:q(RT.myLoc.lng, S.me.fz[1]) }, last = RT.pubLast;
  if(!force && last && now() - last.t < 120000 && last.lat === L.lat && last.lng === L.lng) return;
  RT.pubLast = { lat:L.lat, lng:L.lng, t:now() };
  const b = S.me.bio || {};
  const j = await relayPost('/api/pub/set', { on:true, name:S.me.name, color:S.me.color, lat:+L.lat.toFixed(5), lng:+L.lng.toFixed(5), pub:S.keys.pub, bio:b.about || '', work:b.work || '', tags:b.tags || '', lvl:myLevel(), rt:repAvg(myRep()) || 0 });
  RT.pubOn = !!(j && j.ok);
}
async function nearFetch(force){
  if(!RELAY || !S || S.settings.offline || !RT.myLoc || S.settings.hideNear){ if(RT.near && RT.near.length){ RT.near = []; renderStage(); } return; }
  if(!force && (RT.tab !== 'radar' || document.visibilityState !== 'visible')) return;
  if(!force && RT.nearT && now() - RT.nearT < 40000) return; RT.nearT = now();
  const j = await relayPost('/api/pub/near', { lat:+RT.myLoc.lat.toFixed(3), lng:+RT.myLoc.lng.toFixed(3) });
  if(!j || !Array.isArray(j.items)) return;
  RT.near = j.items.filter(x => x && PIN_STRICT.test(x.pin) && x.pin !== S.me.pin && !S.blocked[x.pin] && !(S.friends[x.pin] && S.friends[x.pin].status === 'friend'))
    .map(x => ({ pin:x.pin, n:V.name(x.n), c:V.color(x.c), loc:{ lat:+x.lat, lng:+x.lng }, d:V.num(x.d, 0, 1e5) || 0, pub:V.pub({ kty:'EC', crv:'P-256', x:x.pub && x.pub.x, y:x.pub && x.pub.y }),
      bio:V.bio({ about:x.bio, work:x.work, tags:x.tags }), lvl:V.lvl(x.lvl), rt:V.num(x.rt, 0, 5) }))
    .filter(x => x.pub && Number.isFinite(x.loc.lat) && Number.isFinite(x.loc.lng));
  renderStage();
}
const nearOf = pin => (RT.near || []).find(x => x.pin === pin) || null;
function strangerSheet(pin){
  const p = nearOf(pin); if(!p) return `<div class="grab"></div><p class="note">هذا الشخص ما عاد ظاهر.</p>`;
  const f = S.friends[pin], sent = f && f.status === 'out', inReq = f && f.status === 'in';
  return `<div class="grab"></div>
  <div class="shead"><span class="av" style="background:${p.c};width:56px;height:56px;font-size:22px">${esc(initial(p.n))}</span>
    <div class="grow"><div class="t1" style="font-size:18px">${esc(p.n)}${lvlRt(p.lvl, p.rt)}</div><div class="t2">🌍 ظاهر للجميع · تقريباً ${fmtDist(p.d)}</div></div></div>
  ${bioHtml(p.bio)}
  <div class="btns">${inReq ? `<button class="btn grad" data-act="accept" data-pin="${pin}">قبول طلبه</button>` : sent ? '<button class="btn" disabled>✓ أرسلت طلب صداقة</button>' : `<button class="btn grad" data-act="pub-add" data-pin="${pin}">${I.plus}طلب صداقة</button>`}</div>
  <div class="card" style="padding:14px"><div class="t1" style="margin-bottom:4px">🎤 أرسل له فويس</div><div class="t2" style="white-space:normal;margin-bottom:10px">اضغط مطولاً وتكلّم (حتى 30 ثانية). يوصله مع طلب صداقة، ويقدر يرد عليك بعد ما يقبل.</div>
    <button class="btn block holdrec" id="strMic" data-pin="${pin}">${I.mic}<span>اضغط مطولاً للتسجيل</span></button></div>
  <div class="btns"><button class="btn danger" data-act="block" data-pin="${pin}">حظر</button><button class="btn danger" data-act="report" data-pin="${pin}">حظر وإبلاغ</button></div>`;
}
async function strangerRequest(pin, voice){
  const p = nearOf(pin) || (S.friends[pin] && S.friends[pin].pub ? { n:S.friends[pin].name, c:S.friends[pin].color, pub:S.friends[pin].pub } : null); if(!p) return false;
  const pay = reqPayload({ pubreq:true, ...(voice ? { voice:voice.data, dur:voice.dur } : {}) });
  let j = null; try{ j = await relayPost('/api/send', { to:pin, items:[{ id:uid(), iv:'X', ct:await sealFor(p.pub, pay) }], push:{ k:voice ? 'voicereq' : 'friend', n:S.me.name } }); }catch(e){ console.warn('seal', e); }
  if(j && j.ok && !S.friends[pin]){ S.friends[pin] = { pin, name:p.n, color:p.c, status:'out', added:now(), pub:p.pub, fromPub:true, rq:'sent' }; save(); connectTo(pin); }
  renderAll(); return !!(j && j.ok);
}
/* تسجيل بالضغط المطوّل (للفويس مع طلب الصداقة) */
function bindHoldRec(btn, maxSec, onDone){
  let rec = null;
  const start = async e => { e.preventDefault(); if(rec) return; try{ btn.setPointerCapture(e.pointerId); }catch(x){}
    if(floorBusy()){ return; }
    const mime = pickMime(); if(mime === null){ toast('الجهاز لا يدعم تسجيل الصوت'); return; }
    rec = { chunks:[], t0:now(), stop:false }; btn.classList.add('rec');
    let track; try{ track = await getMicTrack(); }catch(x){ rec = null; btn.classList.remove('rec'); toast('اسمح باستخدام الميكروفون'); return; }
    if(!rec) { releaseMicSoon(); return; }
    try{ rec.mr = new MediaRecorder(new MediaStream([track]), mime ? { mimeType:mime, audioBitsPerSecond:32000 } : undefined); }catch(x){ rec = null; btn.classList.remove('rec'); return; }
    rec.mr.ondataavailable = ev => { if(ev.data && ev.data.size) rec.chunks.push(ev.data); };
    const r = rec; r.mr.onstop = () => { const dur = (now() - r.t0) / 1000; btn.classList.remove('rec'); releaseMicSoon(); const lab = btn.querySelector('span'); if(lab) lab.textContent = 'اضغط مطولاً للتسجيل';
      if(dur < .8){ toast('التسجيل قصير — اضغط مطولاً وتكلّم'); return; }
      const blob = new Blob(r.chunks, { type:r.mr.mimeType || 'audio/webm' }); const fr = new FileReader();
      fr.onload = () => { const data = V.audio(String(fr.result)); if(data) onDone({ data, dur:Math.min(maxSec, dur) }); else toast('صيغة الصوت غير مدعومة'); }; fr.readAsDataURL(blob); };
    r.mr.start(250); tone(BEEP.start); vibrate(20);
    r.timer = setInterval(() => { const d = (now() - r.t0) / 1000; const lab = btn.querySelector('span'); if(lab) lab.textContent = `🔴 ${fmtDur(d)} · اترك للإرسال`; if(d >= maxSec) stop(); }, 200);
    if(r.stop) stop(); };
  const stop = () => { if(!rec) return; const r = rec; if(!r.mr){ r.stop = true; return; } rec = null; clearInterval(r.timer); try{ r.mr.stop(); }catch(x){} tone(BEEP.end, .12); };
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

/* ─── ما تقدر تتكلم وأحد يتكلم (زي اللاسلكي) ─── */
function floorBusy(conv){
  const talkers = [...RT.rxTalking].filter(p => !conv || (isRoom(conv) ? ((roomOf(conv) || {}).members || []).includes(p) : p === conv));
  if(!talkers.length) return false;
  const n = (S.friends[talkers[0]] || {}).name || 'صديقك';
  toast(`${n} يتكلم الحين — انتظر لين يخلص`); tone([[330,.1],[0.1,.05],[330,.1]], .16); vibrate([40, 40, 40]);
  const p = $('#ptt'); if(p){ p.classList.remove('deny'); void p.offsetWidth; p.classList.add('deny'); }
  return true;
}

/* ─── متصل / غير متصل ─── */
function netSheet(){ const off = !!S.settings.offline;
  const row = (v, dot, t, d, on) => `<button class="row ${on ? 'on' : ''}" data-act="net-set" data-v="${v}"><span class="netdot ${dot}"></span><span class="grow"><span class="t1" style="display:block">${t}</span><span class="t2" style="display:block;white-space:normal">${d}</span></span><span aria-hidden="true">${on ? '✓' : ''}</span></button>`;
  return `<div class="grab"></div><div class="h1">حالة الاتصال</div><div class="card list">
    ${row('on', 'on', 'متصل', 'تستقبل الكلام المباشر والرسائل فوراً، وأصدقاؤك يشوفونك متصل', !off)}
    ${row('off', 'off', 'غير متصل', 'تختفي عن الكل، ويوقف الكلام المباشر والإشعارات. الرسائل تنتظرك لين ترجع متصل', off)}</div>
    ${!off ? `<p class="t2" style="white-space:normal">الحالة الآن: ${RT.net === 'on' ? 'متصل ✓' : RT.net === 'wait' ? 'يحاول الاتصال… تأكد من الإنترنت' : 'غير متصل — تأكد من الإنترنت'}</p>` : ''}
    ${S.settings.dev ? '<button class="btn" data-act="diag-open">التشخيص</button>' : ''}`; }
async function setOffline(v){
  if(!!S.settings.offline === v){ closeSheet(); return; }
  S.settings.offline = v; save(); closeSheet();
  if(v){ if(RT.talking) pttUp();
    /* نقفل كل اتصال بهدوء قبل فصل الخادم (يمنع خطأ داخلي في مكتبة الاتصال) */
    [...Object.values(RT.conns), ...Object.values(RT.outCalls)].forEach(c => { try{ const pc = c.peerConnection; if(pc){ pc.ondatachannel = null; pc.ontrack = null; } c.close(); }catch(e){} });
    if(RT.peer && !RT.peer.destroyed){ const pr = RT.peer; RT.peer = null; try{ pr.disconnect(); }catch(e){} setTimeout(() => { try{ pr.destroy(); }catch(e){} }, 400); } RT.conns = {}; RT.outCalls = {}; RT.pending = {}; RT.rxTalking.clear(); setNet('off'); pubSync(true); RT.near = []; toast('صرت «غير متصل» — ما أحد يشوفك'); }
  else { startPeer(); relayFetch(); pubSync(true); nearFetch(true); toast('رجعت متصل ✓'); }
  relayReg(); renderAll();
}

/* ─── رقم ثابت مربوط بالجهاز ─── */
async function deviceKey(){
  const D = NP('VibeDevice'); if(!D) return null;
  try{ const r = await D.getId(); const id = r && r.id; if(!id || id.length < 6) return null;
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', TE.encode('vibemap-dev|' + id))); return [...h].map(b => b.toString(16).padStart(2, '0')).join(''); }
  catch(e){ return null; }
}
function pinFromHex(hex){ const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for(let i = 0; i < 8; i++) c += A[parseInt(hex.substr(i * 3, 3), 16) % A.length]; return `VM-${c.slice(0, 4)}-${c.slice(4)}`; }
async function relayWho(dev){
  if(!RELAY) return null;
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 7000);
  try{ const r = await fetch(RELAY + '/api/whoami', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ dev }), signal:ac.signal }); const j = await r.json(); return j && PIN_STRICT.test(j.pin || '') ? j.pin : null; }
  catch(e){ return null; } finally { clearTimeout(t); }
}
async function devicePin(){ const dev = await deviceKey(); if(!dev) return { pin:null, dev:null, restored:false };
  const old = await relayWho(dev); return { pin:old || pinFromHex(dev), dev, restored:!!old }; }

/* ─── تفاعل الحالات + تصوير الشاشة ─── */
const REACTS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];
function storyReact(e){
  if(!SV || SV.mine || !REACTS.includes(e)) return; const s = SV.list[SV.i]; if(!s) return;
  (SV.reacted || (SV.reacted = {}))[s.id] = e;
  const fl = document.createElement('div'); fl.className = 'sv-fly'; fl.textContent = e; $('#storyView').appendChild(fl); setTimeout(() => fl.remove(), 1300);
  vibrate(15); if(!isDemo(SV.pin)) sendAny(SV.pin, { k:'story-react', id:s.id, e }, 'react', e);
  renderStoryView();
}
function recvStoryReact(pin, m){
  const f = S.friends[pin], x = STO.mine.find(y => y.id === m.id); if(!f || !x || !REACTS.includes(m.e)) return;
  x.reacts = x.reacts || {}; if(x.reacts[pin] === m.e) return; x.reacts[pin] = m.e; saveSto();
  toast(`${f.name} ${m.e} على حالتك`); notify(f.name, `تفاعل مع حالتك ${m.e}`); if(SV && SV.mine) renderStoryView();
}
function recvStoryShot(pin, m){
  const f = S.friends[pin], x = STO.mine.find(y => y.id === m.id); if(!f || !x) return;
  x.shots = x.shots || {}; const first = !x.shots[pin]; x.shots[pin] = now(); saveSto();
  if(first){ vibrate([60, 40, 60]); toast(`📸 ${f.name} صوّر الشاشة وهو يشوف حالتك`); notify('📸 تصوير شاشة', `${f.name} صوّر حالتك`); }
  if(SV && SV.mine) renderStoryView();
}
function onScreenshot(){
  if(SV && !SV.mine){ const s = SV.list[SV.i]; if(s && !isDemo(SV.pin)){ sendAny(SV.pin, { k:'story-shot', id:s.id }, 'shot'); toast('📸 صاحب الحالة بيوصله إنك صوّرت الشاشة'); } }
}

/* ─── عرض صورة المستخدم (بدون تصوير شاشة) ─── */
function openAvatar(pin){
  const f = pin === 'me' ? S.me : S.friends[pin] || null; if(!f) return;
  let el = $('#avView'); if(!el){ el = document.createElement('div'); el.id = 'avView'; el.className = 'avview'; document.body.appendChild(el); }
  const ph = f.photo && V.photo(f.photo);
  el.innerHTML = `<button class="iconbtn avx" data-act="av-close" aria-label="إغلاق">✕</button>
    <div class="avbig" style="${ph ? 'background:#000' : 'background:' + V.color(f.color)}">${ph ? `<img src="${esc(ph)}" alt="صورة ${esc(f.name)}" draggable="false">` : `<span>${esc(initial(f.name))}</span>`}</div>
    <div class="avname">${esc(f.name)}${badge(f)}</div>${ph && pin !== 'me' && PLATFORM === 'android' ? '<div class="avnote">🔒 تصوير الشاشة ممنوع لهذه الصورة</div>' : ''}`;
  el.hidden = false; RT.avOpen = true;
  el.oncontextmenu = e => e.preventDefault();
  if(pin !== 'me'){ const D = NP('VibeDevice'); if(D) D.setSecure({ on:true }).catch(() => {}); }
}
function closeAvatar(){ const el = $('#avView'); if(el) el.hidden = true; RT.avOpen = false; const D = NP('VibeDevice'); if(D) D.setSecure({ on:false }).catch(() => {}); }

/* ─── الساحة: منشورات عامة بالهاشتاقات ─── */
const SQ = { tag:'', items:[], trends:[], loading:false, more:true, err:'', photo:null, loaded:false };
const SQ_SUGG = ['جدة', 'الرياض', 'مكة', 'المدينة', 'الدمام', 'اليوم_الوطني', 'كشتة', 'عمرة', 'قهوة'];
function sqTagify(t){ return esc(t).replace(/#([\p{L}\p{N}_]{2,30})/gu, (m, g) => `<button class="tagl" data-act="sq-tag" data-tag="${g}">#${g}</button>`); }
function sqPostHtml(p){
  const img = p.img ? `<img class="sqimg" src="${RELAY}/api/sq/img/${encodeURIComponent(p.id)}" alt="صورة المنشور" loading="lazy">` : '';
  return `<article class="sqpost card"><div class="sqh"><span class="av" style="background:${V.color(p.c)}">${esc(initial(p.n))}</span>
    <span class="grow"><b>${esc(V.name(p.n))}</b>${lvlRt(V.lvl(p.lvl), V.num(p.rt, 0, 5))}<small>${fmtAgo(p.ts)}${p.city ? ' · 📍 ' + esc(V.str(p.city, 30)) : ''}</small></span>
    <button class="iconbtn" data-act="sq-menu" data-id="${esc(p.id)}" aria-label="خيارات المنشور">⋯</button></div>
    ${p.text ? `<div class="sqt">${sqTagify(V.str(p.text, 500))}</div>` : ''}${img}
    <div class="sqf"><button class="lk ${p.liked ? 'on' : ''}" data-act="sq-like" data-id="${esc(p.id)}" aria-label="إعجاب">${p.liked ? '❤️' : '🤍'} <span>${(+p.likes | 0) || ''}</span></button></div></article>`;
}
function squareHtml(){
  if(!RELAY) return '<div class="card empty"><b>الساحة غير متاحة</b>تحتاج اتصال بخادم VibeMap.</div>';
  const tr = SQ.trends.length ? `<div class="sqtr">${SQ.trends.slice(0, 12).map(t => `<button class="chip ${SQ.tag === t.tag ? 'hot' : ''}" data-act="sq-tag" data-tag="${esc(t.tag)}">#${esc(t.tag)} <small>${+t.n | 0}</small></button>`).join('')}</div>` : '';
  let h = `<div class="sqhead"><div class="grow"><div class="t1">${SQ.tag ? `#${esc(SQ.tag)}` : 'كل المنشورات'}</div><div class="t2">منشورات عامة تختفي بعد 3 أيام</div></div>${SQ.tag ? '<button class="btn sm" data-act="sq-tag" data-tag="">الكل</button>' : ''}<button class="btn sm grad" data-act="sq-new">${I.plus}منشور</button></div>`;
  h += tr ? `<div class="h2">🔥 الترند اليوم</div>${tr}` : '';
  if(SQ.err) h += `<div class="card empty"><b>${esc(SQ.err)}</b><button class="btn sm pri" data-act="sq-reload">إعادة المحاولة</button></div>`;
  else if(!SQ.items.length) h += SQ.loading || !SQ.loaded ? '<div class="card empty"><b>يحمّل…</b></div>' : `<div class="card empty"><b>ما فيه منشورات${SQ.tag ? ' بهذا الهاشتاق' : ''} بعد</b>كن أول من ينشر!</div>`;
  else h += SQ.items.map(sqPostHtml).join('') + (SQ.more ? `<button class="btn block" data-act="sq-more">${SQ.loading ? 'يحمّل…' : 'عرض المزيد'}</button>` : '');
  return h;
}
async function sqLoad(reset){
  if(SQ.loading) return; SQ.loading = true; if(reset){ SQ.items = []; SQ.more = true; }
  const before = !reset && SQ.items.length ? SQ.items[SQ.items.length - 1].ts : undefined;
  const [f, t] = await Promise.all([relayPost('/api/sq/feed', { tag:SQ.tag, before, blocked:Object.keys(S.blocked || {}) }), reset ? relayPost('/api/sq/trends', {}) : Promise.resolve(null)]);
  SQ.loading = false; SQ.loaded = true;
  if(!f || !Array.isArray(f.items)) SQ.err = 'تعذّر تحميل الساحة — تأكد من الإنترنت';
  else { SQ.err = ''; const seen = new Set(SQ.items.map(x => x.id)); SQ.items.push(...f.items.filter(x => x && typeof x.id === 'string' && !seen.has(x.id))); SQ.more = f.items.length >= 30; }
  if(t && Array.isArray(t.tags)) SQ.trends = t.tags.filter(x => x && typeof x.tag === 'string');
  if(RT.tab === 'stories') renderStoriesTab();
}
function sqRulesSheet(){ return `<div class="grab"></div><div class="h1">قواعد الساحة</div>
  <div class="card" style="padding:14px"><div class="t2" style="white-space:normal;line-height:2">• الساحة عامة: أي أحد في VibeMap يشوف منشورك.<br>• لا تنشر أرقام جوالات أو عناوين أو معلومات خاصة.<br>• ممنوع السب والإساءة والمحتوى غير اللائق.<br>• المنشور يختفي تلقائياً بعد 3 أيام.<br>• أي منشور يوصله 3 بلاغات يختفي فوراً.</div></div>
  <button class="btn grad block" data-act="sq-rules-ok">موافق، خلني أنشر</button>`; }
function sqComposeSheet(){ return `<div class="grab"></div><div class="h1">منشور في الساحة</div>
  <textarea class="input" id="sqText" maxlength="500" rows="4" placeholder="وش صاير؟ أضف هاشتاق مثل #جدة">${SQ.tag ? '#' + esc(SQ.tag) + ' ' : ''}</textarea>
  <div class="sqtr">${SQ_SUGG.map(t => `<button class="chip" data-act="sq-addtag" data-tag="${t}">#${t}</button>`).join('')}</div>
  <div id="sqPrev">${SQ.photo ? `<div class="sqprev"><img src="${SQ.photo}" alt=""><button class="iconbtn" data-act="sq-photo-x" aria-label="إزالة الصورة">✕</button></div>` : ''}</div>
  <div class="btns"><button class="btn" data-act="sq-photo">${I.cam}صورة</button><button class="btn grad" data-act="sq-send">نشر</button></div>
  <p class="t2" style="white-space:normal">يظهر للجميع ويختفي بعد 3 أيام.</p>`; }
function sqMenuSheet(id){ const p = SQ.items.find(x => x.id === id); if(!p) return '';
  return `<div class="grab"></div><div class="h1">المنشور</div>${p.mine
    ? `<button class="btn danger block" data-act="sq-del" data-id="${esc(id)}">حذف منشوري</button>`
    : `<button class="btn block" data-act="sq-report" data-id="${esc(id)}">🚩 إبلاغ عن المنشور</button><button class="btn danger block" data-act="sq-block" data-id="${esc(id)}" style="margin-top:8px">حظر ${esc(V.name(p.n))}</button>`}`; }
async function sqPickPhoto(){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => { const file = inp.files && inp.files[0]; if(!file) return;
    try{ let d = await compressImage(file, 1080, .72); if(d.length > 580000) d = await compressImage(file, 820, .6); if(d.length > 580000){ toast('الصورة كبيرة'); return; }
      SQ.photo = d; const pv = $('#sqPrev'); if(pv) pv.innerHTML = `<div class="sqprev"><img src="${d}" alt=""><button class="iconbtn" data-act="sq-photo-x" aria-label="إزالة الصورة">✕</button></div>`; }catch(e){ toast('تعذّر تجهيز الصورة'); } };
  inp.click();
}
async function sqSend(){
  const ta = $('#sqText'); const text = ta ? ta.value.trim() : '';
  if(!/#[\p{L}\p{N}_]{2,30}/u.test(text)){ toast('أضف هاشتاق واحد على الأقل، مثل #جدة'); return; }
  const btn = document.querySelector('[data-act=sq-send]'); if(btn){ btn.disabled = true; btn.textContent = 'ينشر…'; }
  const j = await relayPost('/api/sq/post', { text, photo:SQ.photo || undefined, name:S.me.name, color:S.me.color, lvl:myLevel(), rt:repAvg(myRep()) || 0 });
  if(!j || !j.ok){ if(btn){ btn.disabled = false; btn.textContent = 'نشر'; } toast(RL.lastErr === 'new' ? 'الحسابات الجديدة تقدر تنشر بعد 10 دقائق' : 'تعذّر النشر — حاول بعد شوي'); return; }
  SQ.photo = null; stat('sq'); closeSheet(); toast('انتشر منشورك ✓'); sqLoad(true);
}

/* ─── تكبير الرادار: تلقائي أو يدوي (أزرار + قرصة بإصبعين) ─── */
const RANGES = [150, 300, 600, 1500, 3000, 6000, 15000, 30000, 60000, 150000, 600000];
function radarZoom(dir){
  const box = $('#radarBox'); const cur = RT.zoom || (box && box._range) || 600;
  let i = RANGES.indexOf(cur); if(i < 0) i = RANGES.findIndex(x => x >= cur);
  if(dir === 'auto'){ RT.zoom = null; }
  else { i = Math.max(0, Math.min(RANGES.length - 1, i + (dir === 'in' ? -1 : 1))); RT.zoom = RANGES[i]; }
  renderStage(); const z = $('#zAuto'); if(z) z.classList.toggle('on', !RT.zoom);
}
function radarGestures(box){
  const pts = new Map(); let base = 0;
  box.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); if(pts.size === 2){ const [a, b] = [...pts.values()]; base = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); } });
  box.addEventListener('pointermove', e => { if(!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if(pts.size !== 2 || !base) return;
    const [a, b] = [...pts.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if(d / base > 1.3){ radarZoom('in'); base = d; } else if(d / base < .77){ radarZoom('out'); base = d; } });
  const up = e => { pts.delete(e.pointerId); if(pts.size < 2) base = 0; };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => box.addEventListener(ev, up));
  box.addEventListener('wheel', e => { e.preventDefault(); radarZoom(e.deltaY < 0 ? 'in' : 'out'); }, { passive:false });
}

/* ════════ v8.3: عن VibeMap — رابط الموقع وحسابات التواصل وحقوق الاستوديو ════════ */
const SOCIAL = (() => { try{ return JSON.parse((document.querySelector('meta[name=vibemap-social]') || {}).content || '{}'); }catch(e){ return {}; } })();
const SOCIAL_ICONS = {"x": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.3 22H2.2l7.7-8.8L1.8 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z\"/></svg>", "instagram": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4.2\"/><circle cx=\"17.4\" cy=\"6.6\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/></svg>", "tiktok": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.2v12.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.8a5.9 5.9 0 1 0 5 5.8V9.3a7.4 7.4 0 0 0 4.3 1.4V7.5a4.3 4.3 0 0 1-3.2-1.7Z\"/></svg>", "snapchat": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 2.5c2.8 0 5 2.1 5 5v2.3c.5.2 1.1.1 1.6-.1.6-.2 1 .6.4 1-.6.4-1.4.6-2 .8.4 1.5 1.6 2.8 3.3 3.4.5.2.4.8-.1 1-1 .4-1.7.3-2.1 1-.3.5-.2 1.2-.7 1.3-.7.2-1.7-.4-3 .3-.9.5-1.6 1.4-2.4 1.4s-1.5-.9-2.4-1.4c-1.3-.7-2.3-.1-3-.3-.5-.1-.4-.8-.7-1.3-.4-.7-1.1-.6-2.1-1-.5-.2-.6-.8-.1-1 1.7-.6 2.9-1.9 3.3-3.4-.6-.2-1.4-.4-2-.8-.6-.4-.2-1.2.4-1 .5.2 1.1.3 1.6.1V7.5c0-2.9 2.2-5 5-5Z\"/></svg>", "whatsapp": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.3-1.7-.1-.2 0-.4.1-.5l.4-.4.2-.4c.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 2 .8 2.4.6 2.8.6.4 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z\"/></svg>", "email": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/></svg>"};
const SOCIAL_LINK = { x:'https://x.com/', instagram:'https://instagram.com/', tiktok:'https://www.tiktok.com/@', snapchat:'https://www.snapchat.com/add/', whatsapp:'https://wa.me/', email:'mailto:' };
const SOCIAL_NAME = { x:'X', instagram:'انستقرام', tiktok:'تيك توك', snapchat:'سناب شات', whatsapp:'واتساب', email:'البريد' };
function socialLinks(){
  return Object.keys(SOCIAL_LINK).map(k => { const v = String(SOCIAL[k] || '').replace(/^@/, '').trim(); if(!/^[A-Za-z0-9._@+-]{2,60}$/.test(v)) return '';
    return `<a href="${SOCIAL_LINK[k]}${esc(v)}" ${k === 'email' ? '' : 'target="_blank" rel="noopener"'} aria-label="${SOCIAL_NAME[k]}" title="${SOCIAL_NAME[k]}">${SOCIAL_ICONS[k]}</a>`; }).join('');
}
function aboutCard(){
  const site = PUBLIC_URL || 'https://vibemap.s7sai.cloud';
  return `<div class="h2">عن VibeMap</div><div class="card aboutcard">
    <a class="btn grad block" href="${esc(site)}" target="_blank" rel="noopener">🌐 موقع VibeMap</a>
    <div class="social" aria-label="تابعنا">${socialLinks()}</div>
    <div class="credit">© ${new Date().getFullYear()} VibeMap — جميع الحقوق محفوظة لـ <a href="https://s7sai.cloud" target="_blank" rel="noopener">استوديو S7S.ai</a></div></div>`;
}

/* الضغط على مؤشر الاتصال يفتح التشخيص */
$('#net').style.cursor = 'pointer';
$('#net').addEventListener('click', () => { if(!S || !S.me) return; openSheet(netSheet()); });

/* PTT: ضغط مطوّل */
(() => {
  const p = $('#ptt');
  p.addEventListener('pointerdown', e => { e.preventDefault(); try{ p.setPointerCapture(e.pointerId); }catch(x){} pttDown(); });
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev => p.addEventListener(ev, () => pttUp()));
  p.addEventListener('contextmenu', e => e.preventDefault());
  p.addEventListener('keydown', e => { if((e.key === ' ' || e.key === 'Enter') && !e.repeat){ e.preventDefault(); pttDown(); } });
  p.addEventListener('keyup', e => { if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); pttUp(); } });
  document.addEventListener('keydown', e => { if(e.code === 'Space' && !e.repeat && RT.tab === 'radar' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $('#sheetWrap').hidden && $('#chatView').hidden && $('#storyView').hidden){ e.preventDefault(); pttDown(); } });
  document.addEventListener('keyup', e => { if(e.code === 'Space' && RT.talking){ e.preventDefault(); pttUp(); } });
  window.addEventListener('blur', () => pttUp());
  /* SOS: ضغط مطوّل 1.2 ثانية */
  const s = $('#sosBtn'); let t = null, fired = false;
  const cancel = () => { clearTimeout(t); t = null; s.classList.remove('arming'); };
  s.addEventListener('pointerdown', e => { e.preventDefault(); if(!feat('sos')) return; fired = false; s.classList.add('arming'); t = setTimeout(() => { cancel(); fired = true; sendSOS(); }, 1200); });
  ['pointerup','pointerleave','pointercancel'].forEach(ev => s.addEventListener(ev, cancel));
  s.addEventListener('contextmenu', e => e.preventDefault());
  s.addEventListener('click', () => { if(fired){ fired = false; return; } if(!t) openSheet(sosPickSheet()); });
})();


/* ════════ v8.4: إعدادات من لوحة التحكم ════════
   المدير يشغّل ويطفّي الميزات، ويحط إعلان أو رسالة صيانة أو يطلب تحديث — يوصل لكل الأجهزة خلال دقائق */
const FEAT_KEYS = ['square', 'nearby', 'stories', 'rooms', 'poke', 'voice', 'photos', 'sos', 'bubble'];
const FEAT_ACTS = { square:/^sq-/, stories:/^(story-|sc-|cam-post$|mute-stories$|hide-stories$)/, rooms:/^room-(new|talk)$/, poke:/^poke/, photos:/^(photo|sq-photo)$/, sos:/^(sos-|chat-sos$)/, nearby:/^(near-toggle|pub-add)$/, bubble:/^bubble-/ };
const FEAT_CSS = {
  square:'.stseg,[data-act^=sq-]', stories:'#storyBar,#storyBarC,.stseg,[data-act^=story-]',
  rooms:'[data-act=room-new]', poke:'[data-act=poke],[data-act=poke-pick]', voice:'#micBtn,#strMic', photos:'[data-act=photo],[data-act=sq-photo]',
  sos:'#sosBtn,[data-act=chat-sos]', bubble:'[data-act=bubble-toggle],[data-act=bubble-perm]', nearby:'[data-act=near-toggle],[data-act=pub-add]' };
const feat = k => !(RT.cfg && RT.cfg.flags && RT.cfg.flags[k] === false);
const featOff = () => toast('هالميزة متوقفة مؤقتاً من إدارة VibeMap');
function featOfAct(a){ for(const k in FEAT_ACTS) if(FEAT_ACTS[k].test(a) && !feat(k)) return k; return null; }
function verLess(a, b){ const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for(let i = 0; i < Math.max(x.length, y.length); i++){ const d = (x[i] || 0) - (y[i] || 0); if(d) return d < 0; } return false; }
async function cfgFetch(){
  if(!RELAY) return;
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 10000);
  try{
    const r = await fetch(RELAY + '/api/config', { cache:'no-store', signal:ac.signal }); const j = await r.json();
    if(!j || !j.ok || typeof j.flags !== 'object') return;
    RT.cfg = { flags:j.flags, ann:j.ann && typeof j.ann.text === 'string' ? j.ann : null, minVersion:V.str(j.minVersion, 12) || '', maint:V.str(j.maint, 200) || '' };
    S.settings.cfg = RT.cfg;
    const sig = typeof j.signal === 'string' && /^https:\/\/[a-z0-9.-]+(:\d+)?\/[\w\/-]*$/i.test(j.signal) ? j.signal : '';
    if(sig !== (S.settings.signal || '')){ S.settings.signal = sig; RT.sigFallback = 0;
      if(RT.peer && !RT.talking && !S.settings.offline){ const pr = RT.peer; RT.peer = null; try{ pr.destroy(); }catch(e){} RT.conns = {}; RT.pending = {}; startPeer(); } }
    save(); applyCfg();
  }catch(e){}finally{ clearTimeout(t); }
}
function applyCfg(){
  if(!RT.cfg && S.settings.cfg) RT.cfg = S.settings.cfg;
  const c = RT.cfg || {};
  let st = $('#featCss'); if(!st){ st = document.createElement('style'); st.id = 'featCss'; document.head.appendChild(st); }
  const off = FEAT_KEYS.filter(k => !feat(k));
  st.textContent = off.length ? off.map(k => FEAT_CSS[k]).join(',') + '{display:none!important}' : '';
  const tabSt = $('#t-stories'); if(tabSt) tabSt.hidden = !feat('stories') && !feat('square');
  if(!feat('square') && RT.stSeg === 'square') RT.stSeg = 'stories';
  if(!feat('stories') && feat('square')) RT.stSeg = 'square';
  if(!feat('stories') && !feat('square') && RT.tab === 'stories') setTab('radar');
  /* الشريط: صيانة أولاً، بعدها الإعلان (يقدر المستخدم يقفله) */
  const bar = $('#cfgBar');
  if(bar){
    let h = '', cls = '';
    if(c.maint){ h = `<span>🛠️</span><span class="tx">${esc(c.maint)}</span>`; cls = 'warn'; }
    else if(c.ann && S.settings.annSeen !== c.ann.id){ h = `<span>${c.ann.level === 'warn' ? '⚠️' : c.ann.level === 'ok' ? '🎉' : '📢'}</span><span class="tx">${esc(c.ann.text)}</span><button data-act="ann-x" aria-label="إغلاق">✕</button>`; cls = c.ann.level === 'warn' ? 'warn' : c.ann.level === 'ok' ? 'ok' : ''; }
    bar.className = 'cfgbar ' + cls; if(bar._h !== h){ bar.innerHTML = h; bar._h = h; } bar.hidden = !h;
  }
  /* تحديث إجباري */
  const need = c.minVersion && verLess(VERSION, c.minVersion);
  let w = $('#updWall');
  if(need && !w){ w = document.createElement('div'); w.id = 'updWall'; w.className = 'updwall';
    const store = PLATFORM === 'android' ? 'https://play.google.com/store/apps/details?id=sa.vibemap.app' : (RELAY ? new URL(RELAY).origin + '/' : '');
    w.innerHTML = `<div style="font-size:48px">⬆️</div><h2>لازم تحدّث VibeMap</h2><p>فيه إصدار جديد (${esc(c.minVersion)}) فيه تحسينات مهمة. حدّث التطبيق عشان تكمل.</p>` +
      (IS_NATIVE ? `<a class="btn grad" href="${store}" target="_blank" rel="noopener">تحديث الحين</a>` : `<button class="btn grad" data-act="upd-reload">تحديث الحين</button>`);
    document.body.appendChild(w); }
  else if(!need && w) w.remove();
  if(S && S.me) renderAll();
}

/* ════════ v8.4: نبض الاتصالات + مراقبة الشبكة ════════ */
function heartbeat(){
  const t = now(), gap = t - (RT.hbLast || t); RT.hbLast = t; let changed = false;
  for(const pin in RT.conns){
    const c = RT.conns[pin]; if(!c || !c.open) continue;
    /* ما وصلنا منه شي 45 ثانية (وهو يدعم النبض) = الاتصال ميت: نقفله ونعيد الاتصال */
    if(gap < 30000 && c._hb && t - (c._rx || c._t || t) > 45000){
      delete RT.conns[pin]; delete RT.pending[pin]; RT.rxTalking.delete(pin); try{ c.close(); }catch(e){}
      const f = S.friends[pin]; if(f){ f.seen = t; } changed = true; setTimeout(() => connectTo(pin), 800); continue;
    }
    try{ c.send({ type:'ping' }); }catch(e){}
  }
  if(changed){ save(); renderAll(); }
}
function netBack(){
  if(S.settings.offline) return;
  if(!RT.peer || RT.peer.destroyed) startPeer();
  else if(RT.peer.disconnected){ setNet('wait'); try{ RT.peer.reconnect(); }catch(e){ startPeer(); } }
  else if(RT.peer.open) setNet('on');
  setTimeout(() => { connectAll(); relayFetch(); reqRetry(); turnFetch(); }, 1200);
}

/* ════════ v7.9: زر الرجوع ════════
   يرجع خطوة وحدة (يقفل الكاميرا/الحالة/النافذة/المحادثة/الواقع المعزز، ثم يرجع للرادار).
   في الرادار: أندرويد يخلي التطبيق يشتغل في الخلفية بدل ما يقفله. */
function vmBack(){
  try{
    if(RT.avOpen){ closeAvatar(); return true; }
    if(CAM){ camClose(); return true; }
    if(SV){ closeStories(); return true; }
    if(!$('#sheetWrap').hidden){ closeSheet(); return true; }
    if(!$('#sosAlert').hidden){ stopSosAlert(); return true; }
    if(RT.chatWith){ closeChat(); return true; }
    if(!$('#onboard').hidden) return false;
    if(RT.tab === 'radar' && RT.mode === 'ar'){ stopAR(); return true; }
    if(RT.tab !== 'radar'){ setTab('radar'); return true; }
  }catch(e){ console.warn('back', e); }
  return false;
}
window.vmBack = vmBack;
/* في المتصفح: نفس السلوك مع زر الرجوع في الجوال */
if(PLATFORM === 'web'){
  try{
    history.pushState({ vm:1 }, '');
    window.addEventListener('popstate', () => { if(vmBack()) history.pushState({ vm:1 }, ''); else history.back(); });
  }catch(e){}
}

/* مكتبة الاتصال أحياناً تطلق خطأ داخلي بعد قفل اتصال (سباق توقيت) — ما يأثر على شي، نمنعه يطلع كخطأ */
window.addEventListener('error', e => { if(e && /vendor\/peerjs/.test(e.filename || '') && /_initializeDataChannel|reading 'type'/.test(String(e.message))) e.preventDefault(); });
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('bgd', document.visibilityState !== 'visible');
  geoRefresh();
  if(document.visibilityState !== 'visible' && RT.mode === 'ar'){ stopAR(); RT.arResume = true; }
  if(document.visibilityState !== 'visible' && !RT.talking && !RT.rec) releaseMicNow();
  if(CAM && CAM.mode === 'live'){ if(document.visibilityState !== 'visible') camStopStream(); else camStart(); }
  if(document.visibilityState === 'visible' && RT.arResume && RT.tab === 'radar'){ RT.arResume = false; startAR(); }
  if(document.visibilityState === 'visible'){
    applyWake(); bgRefresh().then(() => { if(RT.tab === 'me') renderAll(); });
    if(RT.peer && !RT.peer.destroyed && RT.peer.disconnected){ try{ RT.peer.reconnect(); }catch(e){} }
    else if(!RT.peer || RT.peer.destroyed) startPeer();
    connectAll(); if(RT.chatWith) markRead(RT.chatWith); renderAll();
  } else pttUp();
});
window.addEventListener('online', netBack);
window.addEventListener('offline', () => { if(!S || !S.me || S.settings.offline) return; setNet('down'); });
{ const nc = navigator.connection; if(nc && nc.addEventListener) nc.addEventListener('change', () => { if(S && S.me && navigator.onLine !== false) setTimeout(netBack, 1500); }); }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); RT.installEvt = e; if(RT.tab === 'me') renderMe(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if(S) applyTheme(); });

function renderAll(){
  if(!S || !S.me) return;
  renderTabs(); renderToolbar(); renderStories();
  if(RT.tab === 'radar') renderStage();
  if(RT.tab === 'chats') renderChats();
  if(RT.tab === 'stories') renderStoriesTab();
  if(RT.tab === 'friends') renderFriends();
  if(RT.tab === 'me' && !(document.activeElement && /INPUT/.test(document.activeElement.tagName) && $('#v-me').contains(document.activeElement))) renderMe();
  if(RT.chatWith) renderChat();
  if(sheetPin && S.friends[sheetPin] && !$('#sheetWrap').hidden && $('#rmBox') && !$('#rmBox').querySelector('[data-act=remove]')) { const sc = $('#sheet').scrollTop; $('#sheet').innerHTML = friendSheet(sheetPin); $('#sheet').scrollTop = sc; }
  renderTalk();
}

/* ════════ البداية ════════ */
function showOnboard(){
  const ob = $('#onboard'); ob.hidden = false; let color = COLORS[0];
  ob.innerHTML = `<div class="ob"><img class="logo" src="icons/icon-192.png" alt="شعار VibeMap"><h1>لاسلكي حقيقي بينك وبين مجتمعك</h1>
  <p>اضغط وتحدث، شاهد أصدقاءك على الرادار، وأرسل رسائل مشفّرة. بلا حساب وبلا خوادم تحفظ كلامك.</p>
  <form id="obForm" style="display:flex;flex-direction:column;gap:12px"><label for="obName" class="t1">ما اسمك؟</label><input class="input" id="obName" placeholder="مثال: حسين" maxlength="24" required>
  <div class="t1">اختر لونك</div><div class="swatches" id="obColors">${COLORS.slice(0, 6).map((c, i) => `<button type="button" style="background:${c}" class="${i ? '' : 'on'}" data-c="${c}" aria-label="لون"></button>`).join('')}</div>
  <div class="card" style="padding:14px;display:flex;flex-direction:column;gap:12px">
    <div class="perm">${I.mic}<span><b>الميكروفون</b>عند الضغط على زر التحدث فقط.</span></div>
    <div class="perm">${I.radar}<span><b>الموقع</b>يُرسل مشفّراً لأصدقائك فقط، ويمكنك إخفاؤه متى شئت.</span></div>
    <div class="perm">${I.cam}<span><b>الكاميرا</b>لوضع AR ومسح رموز الأصدقاء وإرسال الصور.</span></div>
  </div>
  <button class="btn grad block" type="submit" style="padding:15px;font-size:16px">ابدأ</button></form></div>`;
  $('#obColors').onclick = e => { const b = e.target.closest('[data-c]'); if(!b) return; color = b.dataset.c; [...$('#obColors').children].forEach(x => x.classList.toggle('on', x === b)); };
  $('#obForm').onsubmit = async e => { e.preventDefault(); const name = $('#obName').value.trim(); if(!name) return;
    ctx(); unlockAudio();
    const btn = $('#obForm button[type=submit]'); if(btn){ btn.disabled = true; btn.textContent = 'لحظة…'; }
    const dp = await devicePin();
    S = defaults(); S.m78 = 1; S.me = { pin:dp.pin || makePin(), name, color, created:now() }; if(dp.dev) RT.dev = dp.dev; save();
    ob.hidden = true; await boot(); toast(dp.restored ? `رجع لك رقمك القديم ${S.me.pin} ✓` : `رقمك في VibeMap هو ${S.me.pin}`); };
}
async function boot(){
  applyTheme();
  await ensureKeys();
  MSG = (await idb.get('msgs')) || {};
  STO = (await idb.get('stories')) || { mine:[], fr:{}, sent:{} }; STO.mine = STO.mine || []; STO.fr = STO.fr || {}; STO.sent = STO.sent || {};
  /* v7: تنظيف بيانات قديمة ربما خُزّنت قبل إضافة الفحص */
  Object.values(S.friends).forEach(f => { f.color = V.color(f.color); f.name = f.status === 'out' ? f.name : V.name(f.name); f.rep = f.demo ? f.rep : V.rep(f.rep); });
  for(const p in MSG){ MSG[p] = (MSG[p] || []).filter(m => m.type !== 'photo' || V.photo(m.data)); }
  applyDemo();
  RT.tab = 'radar'; setTab('radar');
  applyCfg(); await Promise.race([cfgFetch(), new Promise(r => setTimeout(r, 2500))]);
  startPeer(); startGeo(); applyWake();
  const q = new URLSearchParams(location.search).get('add');
  if(q && PIN_RE.test(q)){ history.replaceState(null, '', location.pathname); setTimeout(() => confirmAdd(q), 800); }
  hwInit(); bgInit(); relayInit(); renderSosBtn();
  /* v8.2: بصمة الجهاز ما تنحفظ في التخزين — تنحسب كل مرة من النظام */
  if(S.me.dev){ delete S.me.dev; save(); }
  deviceKey().then(d => { if(d){ RT.dev = d; relayReg(); } });
  { const D = NP('VibeDevice'); if(D) D.addListener('screenshot', onScreenshot).catch(() => {}); }
  setInterval(() => { pubSync(); nearFetch(); }, 30000); setTimeout(() => { pubSync(true); nearFetch(true); }, 4000);
  if(S.account && FB_CFG) setTimeout(() => acInit().then(() => bkSoon()).catch(() => {}), 2500);
  { const LN = NP('LocalNotifications'); if(LN) LN.checkPermissions().then(r => { RT.lnPerm = r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default'; }).catch(() => {}); }
  setInterval(sweep, 2000);
  setInterval(heartbeat, 15000); setInterval(() => { cfgFetch(); turnFetch(); }, 600e3);
  setInterval(() => { if(document.visibilityState === 'visible') reqRetry(); }, 15000);
  setInterval(() => { connectAll(); if(RT.tab === 'radar') renderStage(); Object.values(S.friends).forEach(f => { if(f.rateQueued && isOnline(f.pin) && f.myRating){ sendEnc(f.pin, { k:'rate', ...f.myRating }).then(ok => { if(ok){ f.rateQueued = false; save(); } }); } }); }, 15000);
  setInterval(() => { if(S.settings.demo && RT.tab === 'radar' && !RT.talking && document.visibilityState === 'visible') renderStage(); }, S.settings.eco ? 5000 : 3000);
}
if(!IS_NATIVE && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
(async () => {
  if(!window.isSecureContext || !crypto.subtle){
    document.body.innerHTML = '<div style="padding:32px;font-family:sans-serif;text-align:center;line-height:1.8">VibeMap يحتاج رابطاً آمناً يبدأ بـ <b>https://</b><br>ارفع المجلد على Netlify أو GitHub Pages ثم افتحه من الرابط.</div>'; return;
  }
  S = load();
  applyTheme(); applyLang();
  if(!S){ S = null; showOnboard(); } else await boot();
})();
