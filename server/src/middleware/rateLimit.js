const rateLimit = require('express-rate-limit');

// عام: يحد الطلبات لكل IP لمنع إساءة الاستخدام
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، حاول بعد شوي' },
});

// أشد صرامة لطلبات OTP لمنع قصف الرسائل
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.phone || ''}`,
  message: { error: 'محاولات كثيرة لطلب الرمز، حاول لاحقاً' },
});

module.exports = { generalLimiter, otpLimiter };
