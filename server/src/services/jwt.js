const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signUserToken(user) {
  return jwt.sign({ sub: user.id, phone: user.phone }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function signGuestToken({ channelId, guestName }) {
  return jwt.sign(
    { guest: true, channelId, guestName },
    env.jwtSecret,
    { expiresIn: '54h' } // شوي أطول من عمر القناة المؤقتة (48 ساعة)
  );
}

function verify(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signUserToken, signGuestToken, verify };
