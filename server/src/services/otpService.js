const env = require('../config/env');
const otpDb = require('../db/otp');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 أرقام
}

async function requestOtp(phone) {
  const code = generateCode();
  await otpDb.createOtp(phone, code, env.otpTtlSeconds);

  if (env.otpMode === 'mock') {
    // بيئة التطوير: نطبع الكود بدل إرساله فعلياً
    console.log(`\n[OTP mock] الجوال: ${phone} | الكود: ${code} (صالح ${env.otpTtlSeconds}ث)\n`);
    return { delivered: 'console' };
  }

  // TODO: عند التفعيل، اربط مزود SMS حقيقي هنا (مثال: Unifonic / Taqnyat)
  // await smsProvider.send(phone, `رمز التحقق لبيه: ${code}`);
  console.log(`[OTP] لا يوجد مزود SMS مفعّل بعد، الكود: ${code}`);
  return { delivered: 'none' };
}

async function verifyOtp(phone, code) {
  const otp = await otpDb.findActiveOtp(phone, code);
  if (!otp) {
    await otpDb.incrementAttempts(phone);
    return false;
  }
  await otpDb.consumeOtp(otp.id);
  return true;
}

module.exports = { requestOtp, verifyOtp };
