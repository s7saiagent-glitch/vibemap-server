require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool();

async function seed() {
  await pool.query(`
    INSERT INTO plans (id, code, name_ar, price_sar_month, max_channels, max_members, retention_hours, features)
    VALUES
      (1, 'free', 'مجاني', 0, 1, 5, 24, '{"transcription":false,"ai_summary":false,"location":false,"emergency":false}'::jsonb),
      (2, 'paid', 'مدفوع', 29, NULL, NULL, NULL, '{"transcription":true,"ai_summary":true,"location":true,"emergency":true}'::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      name_ar = EXCLUDED.name_ar,
      price_sar_month = EXCLUDED.price_sar_month,
      max_channels = EXCLUDED.max_channels,
      max_members = EXCLUDED.max_members,
      retention_hours = EXCLUDED.retention_hours,
      features = EXCLUDED.features;
  `);
  console.log('تم تحديث جدول الباقات.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
