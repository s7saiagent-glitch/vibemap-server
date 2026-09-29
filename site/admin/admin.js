/* VibeMap — لوحة التحكم v8.6 */
(() => {
  'use strict';
  const API = (document.querySelector('meta[name=vibemap-api]') || {}).content || '/relay/api/';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('en-US');
  const N = n => nf.format(n || 0);
  let TOKEN = '', ME = null;
  const ROLE = { owner: 'المالك', admin: 'مدير', mod: 'مشرف' };
  const can = (...r) => ME && r.includes(ME.role);
  try { TOKEN = sessionStorage.getItem('vmadm') || ''; } catch (e) {}

  const FLAGS = {
    register: ['تسجيل مستخدمين جدد', 'لو قفلته ما يقدر أحد جديد يسجل، والموجودين يكملون عادي.'],
    voice: ['الرسائل الصوتية', 'تسجيل وإرسال الفويس بين الأصدقاء.'],
    photos: ['الصور', 'إرسال الصور في المحادثات.'],
    stories: ['القصص', 'نشر ومشاهدة القصص.'],
    rooms: ['الغرف', 'غرف الكلام الجماعية.'],
    square: ['الساحة والهاشتاقات', 'الصفحة العامة للمنشورات والهاشتاقات.'],
    nearby: ['الظهور للعامة', 'يشوفك الناس القريبين في الرادار ويرسلون لك.'],
    poke: ['النكزة', 'زر النكزة بين الأصدقاء.'],
    sos: ['الاستغاثة', 'زر طلب المساعدة. ننصح يظل شغال.'],
    bubble: ['الفقاعة العائمة', 'زر الكلام السريع فوق التطبيقات (أندرويد).']
  };
  const PLAT = { android: 'أندرويد', ios: 'آيفون', web: 'المتصفح' };
  const ERR = { auth: 'انتهت الجلسة، ادخل من جديد', bad: 'اسم المستخدم أو كلمة السر غلط', role: 'ما عندك صلاحية لهالشي', oldpw: 'كلمة السر الحالية غلط', weak: 'كلمة السر لازم 8 أحرف أو أكثر', user: 'اسم المستخدم: 3 إلى 24 حرف إنجليزي صغير أو رقم', max: 'وصلت الحد الأعلى للحسابات', owner: 'ما تقدر تحذف حساب المالك', slow: 'محاولات كثيرة، انتظر شوي وجرب', noadmin: 'حساب المدير مو مجهز على السيرفر — شغّل أمر التثبيت', nopush: 'الإشعارات مو مفعّلة على السيرفر', empty: 'اكتب نص أول', nf: 'ما لقيناه', net: 'ما قدرنا نوصل للسيرفر' };

  /* ─── الاتصال ─── */
  async function call(ep, body = {}) {
    let r, j;
    try {
      r = await fetch(API + ep, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ token: TOKEN }, body)), cache: 'no-store' });
      j = await r.json().catch(() => ({}));
    } catch (e) { throw new Error('net'); }
    if (r.status === 401 && ep !== 'admin/login') { logout(true); throw new Error('auth'); }
    if (!r.ok || !j.ok) throw new Error(j.err || 'net');
    return j;
  }
  const msg = e => ERR[e && e.message] || 'صار خطأ، جرب مرة ثانية';

  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }

  function ago(ts) {
    if (!ts) return '—';
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 90) return 'الحين';
    if (s < 3600) return 'قبل ' + Math.round(s / 60) + ' د';
    if (s < 86400) return 'قبل ' + Math.round(s / 3600) + ' س';
    if (s < 86400 * 60) return 'قبل ' + Math.round(s / 86400) + ' يوم';
    return new Date(ts).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn');
  }
  const dstr = ts => ts ? new Date(ts).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  /* ─── الدخول والخروج ─── */
  function showLogin() { $('#app').hidden = true; $('#loginView').hidden = false; setTimeout(() => ($('#user').value ? $('#pw') : $('#user')).focus(), 30); }
  async function showApp() {
    if (!ME) { try { ME = (await call('admin/me')).me; } catch (e) { if (e.message !== 'auth') showLogin(); return; } }
    $('#loginView').hidden = true; $('#app').hidden = false;
    { const nm = ME.name || ME.u, rl = ROLE[ME.role] || ''; $('#meChip').textContent = nm === rl ? nm : `${nm} · ${rl}`; }
    /* المشرف: المشتركين والساحة بس */
    ['tools', 'news'].forEach(t => { const b = document.querySelector(`.tabs [data-tab=${t}]`); if (b) b.hidden = !can('owner', 'admin'); });
    if (!can('owner', 'admin') && (cur === 'tools' || cur === 'news')) cur = 'overview';
    go(cur);
  }
  function logout(expired) {
    if (TOKEN && !expired) fetch(API + 'admin/logout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: TOKEN }) }).catch(() => {});
    TOKEN = ''; ME = null; try { sessionStorage.removeItem('vmadm'); } catch (e) {}
    if (expired) $('#loginErr').textContent = ERR.auth;
    showLogin();
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#loginBtn'); btn.disabled = true; $('#loginErr').textContent = '';
    try {
      const j = await call('admin/login', { user: $('#user').value.trim().toLowerCase(), password: $('#pw').value });
      TOKEN = j.token; ME = j.me; try { sessionStorage.setItem('vmadm', TOKEN); } catch (er) {}
      $('#pw').value = ''; showApp();
    } catch (er) { $('#loginErr').textContent = msg(er); }
    btn.disabled = false;
  });

  /* ─── التبويب ─── */
  let cur = 'overview';
  const LOAD = { overview: loadOverview, users: loadUsers, tools: loadTools, square: loadSquare, news: loadNews, settings: loadSettings };
  function go(tab) {
    cur = tab;
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    Object.keys(LOAD).forEach(k => { $('#t-' + k).hidden = k !== tab; });
    LOAD[tab]();
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (t) return go(t.dataset.tab);
    const a = e.target.closest('[data-act]');
    if (a && a.dataset.act === 'logout') logout();
    if (a && a.dataset.act === 'refresh') { LOAD[cur](); toast('تم التحديث'); }
  });
  const loading = el => { el.innerHTML = '<div class="empty">جاري التحميل…</div>'; };
  const failed = (el, e, retry) => { el.innerHTML = `<div class="card empty">${esc(msg(e))}<br><button class="btn sm" style="margin-top:10px">حاول مرة ثانية</button></div>`; el.querySelector('button').onclick = retry; };

  /* ═══ نظرة عامة ═══ */
  async function loadOverview() {
    const el = $('#t-overview'); if (!el.dataset.ok) loading(el);
    let s; try { s = await call('admin/stats'); } catch (e) { if (e.message !== 'auth') failed(el, e, loadOverview); return; }
    el.dataset.ok = 1;
    const kpi = (l, v, h) => `<div class="card kpi"><div class="l">${l}</div><div class="v">${v}</div><div class="h">${h}</div></div>`;
    const pt = s.plat || {}, pTot = Math.max(1, (pt.android || 0) + (pt.ios || 0) + (pt.web || 0));
    const sum30 = s.perDay.reduce((a, x) => a + x.n, 0);
    el.innerHTML = `
      <h2>نظرة عامة</h2><p class="sub">أرقام التطبيق الحين. تتحدث لما تضغط تحديث.</p>
      <div class="grid kpis">
        ${kpi('كل المشتركين', N(s.users), s.banned ? `+ ${N(s.banned)} محظور` : 'ولا أحد محظور')}
        ${kpi('نشطين اليوم', N(s.active24), `${N(s.active7)} هالأسبوع · ${N(s.active30)} هالشهر`)}
        ${kpi('جدد اليوم', N(s.newToday), `${N(sum30)} آخر 30 يوم`)}
        ${kpi('ظاهرين للعامة الحين', N(s.publicNow), 'في الرادار العام')}
        ${kpi('الإشعارات مفعّلة', N(s.push), s.users ? Math.round(s.push / s.users * 100) + '% من المشتركين' : '—')}
        ${kpi('منشورات الساحة', N(s.posts.active), `${N(s.posts.reported)} مبلّغ عنه · ${N(s.posts.hidden)} مخفي`)}
      </div>
      <div class="grid two">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
            <div><h3>التسجيلات الجديدة يومياً</h3><div class="note">آخر 30 يوم</div></div>
            <button class="linkbtn" id="tvBtn" aria-expanded="false">عرض كجدول</button>
          </div>
          <div class="chart" id="chart"></div>
          <div id="tview" hidden></div>
        </div>
        <div class="card">
          <h3>الأجهزة</h3><div class="note">توزيع المشتركين</div>
          <div class="plat">${['android', 'ios', 'web'].map(k => `
            <div class="row"><span>${PLAT[k]}</span><div class="track"><div class="fill" style="width:${((pt[k] || 0) / pTot * 100).toFixed(1)}%"></div></div><span class="n">${N(pt[k])}</span></div>`).join('')}
          </div>
          <h3 style="margin-top:22px">حالة السيرفر</h3>
          <div class="health">
            <div><span class="dot ${s.fcm ? 'ok' : 'bad'}"></span>الإشعارات<b>${s.fcm ? 'شغّالة' : 'مو مفعّلة'}</b></div>
            <div><span class="dot ${s.turn ? 'ok' : 'bad'}"></span>خادم TURN<b>${s.turn ? 'شغّال' : 'مو مجهز'}</b></div>
            <div><span class="dot ${s.signal ? 'ok' : 'bad'}"></span>خادم التعارف<b>${s.signal ? 'خاص بـ VibeMap' : 'العام (PeerJS)'}</b></div>
            <div>مدة التشغيل<b>${s.uptimeH < 1 ? 'أقل من ساعة' : s.uptimeH < 48 ? Math.round(s.uptimeH) + ' ساعة' : Math.round(s.uptimeH / 24) + ' يوم'}</b></div>
            <div>الذاكرة<b>${N(s.memMB)} MB</b></div>
            <div>صناديق الرسائل<b>${N(s.boxes)}</b></div>
            <div>التخزين<b>${s.diskMB} MB</b></div>
          </div>
        </div>
      </div>`;
    drawChart($('#chart'), s.perDay);
    const tv = $('#tview');
    tv.innerHTML = `<table class="tview"><thead><tr><th>اليوم</th><th>تسجيلات</th></tr></thead><tbody>${s.perDay.slice().reverse().map(x => `<tr><td>${esc(x.d)}</td><td>${N(x.n)}</td></tr>`).join('')}</tbody></table>`;
    $('#tvBtn').onclick = e => { const open = tv.hidden; tv.hidden = !open; e.target.textContent = open ? 'إخفاء الجدول' : 'عرض كجدول'; e.target.setAttribute('aria-expanded', open); };
  }

  function drawChart(host, data) {
    const W = Math.max(300, host.clientWidth || 600), Hh = 220, padT = 12, padB = 26, padL = 34, padR = 6;
    const max = Math.max(1, ...data.map(d => d.n));
    const step = niceStep(max), top = Math.ceil(max / step) * step;
    const iw = W - padL - padR, ih = Hh - padT - padB, n = data.length, slot = iw / n;
    const bw = Math.max(2, Math.min(24, slot - 2));
    const y = v => padT + ih - v / top * ih;
    let g = '';
    for (let v = 0; v <= top; v += step) g += `<line class="gl" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${N(v)}</text>`;
    // الأيام من اليسار (قديم) إلى اليمين (اليوم) — محور زمني
    const lblEvery = Math.ceil(n / Math.max(2, Math.floor(iw / 70)));
    data.forEach((d, i) => {
      const cx = padL + slot * i + slot / 2, x = cx - bw / 2, h = d.n ? Math.max(2, y(0) - y(d.n)) : 0, r = Math.min(4, bw / 2, h);
      const path = h ? `M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${bw - 2 * r} q${r},0 ${r},${r} v${h - r} z` : '';
      g += `<g class="col" data-i="${i}"><rect class="hit" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${ih}"/>${path ? `<path class="b" d="${path}"/>` : ''}</g>`;
      if ((n - 1 - i) % lblEvery === 0) g += `<text class="ax" x="${cx}" y="${Hh - 6}" text-anchor="middle">${esc(d.d.slice(8))}/${esc(d.d.slice(5, 7))}</text>`;
    });
    host.innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="التسجيلات الجديدة يومياً آخر 30 يوم" direction="ltr">${g}</svg><div class="tip"></div>`;
    const tip = host.querySelector('.tip');
    host.querySelectorAll('g.col').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const d = data[+el.dataset.i], hb = host.getBoundingClientRect(), rb = el.querySelector('.hit').getBoundingClientRect();
        tip.innerHTML = `<b>${N(d.n)}</b> تسجيل · ${esc(d.d)}`;
        tip.style.left = (rb.left - hb.left + rb.width / 2) + 'px';
        tip.style.top = Math.max(28, y(d.n) * (hb.height / Hh)) + 'px';
        tip.style.opacity = 1;
      });
      el.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
    });
  }
  function niceStep(max) { const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return Math.max(1, (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p); }
  let rzT; addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (cur === 'overview' && !$('#app').hidden) loadOverview(); }, 250); });

  /* ═══ المشتركين ═══ */
  const US = { q: '', page: 0, sort: 'seen' };
  async function loadUsers() {
    const el = $('#t-users');
    if (!el.dataset.ok) {
      el.dataset.ok = 1;
      el.innerHTML = `<h2>المشتركين</h2><p class="sub">ابحث بالاسم أو الرقم. تقدر تحظر أي حساب مزعج أو تمسح محتواه العام.</p>
        <div class="bar">
          <input class="input" id="uq" type="search" placeholder="اسم أو رقم مثل VM-AB12-CD34" aria-label="بحث">
          <select class="input" id="us" aria-label="الترتيب"><option value="seen">آخر ظهور</option><option value="new">الأحدث تسجيلاً</option></select>
          <span class="note" id="utot"></span>
        </div>
        <div class="card scroll" id="ulist"></div><div class="pager" id="upg"></div>`;
      let qT; $('#uq').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { US.q = e.target.value; US.page = 0; loadUsers(); }, 300); });
      $('#us').addEventListener('change', e => { US.sort = e.target.value; US.page = 0; loadUsers(); });
      $('#ulist').addEventListener('click', userAct);
      $('#upg').addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) { US.page += +b.dataset.pg; loadUsers(); } });
    }
    const box = $('#ulist'); if (!box.innerHTML) loading(box);
    let j; try { j = await call('admin/users', US); } catch (e) { if (e.message !== 'auth') failed(box, e, loadUsers); return; }
    $('#utot').textContent = `${N(j.total)} حساب`;
    if (!j.items.length) { box.innerHTML = `<div class="empty">${US.q ? 'ما فيه نتائج لهالبحث' : 'ما فيه مشتركين للحين'}</div>`; $('#upg').innerHTML = ''; return; }
    box.innerHTML = `<table class="tbl"><thead><tr><th>الاسم</th><th>الرقم</th><th>الجهاز</th><th>سجّل</th><th>آخر ظهور</th><th>أصدقاء</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${j.items.map(u => `<tr>
        <td>${u.name ? esc(u.name) : '<span class="note">بدون اسم عام</span>'}</td>
        <td class="mono">${esc(u.pin)}</td>
        <td>${PLAT[u.plat] || esc(u.plat)}</td>
        <td title="${esc(new Date(u.ts).toISOString())}">${dstr(u.ts)}</td>
        <td>${ago(u.seen)}</td>
        <td>${N(u.friends)}</td>
        <td>${u.banned ? '<span class="pill bad">⛔ محظور</span>' : Date.now() - u.seen < 3e5 ? '<span class="pill ok">● متصل</span>' : '<span class="pill">غير متصل</span>'}${u.pub ? ' <span class="pill warn">ظاهر للعامة</span>' : ''}${u.push ? '' : ' <span class="pill" title="الإشعارات مو مفعّلة">🔕</span>'}</td>
        <td style="white-space:nowrap">${u.banned ? `<button class="btn sm" data-u="unban" data-pin="${esc(u.pin)}">فك الحظر</button>` : `<button class="btn sm bad" data-u="ban" data-pin="${esc(u.pin)}">حظر</button>`}
          <button class="btn sm" data-u="wipe" data-pin="${esc(u.pin)}" title="يمسح منشوراته في الساحة وظهوره العام ورسائله المنتظرة">مسح المحتوى</button></td>
      </tr>`).join('')}</tbody></table>`;
    const pages = Math.ceil(j.total / 50);
    $('#upg').innerHTML = pages > 1 ? `<button class="btn sm" data-pg="-1" ${US.page ? '' : 'disabled'}>السابق</button><span>صفحة ${US.page + 1} من ${pages}</span><button class="btn sm" data-pg="1" ${US.page + 1 < pages ? '' : 'disabled'}>التالي</button>` : '';
  }
  async function userAct(e) {
    const b = e.target.closest('[data-u]'); if (!b) return;
    const act = b.dataset.u, pin = b.dataset.pin;
    const q = { ban: `حظر ${pin}؟\nما يقدر يستخدم التطبيق، وتنخفي منشوراته.`, unban: `فك الحظر عن ${pin}؟`, wipe: `مسح محتوى ${pin}؟\nتنحذف منشوراته في الساحة ورسائله المنتظرة. ما ينسترجع.` }[act];
    if (!confirm(q)) return;
    b.disabled = true;
    try { await call('admin/user', { pin, act }); toast({ ban: 'تم الحظر', unban: 'تم فك الحظر', wipe: 'تم مسح المحتوى' }[act]); loadUsers(); }
    catch (er) { toast(msg(er)); b.disabled = false; }
  }

  /* ═══ أدوات التطبيق ═══ */
  let CFG = null;
  async function loadTools() {
    const el = $('#t-tools'); loading(el);
    try { CFG = (await call('admin/config')).config; } catch (e) { if (e.message !== 'auth') failed(el, e, loadTools); return; }
    const keys = Object.keys(FLAGS).filter(k => k in CFG.flags);
    el.innerHTML = `<h2>أدوات التطبيق</h2><p class="sub">شغّل أو طفّ أي ميزة. التغيير يوصل لكل المستخدمين خلال دقائق بدون تحديث التطبيق.</p>
      <div class="flags">${keys.map(k => `<div class="card flag"><div class="t"><b>${FLAGS[k][0]}</b><span>${FLAGS[k][1]}</span></div>
        <button class="sw" role="switch" aria-checked="${!!CFG.flags[k]}" aria-label="${FLAGS[k][0]}" data-flag="${k}"></button></div>`).join('')}</div>
      <div class="card" style="margin-top:14px"><h3>الصيانة والتحديث الإجباري</h3>
        <div class="fields">
          <label class="f">رسالة صيانة (تظهر كشريط أعلى التطبيق — اتركها فاضية لو ما فيه صيانة)
            <input class="input" id="maint" maxlength="200" value="${esc(CFG.maint)}" placeholder="مثال: صيانة الليلة من 2 إلى 3 الفجر"></label>
          <label class="f">أقل إصدار مسموح (اللي أقدم منه يطلب منه يحدّث)
            <input class="input mono" id="minv" maxlength="12" value="${esc(CFG.minVersion)}" placeholder="مثال: 8.4" inputmode="decimal"></label>
        </div></div>
      <div class="save"><button class="btn pri" id="saveTools">حفظ التغييرات</button><span class="ok-msg" id="saveMsg"></span></div>`;
    el.querySelectorAll('.sw').forEach(s => s.onclick = () => {
      const on = s.getAttribute('aria-checked') !== 'true';
      if (!on && s.dataset.flag === 'sos' && !confirm('متأكد تطفي الاستغاثة؟ ممكن أحد يحتاجها.')) return;
      s.setAttribute('aria-checked', on); $('#saveMsg').textContent = 'فيه تغييرات ما انحفظت';
    });
    $('#saveTools').onclick = async ev => {
      const minv = $('#minv').value.trim();
      if (minv && !/^\d{1,3}(\.\d{1,3}){0,2}$/.test(minv)) return toast('اكتب الإصدار أرقام مثل 8.4');
      const flags = {}; el.querySelectorAll('.sw').forEach(s => { flags[s.dataset.flag] = s.getAttribute('aria-checked') === 'true'; });
      ev.target.disabled = true;
      try { CFG = (await call('admin/config', { set: { flags, maint: $('#maint').value.trim(), minVersion: minv } })).config; $('#saveMsg').textContent = '✓ انحفظ'; toast('انحفظت الإعدادات'); }
      catch (er) { toast(msg(er)); }
      ev.target.disabled = false;
    };
  }

  /* ═══ الساحة ═══ */
  let SQF = 'reported';
  async function loadSquare() {
    const el = $('#t-square');
    if (!el.dataset.ok) {
      el.dataset.ok = 1;
      el.innerHTML = `<h2>الساحة</h2><p class="sub">راجع المنشورات العامة. المنشور اللي يوصله بلاغات كثيرة ينخفي تلقائياً لين تراجعه.</p>
        <div class="bar"><select class="input" id="sqf" aria-label="تصفية">
          <option value="reported">المبلّغ عنها</option><option value="hidden">المخفية</option><option value="all">الكل</option></select></div>
        <div id="sqlist"></div>`;
      $('#sqf').value = SQF;
      $('#sqf').onchange = e => { SQF = e.target.value; loadSquare(); };
      $('#sqlist').addEventListener('click', sqAct);
    }
    const box = $('#sqlist'); loading(box);
    let j; try { j = await call('admin/sq', { filter: SQF }); } catch (e) { if (e.message !== 'auth') failed(box, e, loadSquare); return; }
    if (!j.items.length) { box.innerHTML = `<div class="card empty">${{ reported: 'ما فيه بلاغات 👌', hidden: 'ما فيه منشورات مخفية', all: 'الساحة فاضية للحين' }[SQF]}</div>`; return; }
    box.innerHTML = `<div class="posts">${j.items.map(p => `<div class="card post${p.hidden ? ' hid' : ''}">
      <div class="h"><span><b style="color:var(--ink)">${esc(p.n || 'بدون اسم')}</b> · <span class="mono">${esc(p.pin)}</span></span><span>${ago(p.ts)}</span></div>
      ${p.text ? `<div class="tx">${esc(p.text)}</div>` : ''}
      ${p.img ? `<img alt="صورة المنشور" loading="lazy" data-src="${esc(API + 'sq/img/' + encodeURIComponent(p.id))}">` : ''}
      <div class="h"><span>❤ ${N(p.likes)} · 🚩 ${N(p.reports)} بلاغ</span>${p.hidden ? '<span class="pill warn">مخفي</span>' : ''}</div>
      <div class="acts">${p.hidden ? `<button class="btn sm" data-sq="show" data-id="${esc(p.id)}">إظهار وتصفير البلاغات</button>` : `<button class="btn sm" data-sq="hide" data-id="${esc(p.id)}">إخفاء</button>`}
        <button class="btn sm bad" data-sq="del" data-id="${esc(p.id)}">حذف نهائي</button>
        <button class="btn sm" data-ban="${esc(p.pin)}">حظر الكاتب</button></div></div>`).join('')}</div>`;
    box.querySelectorAll('img[data-src]').forEach(im => { im.onerror = () => { im.replaceWith(Object.assign(document.createElement('div'), { className: 'note', textContent: '🖼️ الصورة مخفية' })); }; im.src = im.dataset.src; });
  }
  async function sqAct(e) {
    const bb = e.target.closest('[data-ban]');
    if (bb) {
      if (!confirm(`حظر ${bb.dataset.ban}؟`)) return;
      try { await call('admin/user', { pin: bb.dataset.ban, act: 'ban' }); toast('تم الحظر'); loadSquare(); } catch (er) { toast(msg(er)); }
      return;
    }
    const b = e.target.closest('[data-sq]'); if (!b) return;
    if (b.dataset.sq === 'del' && !confirm('حذف المنشور نهائياً؟')) return;
    b.disabled = true;
    try { await call('admin/sq/act', { id: b.dataset.id, act: b.dataset.sq }); toast({ hide: 'انخفى', show: 'رجع ظاهر', del: 'انحذف' }[b.dataset.sq]); loadSquare(); }
    catch (er) { toast(msg(er)); b.disabled = false; }
  }

  /* ═══ الإعلانات ═══ */
  async function loadNews() {
    const el = $('#t-news'); loading(el);
    let c; try { c = (await call('admin/config')).config; } catch (e) { if (e.message !== 'auth') failed(el, e, loadNews); return; }
    const a = c.ann;
    el.innerHTML = `<h2>الإعلانات</h2><p class="sub">طريقتين توصل فيها للمستخدمين.</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
        <div class="card"><h3>شريط داخل التطبيق</h3><div class="note">يظهر أعلى التطبيق لكل من يفتحه، ويقدر يقفله.</div>
          ${a ? `<div class="card" style="margin-top:12px;background:var(--surface2)"><span class="pill ${a.level === 'warn' ? 'warn' : a.level === 'ok' ? 'ok' : ''}">الحالي · ${ago(a.ts)}</span><div class="tx" style="margin-top:6px">${esc(a.text)}</div></div>` : '<div class="note" style="margin-top:12px">ما فيه إعلان الحين.</div>'}
          <div class="fields" style="grid-template-columns:1fr">
            <label class="f">نص الإعلان<textarea class="input" id="annT" rows="3" maxlength="300" placeholder="مثال: نزل تحديث جديد فيه ميزة الغرف 🎉"></textarea></label>
            <label class="f">النوع<select class="input" id="annL"><option value="info">معلومة</option><option value="ok">خبر حلو</option><option value="warn">تنبيه</option></select></label>
          </div>
          <div class="save"><button class="btn pri" id="annSet">نشر الإعلان</button>${a ? '<button class="btn bad" id="annClr">إزالة الإعلان</button>' : ''}</div>
        </div>
        <div class="card"><h3>إشعار لكل المستخدمين</h3><div class="note">يوصل كإشعار على جوالاتهم حتى لو التطبيق مقفل. استخدمه بحدود — 5 مرات باليوم كحد أقصى.</div>
          <div class="fields" style="grid-template-columns:1fr">
            <label class="f">نص الإشعار<textarea class="input" id="bcT" rows="3" maxlength="180" placeholder="مثال: جرّب ميزة الساحة الجديدة!"></textarea></label>
          </div>
          <div class="save"><button class="btn grad" id="bcSend">إرسال للكل</button><span class="note" id="bcMsg"></span></div>
        </div>
      </div>`;
    $('#annSet').onclick = async ev => {
      const text = $('#annT').value.trim(); if (!text) return toast(ERR.empty);
      ev.target.disabled = true;
      try { await call('admin/config', { set: { ann: { text, level: $('#annL').value } } }); toast('انتشر الإعلان'); loadNews(); } catch (er) { toast(msg(er)); ev.target.disabled = false; }
    };
    if (a) $('#annClr').onclick = async () => {
      if (!confirm('إزالة الإعلان الحالي؟')) return;
      try { await call('admin/config', { set: { ann: null } }); toast('انشال الإعلان'); loadNews(); } catch (er) { toast(msg(er)); }
    };
    $('#bcSend').onclick = async ev => {
      const text = $('#bcT').value.trim(); if (!text) return toast(ERR.empty);
      if (!confirm(`يوصل هالإشعار لكل المستخدمين:\n\n«${text}»\n\nمتأكد؟`)) return;
      ev.target.disabled = true; $('#bcMsg').textContent = 'جاري الإرسال…';
      try { const j = await call('admin/broadcast', { text }); $('#bcMsg').textContent = `✓ وصل لـ ${N(j.sent)} من ${N(j.total)}`; $('#bcT').value = ''; }
      catch (er) { $('#bcMsg').textContent = msg(er); }
      ev.target.disabled = false;
    };
  }

  /* ═══ الإعدادات: حسابي + فريق الإدارة + السجل ═══ */
  const ACT = { password: 'غيّر كلمة السر', 'admin-save': 'حفظ حساب إدارة', 'admin-del': 'حذف حساب إدارة', 'user-ban': 'حظر مستخدم', 'user-unban': 'فك حظر', 'user-wipe': 'مسح محتوى مستخدم',
    'post-hide': 'إخفاء منشور', 'post-show': 'إظهار منشور', 'post-del': 'حذف منشور', config: 'تغيير إعدادات التطبيق', broadcast: 'إشعار للكل' };
  async function loadSettings() {
    const el = $('#t-settings');
    el.innerHTML = `<h2>الإعدادات</h2><p class="sub">حسابك وفريق الإدارة.</p><div class="stack">
      <div class="card"><h3>حسابي</h3><div class="note">أنت داخل باسم <b class="mono">${esc(ME.u)}</b> · ${ROLE[ME.role]}</div>
        <form id="pwForm" autocomplete="off"><input type="text" autocomplete="username" value="${esc(ME.u)}" hidden>
          <div class="fields">
            <label class="f">كلمة السر الحالية<input class="input" id="pwOld" type="password" autocomplete="current-password" required></label>
            <label class="f">كلمة السر الجديدة (8 أحرف أو أكثر)<input class="input" id="pwNew" type="password" autocomplete="new-password" minlength="8" required></label>
            <label class="f">أعد كتابة الجديدة<input class="input" id="pwNew2" type="password" autocomplete="new-password" minlength="8" required></label>
          </div>
          <div class="save"><button class="btn pri" type="submit">تغيير كلمة السر</button><span class="note">بعد التغيير، أي جهاز ثاني داخل بحسابك يطلع تلقائياً.</span></div>
        </form></div>
      ${can('owner') ? `<div class="card"><h3>فريق الإدارة</h3><div class="note">أضف حسابات لغيرك. <b>مدير</b>: كل شي إلا إدارة الحسابات. <b>مشرف</b>: المشتركين والساحة بس (حظر ومراجعة).</div>
        <div class="scroll" id="admList" style="margin-top:10px"></div>
        <form id="admForm" autocomplete="off" style="margin-top:14px"><h3 id="admFormT">إضافة حساب</h3>
          <div class="formrow">
            <label class="f">اسم المستخدم (إنجليزي)<input class="input mono" id="aU" pattern="[a-z0-9_.\-]{3,24}" placeholder="rashid" autocapitalize="none" spellcheck="false" required></label>
            <label class="f">الاسم الظاهر<input class="input" id="aN" maxlength="40" placeholder="رشيد"></label>
            <label class="f">الصلاحية<select class="input" id="aR" style="max-width:none"><option value="admin">مدير</option><option value="mod">مشرف</option></select></label>
            <label class="f">كلمة السر<input class="input" id="aP" type="password" autocomplete="new-password" placeholder="8 أحرف أو أكثر"></label>
          </div>
          <div class="save"><button class="btn pri" type="submit" id="aSave">إضافة</button><button class="btn" type="button" id="aCancel" hidden>إلغاء التعديل</button><button class="btn" type="button" id="aGen">كلمة سر عشوائية</button><span class="note" id="aMsg"></span></div>
        </form></div>` : ''}
      ${can('owner', 'admin') ? `<div class="card"><h3>سجل النشاط</h3><div class="note">آخر اللي سواه فريق الإدارة.</div><div class="scroll" id="audList" style="margin-top:10px"></div></div>` : ''}
    </div>`;
    $('#pwForm').onsubmit = async e => {
      e.preventDefault(); const n = $('#pwNew').value;
      if (n !== $('#pwNew2').value) return toast('كلمة السر الجديدة مو متطابقة');
      if (n.length < 8) return toast(ERR.weak);
      const b = e.target.querySelector('button'); b.disabled = true;
      try { await call('admin/password', { old: $('#pwOld').value, new: n }); toast('✓ تغيّرت كلمة السر'); e.target.reset(); } catch (er) { toast(msg(er)); }
      b.disabled = false;
    };
    if (can('owner')) { admBind(); loadAdmins(); }
    if (can('owner', 'admin')) loadAudit();
  }
  let EDIT = null;
  function admReset() { EDIT = null; $('#admForm').reset(); $('#aU').disabled = false; $('#aR').disabled = false; $('#admFormT').textContent = 'إضافة حساب'; $('#aSave').textContent = 'إضافة'; $('#aCancel').hidden = true; $('#aP').placeholder = '8 أحرف أو أكثر'; $('#aMsg').textContent = ''; }
  function admBind() {
    $('#aGen').onclick = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; const p = [...a].map(x => c[x % c.length]).join('');
      $('#aP').type = 'text'; $('#aP').value = p; $('#aMsg').textContent = 'انسخها وأرسلها لصاحب الحساب قبل الحفظ'; };
    $('#aCancel').onclick = admReset;
    $('#admForm').onsubmit = async e => {
      e.preventDefault(); const u = $('#aU').value.trim().toLowerCase(), pw = $('#aP').value;
      if (!/^[a-z0-9_.-]{3,24}$/.test(u)) return toast(ERR.user);
      if (!EDIT && pw.length < 8) return toast(ERR.weak);
      if (pw && pw.length < 8) return toast(ERR.weak);
      const b = $('#aSave'); b.disabled = true;
      try { await call('admin/admins/save', { u, name: $('#aN').value.trim(), role: $('#aR').value, password: pw || undefined }); toast(EDIT ? 'انحفظ الحساب' : `انضاف ${u} ✓`); admReset(); loadAdmins(); loadAudit(); }
      catch (er) { toast(msg(er)); }
      b.disabled = false;
    };
    $('#admList').onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const u = b.dataset.u;
      if (b.dataset.a === 'edit') { const x = ADM.find(y => y.u === u); if (!x) return; EDIT = u; $('#aU').value = u; $('#aU').disabled = true; $('#aN').value = x.name || ''; $('#aR').value = x.role === 'mod' ? 'mod' : 'admin'; $('#aR').disabled = x.role === 'owner';
        $('#aP').value = ''; $('#aP').type = 'password'; $('#aP').placeholder = 'اتركها فاضية لو ما تبي تغيّرها'; $('#admFormT').textContent = 'تعديل ' + u; $('#aSave').textContent = 'حفظ'; $('#aCancel').hidden = false; $('#admForm').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      if (b.dataset.a === 'del') { if (!confirm(`حذف حساب ${u}؟ يطلع من اللوحة فوراً.`)) return; try { await call('admin/admins/del', { u }); toast('انحذف'); if (EDIT === u) admReset(); loadAdmins(); loadAudit(); } catch (er) { toast(msg(er)); } }
    };
  }
  let ADM = [];
  async function loadAdmins() {
    const box = $('#admList'); if (!box) return;
    try { ADM = (await call('admin/admins')).items; } catch (e) { if (e.message !== 'auth') box.innerHTML = `<div class="empty">${esc(msg(e))}</div>`; return; }
    box.innerHTML = `<table class="tbl"><thead><tr><th>المستخدم</th><th>الاسم</th><th>الصلاحية</th><th>آخر دخول</th><th></th></tr></thead><tbody>${ADM.map(x => `<tr>
      <td class="mono">${esc(x.u)}</td><td>${esc(x.name || '')}</td><td><span class="role ${x.role}">${ROLE[x.role] || esc(x.role)}</span></td><td>${ago(x.last)}</td>
      <td style="white-space:nowrap"><button class="btn sm" data-a="edit" data-u="${esc(x.u)}">تعديل</button>${x.role === 'owner' ? '' : ` <button class="btn sm bad" data-a="del" data-u="${esc(x.u)}">حذف</button>`}</td></tr>`).join('')}</tbody></table>`;
  }
  async function loadAudit() {
    const box = $('#audList'); if (!box) return;
    let j; try { j = await call('admin/audit'); } catch (e) { return; }
    box.innerHTML = j.items.length ? `<table class="tbl"><thead><tr><th>متى</th><th>مين</th><th>وش سوى</th><th>على</th></tr></thead><tbody>${j.items.slice(0, 50).map(x => `<tr><td>${ago(x.ts)}</td><td class="mono">${esc(x.u)}</td><td>${ACT[x.act] || esc(x.act)}</td><td class="mono">${esc(x.t)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">ما فيه نشاط للحين</div>';
  }

  if (TOKEN) showApp(); else showLogin();
})();
