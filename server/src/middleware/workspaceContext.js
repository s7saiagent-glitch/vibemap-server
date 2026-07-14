const workspacesDb = require('../db/workspaces');

// يحمّل المنشأة من param :workspaceId ويتأكد أن المستخدم عضو فيها
async function loadWorkspaceMembership(req, res, next) {
  try {
    const workspace = await workspacesDb.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ error: 'المنشأة غير موجودة' });

    const membership = await workspacesDb.getMembership(workspace.id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'لست عضواً بهذه المنشأة' });

    req.workspace = workspace;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.membership?.role !== 'admin') {
    return res.status(403).json({ error: 'هذا الإجراء يتطلب صلاحية المشرف' });
  }
  next();
}

module.exports = { loadWorkspaceMembership, requireAdmin };
