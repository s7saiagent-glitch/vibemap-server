const channelsDb = require('../db/channels');
const workspacesDb = require('../db/workspaces');

// يتحقق أن المستخدم/الضيف مسموح له بالتواجد والبث بهذه القناة
async function verifyChannelAccess({ user, guest, channelId }) {
  const channel = await channelsDb.findById(channelId);
  if (!channel) return { ok: false, reason: 'القناة غير موجودة' };

  if (channel.type === 'temporary') {
    if (channel.expires_at && new Date(channel.expires_at) <= new Date()) {
      return { ok: false, reason: 'القناة المؤقتة انتهت' };
    }
    if (guest) {
      if (guest.channelId !== channelId) return { ok: false, reason: 'توكن الضيف لا يخص هذه القناة' };
      return { ok: true, channel };
    }
    if (user) return { ok: true, channel }; // مستخدم مسجّل يقدر يدخل قناة مؤقتة بنفس الرابط
    return { ok: false, reason: 'غير مصرح' };
  }

  // قناة منشأة: تتطلب عضوية فعلية بالمنشأة
  if (!user) return { ok: false, reason: 'يتطلب تسجيل الدخول' };
  const membership = await workspacesDb.getMembership(channel.workspace_id, user.id);
  if (!membership) return { ok: false, reason: 'لست عضواً بهذه المنشأة' };
  return { ok: true, channel, membership };
}

module.exports = { verifyChannelAccess };
