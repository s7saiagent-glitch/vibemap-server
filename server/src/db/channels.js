const crypto = require('crypto');
const pool = require('./pool');

function generateQrToken() {
  return crypto.randomBytes(12).toString('hex');
}

async function createWorkspaceChannel({ workspaceId, name, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO channels (workspace_id, name, type, created_by)
     VALUES ($1, $2, 'workspace', $3) RETURNING *`,
    [workspaceId, name, createdBy]
  );
  return rows[0];
}

async function createTemporaryChannel({ name, createdBy }) {
  const qrToken = generateQrToken();
  const { rows } = await pool.query(
    `INSERT INTO channels (name, type, qr_token, created_by, expires_at)
     VALUES ($1, 'temporary', $2, $3, now() + interval '48 hours') RETURNING *`,
    [name, qrToken, createdBy]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM channels WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByQrToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM channels WHERE qr_token = $1 AND (expires_at IS NULL OR expires_at > now())`,
    [token]
  );
  return rows[0] || null;
}

async function listForWorkspace(workspaceId) {
  const { rows } = await pool.query(
    'SELECT * FROM channels WHERE workspace_id = $1 ORDER BY created_at ASC',
    [workspaceId]
  );
  return rows;
}

async function countForWorkspace(workspaceId) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM channels WHERE workspace_id = $1', [workspaceId]);
  return rows[0].count;
}

async function rename(channelId, name) {
  const { rows } = await pool.query(
    'UPDATE channels SET name = $2 WHERE id = $1 RETURNING *',
    [channelId, name]
  );
  return rows[0] || null;
}

async function remove(channelId) {
  await pool.query('DELETE FROM channels WHERE id = $1', [channelId]);
}

// أعضاء القناة الحاليون (حضور مباشر)
async function upsertPresence({ channelId, userId = null, isGuest = false, guestName = null }) {
  if (userId) {
    const { rows } = await pool.query(
      `INSERT INTO channel_members (channel_id, user_id, is_guest, guest_name)
       VALUES ($1, $2, false, NULL)
       ON CONFLICT DO NOTHING RETURNING *`,
      [channelId, userId]
    );
    if (rows[0]) return rows[0];
    const existing = await pool.query(
      'SELECT * FROM channel_members WHERE channel_id = $1 AND user_id = $2',
      [channelId, userId]
    );
    if (existing.rows[0]) {
      await pool.query('UPDATE channel_members SET last_seen_at = now() WHERE id = $1', [existing.rows[0].id]);
      return existing.rows[0];
    }
  }
  const { rows } = await pool.query(
    `INSERT INTO channel_members (channel_id, user_id, is_guest, guest_name)
     VALUES ($1, NULL, true, $2) RETURNING *`,
    [channelId, guestName]
  );
  return rows[0];
}

async function listPresence(channelId) {
  const { rows } = await pool.query(
    `SELECT cm.id, cm.is_guest, cm.guest_name, cm.joined_at, cm.last_seen_at,
            u.id AS user_id, u.name AS user_name
     FROM channel_members cm LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.channel_id = $1 ORDER BY cm.joined_at ASC`,
    [channelId]
  );
  return rows;
}

module.exports = {
  createWorkspaceChannel,
  createTemporaryChannel,
  findById,
  findByQrToken,
  listForWorkspace,
  countForWorkspace,
  rename,
  remove,
  upsertPresence,
  listPresence,
};
