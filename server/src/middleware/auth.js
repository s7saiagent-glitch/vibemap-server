const jwtService = require('../services/jwt');
const usersDb = require('../db/users');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });

  try {
    const payload = jwtService.verify(token);
    if (payload.guest) return res.status(403).json({ error: 'هذا المسار غير متاح للضيوف' });
    const user = await usersDb.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' });
  }
}

// يسمح إما بمستخدم مسجل أو ضيف بتوكن قناة مؤقتة
async function requireAuthOrGuest(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });

  try {
    const payload = jwtService.verify(token);
    if (payload.guest) {
      req.guest = { channelId: payload.channelId, guestName: payload.guestName };
      return next();
    }
    const user = await usersDb.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'المستخدم غير موجود' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' });
  }
}

module.exports = { requireAuth, requireAuthOrGuest };
