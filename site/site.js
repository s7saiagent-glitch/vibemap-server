/* VibeMap — موقع التطبيق */
(function () {
  /* روابط المتاجر: لما ينزل التطبيق في المتجر، حط الرابط هنا فقط */
  var STORES = {
    play: '',   // مثال: https://play.google.com/store/apps/details?id=sa.vibemap.app
    ios: ''     // مثال: https://apps.apple.com/sa/app/vibemap/id0000000000
  };

  /* رابط دعوة صديق (vibemap.s7sai.cloud/?add=VM-XXXX-XXXX) يفتح التطبيق مباشرة */
  var q = location.search;
  if (/[?&]add=VM-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}/.test(q)) { location.replace('app/' + q); return; }

  var src = document.querySelector('[data-stores] .store') && document.querySelector('[data-stores]');
  document.querySelectorAll('[data-stores]').forEach(function (box) {
    if (box !== src && src) box.innerHTML = src.innerHTML;
  });
  document.querySelectorAll('[data-store]').forEach(function (a) {
    var url = STORES[a.getAttribute('data-store')];
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
    else {
      a.classList.add('soon'); a.removeAttribute('href'); a.setAttribute('role', 'img');
      a.setAttribute('aria-label', a.getAttribute('aria-label') + ' — قريباً');
    }
  });
  var y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  /* تنظيف: من فتح النسخة القديمة (التطبيق كان على الرئيسية) */
  if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(function (rs) {
    rs.forEach(function (r) { if (!/\/app\/$/.test(new URL(r.scope).pathname)) r.unregister(); });
  }).catch(function () {});
})();
