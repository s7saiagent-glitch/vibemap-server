/* VibeMap — موقع التطبيق */
(function () {
  /* روابط المتاجر: لما ينزل التطبيق في المتجر، حط الرابط هنا فقط */
  var STORES = {
    play: '',   // مثال: https://play.google.com/store/apps/details?id=sa.vibemap.app
    ios: ''     // مثال: https://apps.apple.com/sa/app/vibemap/id0000000000
  };

  /* حسابات التواصل: اكتب اليوزر هنا فقط، والأيقونة تظهر تلقائياً (الفارغ ما يظهر) */
  var SOCIAL = {
    x: '',          // مثال: vibemap_sa
    instagram: '',  // مثال: vibemap.sa
    tiktok: '',     // مثال: vibemap
    snapchat: '',   // مثال: vibemap
    whatsapp: '966597402660',
    email: 's7saiagent@gmail.com'
  };
  var ICONS = {"x": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M18.9 2H22l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.3 22H2.2l7.7-8.8L1.8 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z\"/></svg>", "instagram": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4.2\"/><circle cx=\"17.4\" cy=\"6.6\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"/></svg>", "tiktok": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.2v12.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.8a5.9 5.9 0 1 0 5 5.8V9.3a7.4 7.4 0 0 0 4.3 1.4V7.5a4.3 4.3 0 0 1-3.2-1.7Z\"/></svg>", "snapchat": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 2.5c2.8 0 5 2.1 5 5v2.3c.5.2 1.1.1 1.6-.1.6-.2 1 .6.4 1-.6.4-1.4.6-2 .8.4 1.5 1.6 2.8 3.3 3.4.5.2.4.8-.1 1-1 .4-1.7.3-2.1 1-.3.5-.2 1.2-.7 1.3-.7.2-1.7-.4-3 .3-.9.5-1.6 1.4-2.4 1.4s-1.5-.9-2.4-1.4c-1.3-.7-2.3-.1-3-.3-.5-.1-.4-.8-.7-1.3-.4-.7-1.1-.6-2.1-1-.5-.2-.6-.8-.1-1 1.7-.6 2.9-1.9 3.3-3.4-.6-.2-1.4-.4-2-.8-.6-.4-.2-1.2.4-1 .5.2 1.1.3 1.6.1V7.5c0-2.9 2.2-5 5-5Z\"/></svg>", "whatsapp": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.7-1.2-1.5-1.3-1.7-.1-.2 0-.4.1-.5l.4-.4.2-.4c.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 2 .8 2.4.6 2.8.6.4 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z\"/></svg>", "email": "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/></svg>"};
  var LINK = { x:'https://x.com/', instagram:'https://instagram.com/', tiktok:'https://www.tiktok.com/@', snapchat:'https://www.snapchat.com/add/', whatsapp:'https://wa.me/', email:'mailto:' };
  var NAME = { x:'X', instagram:'انستقرام', tiktok:'تيك توك', snapchat:'سناب شات', whatsapp:'واتساب', email:'البريد' };
  document.querySelectorAll('[data-social]').forEach(function (box) {
    Object.keys(SOCIAL).forEach(function (k) {
      var v = String(SOCIAL[k] || '').replace(/^@/, '').trim(); if (!v || !/^[A-Za-z0-9._@+-]{2,60}$/.test(v)) return;
      var a = document.createElement('a'); a.href = LINK[k] + encodeURIComponent(v).replace('%40', '@'); a.setAttribute('aria-label', NAME[k]); a.title = NAME[k];
      if (k !== 'email') { a.target = '_blank'; a.rel = 'noopener'; }
      a.innerHTML = ICONS[k]; box.appendChild(a);
    });
  });

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
