const express = require('express');
const workspacesDb = require('../db/workspaces');
const { requireAuth } = require('../middleware/auth');
const { loadWorkspaceMembership } = require('../middleware/workspaceContext');
const { checkMemberLimit } = require('../middleware/planLimits');

const router = express.Router();
router.use(requireAuth);

// إنشاء منشأة جديدة - المنشئ يصير Admin تلقائياً
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم المنشأة مطلوب' });

    const workspace = await workspacesDb.createWorkspace({ name: name.trim(), ownerId: req.user.id });
    await workspacesDb.addMember(workspace.id, req.user.id, 'admin');

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
});

// منشآتي
router.get('/', async (req, res, next) => {
  try {
    const workspaces = await workspacesDb.listForUser(req.user.id);
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
});

// الانضمام بكود دعوة
router.post('/join', async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'كود الدعوة مطلوب' });

    const workspace = await workspacesDb.findByInviteCode(inviteCode);
    if (!workspace) return res.status(404).json({ error: 'كود الدعوة غير صحيح' });

    const existing = await workspacesDb.getMembership(workspace.id, req.user.id);
    if (existing) return res.json({ workspace, alreadyMember: true });

    const withPlan = await workspacesDb.withPlan(workspace.id);
    if (withPlan.max_members !== null) {
      const count = await workspacesDb.countMembers(workspace.id);
      if (count >= withPlan.max_members) {
        return res.status(403).json({
          error: `هذه المنشأة وصلت حد أعضاء باقتها (${withPlan.max_members})`,
          code: 'PLAN_MEMBER_LIMIT',
        });
      }
    }

    await workspacesDb.addMember(workspace.id, req.user.id, 'member');
    res.json({ workspace, alreadyMember: false });
  } catch (err) {
    next(err);
  }
});

router.get('/:workspaceId', loadWorkspaceMembership, async (req, res, next) => {
  try {
    const workspace = await workspacesDb.withPlan(req.workspace.id);
    res.json({ workspace, membership: req.membership });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
