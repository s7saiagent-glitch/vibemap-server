const pool = require('./pool');

async function createMessage({ channelId, senderId, senderName, isGuest, audioPath, durationMs, mimeType, retentionHours }) {
  const { rows } = await pool.query(
    `INSERT INTO messages (channel_id, sender_id, sender_name, is_guest, audio_path, duration_ms, mime_type, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8::int IS NULL THEN NULL ELSE now() + ($8 || ' hours')::interval END)
     RETURNING *`,
    [channelId, senderId, senderName, !!isGuest, audioPath, durationMs || 0, mimeType, retentionHours ?? null]
  );
  return rows[0];
}

async function listForChannel(channelId, { limit = 100, before } = {}) {
  const params = [channelId, limit];
  let query = `SELECT * FROM messages WHERE channel_id = $1 AND (expires_at IS NULL OR expires_at > now())`;
  if (before) {
    params.push(before);
    query += ` AND created_at < $3`;
  }
  query += ` ORDER BY created_at DESC LIMIT $2`;
  const { rows } = await pool.query(query, params);
  return rows.reverse();
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findExpired() {
  const { rows } = await pool.query('SELECT * FROM messages WHERE expires_at IS NOT NULL AND expires_at <= now()');
  return rows;
}

async function deleteByIds(ids) {
  if (!ids.length) return;
  await pool.query('DELETE FROM messages WHERE id = ANY($1::uuid[])', [ids]);
}

module.exports = { createMessage, listForChannel, findById, findExpired, deleteByIds };
