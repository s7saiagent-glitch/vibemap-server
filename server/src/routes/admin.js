const express = require('express');
const workspacesDb = require('../db/workspaces');
const { requireAuth } = require('../middleware/auth');
const { loadWorkspaceMembership, requireAdmin } = require('../middleware/workspaceContext');

const router = express.Router({ mergeParams: true });

router.get('/workspaces/:workspaceId/members', requireAuth, loadWorkspaceMembership, requireAdmin, async (req, res, next) => {
  try {
    const members = await workspacesDb.listMembers(req.workspace.id);
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

router.delete('/workspaces/:workspaceId/members/:userId', requireAuth, loadWorkspaceMembership, requireAdmin, async (req, res, next) => {
  try {
    if (req.params.userId === req.workspace.owner_id) {
      return res.status(400).json({ error: 'لا يمكن حذف مالك المنشأة' });
    }
    await workspacesDb.removeMember(req.workspace.id, req.params.userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
