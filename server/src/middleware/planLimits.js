const workspacesDb = require('../db/workspaces');
const channelsDb = require('../db/channels');

// يتحقق أن عدد القنوات بالمنشأة لم يتجاوز حد الباقة قبل إنشاء قناة جديدة
async function checkChannelLimit(req, res, next) {
  try {
    const workspace = await workspacesDb.withPlan(req.workspace.id);
    if (workspace.max_channels === null) return next();
    const count = await channelsDb.countForWorkspace(req.workspace.id);
    if (count >= workspace.max_channels) {
      return res.status(403).json({
        error: `باقتك (${workspace.plan_name}) تسمح بـ ${workspace.max_channels} قناة فقط. ترقّى للمدفوعة لقنوات غير محدودة.`,
        code: 'PLAN_CHANNEL_LIMIT',
      });
    }
    req.workspacePlan = workspace;
    next();
  } catch (err) {
    next(err);
  }
}

// يتحقق أن عدد الأعضاء بالمنشأة لم يتجاوز حد الباقة قبل انضمام عضو جديد
async function checkMemberLimit(req, res, next) {
  try {
    const workspace = await workspacesDb.withPlan(req.workspace.id);
    if (workspace.max_members === null) return next();
    const count = await workspacesDb.countMembers(req.workspace.id);
    if (count >= workspace.max_members) {
      return res.status(403).json({
        error: `باقتك (${workspace.plan_name}) تسمح بـ ${workspace.max_members} أعضاء فقط. ترقّى للمدفوعة لأعضاء غير محدودين.`,
        code: 'PLAN_MEMBER_LIMIT',
      });
    }
    req.workspacePlan = workspace;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { checkChannelLimit, checkMemberLimit };
