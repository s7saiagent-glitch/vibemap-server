const pool = require('./pool');

async function findByPhone(phone) {
  const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function createUser({ phone, name }) {
  const { rows } = await pool.query(
    'INSERT INTO users (phone, name) VALUES ($1, $2) RETURNING *',
    [phone, name]
  );
  return rows[0];
}

async function findOrCreateByPhone(phone, defaultName) {
  const existing = await findByPhone(phone);
  if (existing) return existing;
  return createUser({ phone, name: defaultName || phone });
}

module.exports = { findByPhone, findById, createUser, findOrCreateByPhone };
