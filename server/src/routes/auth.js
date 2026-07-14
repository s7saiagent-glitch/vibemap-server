const express = require('express');
const otpService = require('../services/otpService');
const jwtService = require('../services/jwt');
const usersDb = require('../db/users');
const { otpLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const SAUDI_GULF_PHONE_RE = /^\+?9665\d{8}$|^\+?9\d{9,11}$/; // يقبل صيغ خليجية عامة تبدأ بـ 9xx

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[\s-]/g, '');
  return digits.startsWith('+') ? digits : `+${digits.replace(/^00/, '')}`;
}

router.post('/otp/request', otpLimiter, async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone || phone.length < 9) {
      return res.status(400).json({ error: 'رقم جوال غير صالح' });
    }
    const result = await otpService.requestOtp(phone);
    res.json({ ok: true, delivered: result.delivered, phone });
  } catch (err) {
    next(err);
  }
});

router.post('/otp/verify', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const { code, name } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'الجوال والرمز مطلوبان' });

    const valid = await otpService.verifyOtp(phone, String(code));
    if (!valid) return res.status(400).json({ error: 'الرمز غير صحيح أو منتهي' });

    const user = await usersDb.findOrCreateByPhone(phone, name);
    const token = jwtService.signUserToken(user);
    res.json({ token, user: { id: user.id, phone: user.phone, name: user.name } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: { id: req.user.id, phone: req.user.phone, name: req.user.name } });
});

module.exports = router;
