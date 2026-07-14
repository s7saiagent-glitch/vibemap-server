const pool = require('./pool');

async function createOtp(phone, code, ttlSeconds) {
  const { rows } = await pool.query(
    `INSERT INTO otp_codes (phone, code, expires_at)
     VALUES ($1, $2, now() + ($3 || ' seconds')::interval)
     RETURNING *`,
    [phone, code, ttlSeconds]
  );
  return rows[0];
}

async function findActiveOtp(phone, code) {
  const { rows } = await pool.query(
    `SELECT * FROM otp_codes
     WHERE phone = $1 AND code = $2 AND consumed = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [phone, code]
  );
  return rows[0] || null;
}

async function consumeOtp(id) {
  await pool.query('UPDATE otp_codes SET consumed = true WHERE id = $1', [id]);
}

async function incrementAttempts(phone) {
  await pool.query(
    `UPDATE otp_codes SET attempts = attempts + 1
     WHERE phone = $1 AND consumed = false AND expires_at > now()`,
    [phone]
  );
}

module.exports = { createOtp, findActiveOtp, consumeOtp, incrementAttempts };
