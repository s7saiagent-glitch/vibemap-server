require('dotenv').config();

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`متغير البيئة مفقود: ${name}`);
  }
  return val;
}

module.exports = {
  port: parseInt(process.env.PORT || '3005', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: required('JWT_SECRET', 'dev_only_insecure_secret_change_me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  otpMode: process.env.OTP_MODE || 'mock',
  otpTtlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  audioUploadDir: process.env.AUDIO_UPLOAD_DIR || 'uploads/voice',
  freePlanRetentionHours: parseInt(process.env.FREE_PLAN_RETENTION_HOURS || '24', 10),
  sms: {
    apiKey: process.env.SMS_PROVIDER_API_KEY || '',
    sender: process.env.SMS_PROVIDER_SENDER || 'Labbeih',
  },
  moyasar: {
    apiKey: process.env.MOYASAR_API_KEY || '',
    webhookSecret: process.env.MOYASAR_WEBHOOK_SECRET || '',
  },
};
