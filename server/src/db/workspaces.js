const pool = require('./pool');

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون أحرف/أرقام ملتبسة
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function createWorkspace({ name, ownerId }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const { rows } = await pool.query(
        `INSERT INTO workspaces (name, invite_code, owner_id, plan_id)
         VALUES ($1, $2, $3, 1) RETURNING *`,
        [name, inviteCode, ownerId]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') continue; // تصادم كود الدعوة، أعد المحاولة
      throw err;
    }
  }
  throw new Error('تعذر توليد كود دعوة فريد');
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM workspaces WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByInviteCode(code) {
  const { rows } = await pool.query('SELECT * FROM workspaces WHERE invite_code = $1', [code.toUpperCase()]);
  return rows[0] || null;
}

async function withPlan(workspaceId) {
  const { rows } = await pool.query(
    `SELECT w.*, p.code AS plan_code, p.name_ar AS plan_name, p.max_channels, p.max_members,
            p.retention_hours, p.features
     FROM workspaces w JOIN plans p ON p.id = w.plan_id
     WHERE w.id = $1`,
    [workspaceId]
  );
  return rows[0] || null;
}

async function addMember(workspaceId, userId, role = 'member') {
  const { rows } = await pool.query(
    `INSERT INTO members (workspace_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO NOTHING RETURNING *`,
    [workspaceId, userId, role]
  );
  if (rows[0]) return rows[0];
  const existing = await pool.query(
    'SELECT * FROM members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );
  return existing.rows[0];
}

async function getMembership(workspaceId, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );
  return rows[0] || null;
}

async function countMembers(workspaceId) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM members WHERE workspace_id = $1', [workspaceId]);
  return rows[0].count;
}

async function listMembers(workspaceId) {
  const { rows } = await pool.query(
    `SELECT m.id AS membership_id, m.role, m.joined_at, u.id AS user_id, u.name, u.phone, u.avatar_url
     FROM members m JOIN users u ON u.id = m.user_id
     WHERE m.workspace_id = $1 ORDER BY m.joined_at ASC`,
    [workspaceId]
  );
  return rows;
}

async function removeMember(workspaceId, userId) {
  await pool.query('DELETE FROM members WHERE workspace_id = $1 AND user_id = $2', [workspaceId, userId]);
}

async function listForUser(userId) {
  const { rows } = await pool.query(
    `SELECT w.*, m.role FROM workspaces w
     JOIN members m ON m.workspace_id = w.id
     WHERE m.user_id = $1 ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  createWorkspace,
  findById,
  findByInviteCode,
  withPlan,
  addMember,
  getMembership,
  countMembers,
  listMembers,
  removeMember,
  listForUser,
};
