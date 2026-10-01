/* VibeMap — قائمة الانتظار */
(function () {
  'use strict';
  var API = (document.querySelector('meta[name=vibemap-api]') || {}).content || '/relay/api/';
  var $ = function (s) { return document.querySelector(s); };
  var q = new URLSearchParams(location.search), src = /^[a-z]{1,12}$/.test(q.get('src') || '') ? q.get('src') : 'site';
  var plat = /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : '';
  function setPlat(p) { plat = p; document.querySelectorAll('[data-plat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-plat') === p)); }); }
  setPlat(plat);
  document.querySelectorAll('[data-plat]').forEach(function (b) { b.addEventListener('click', function () { setPlat(b.getAttribute('data-plat')); }); });
  $('#tryNow').href = '../app/?src=' + src;
  $('#y').textContent = new Date().getFullYear();
  var share = 'شف هالتطبيق 👀 لاسلكي حقيقي بينك وبين ربعك — سجّل وينبهونك وقت نزوله:\n' + location.origin + '/w/?src=whatsapp';
  $('#shareWa').href = 'https://wa.me/?text=' + encodeURIComponent(share);
  var done = false; try { done = localStorage.getItem('vm.wl') === '1'; } catch (e) {}
  function showDone() { $('#formCard').hidden = true; $('#doneCard').hidden = false; }
  if (done) showDone();
  var ERR = { contact: 'اكتب رقم جوال سعودي (05xxxxxxxx) أو إيميل صحيح', slow: 'محاولات كثيرة، جرّب بعد شوي', net: 'ما قدرنا نوصل، تأكد من النت وجرّب مرة ثانية' };
  $('#wl').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#contact').value.trim(), btn = $('#go'); $('#err').textContent = '';
    if (!v) { $('#err').textContent = ERR.contact; $('#contact').focus(); return; }
    btn.disabled = true; btn.textContent = 'لحظة…';
    fetch(API + 'waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contact: v, plat: plat, src: src }) })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        if (j && j.ok) { try { localStorage.setItem('vm.wl', '1'); } catch (er) {} showDone(); return; }
        $('#err').textContent = ERR[j && j.err] || ERR.net;
      })
      .catch(function () { $('#err').textContent = ERR.net; })
      .then(function () { btn.disabled = false; btn.textContent = 'نبّهني 🚀'; });
  });
})();
