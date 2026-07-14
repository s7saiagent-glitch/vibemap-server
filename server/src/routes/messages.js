const express = require('express');
const path = require('path');
const fs = require('fs');
const messagesDb = require('../db/messages');
const channelsDb = require('../db/channels');
const workspacesDb = require('../db/workspaces');
const env = require('../config/env');
const { requireAuthOrGuest } = require('../middleware/auth');

const router = express.Router();

async function canAccessChannel(req, channel) {
  if (req.user) {
    if (channel.type === 'workspace') {
      const membership = await workspacesDb.getMembership(channel.workspace_id, req.user.id);
      return !!membership;
    }
    return true; // مستخدم مسجّل يقدر يدخل قناة مؤقتة إذا يعرف رابطها
  }
  if (req.guest) {
    return req.guest.channelId === channel.id;
  }
  return false;
}

router.get('/:channelId/messages', requireAuthOrGuest, async (req, res, next) => {
  try {
    const channel = await channelsDb.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'القناة غير موجودة' });

    const allowed = await canAccessChannel(req, channel);
    if (!allowed) return res.status(403).json({ error: 'لا تملك صلاحية الوصول لهذه القناة' });

    const messages = await messagesDb.listForChannel(channel.id, {
      limit: Math.min(parseInt(req.query.limit, 10) || 100, 200),
      before: req.query.before || undefined,
    });

    res.json({
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        isGuest: m.is_guest,
        audioUrl: `/api/channels/${channel.id}/messages/${m.id}/audio`,
        durationMs: m.duration_ms,
        createdAt: m.created_at,
        expiresAt: m.expires_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:channelId/messages/:messageId/audio', requireAuthOrGuest, async (req, res, next) => {
  try {
    const channel = await channelsDb.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ error: 'القناة غير موجودة' });

    const allowed = await canAccessChannel(req, channel);
    if (!allowed) return res.status(403).json({ error: 'لا تملك صلاحية الوصول لهذه القناة' });

    const message = await messagesDb.findById(req.params.messageId);
    if (!message || message.channel_id !== channel.id) return res.status(404).json({ error: 'الرسالة غير موجودة' });

    const absolutePath = path.join(process.cwd(), message.audio_path);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'الملف الصوتي غير موجود' });

    res.setHeader('Content-Type', message.mime_type);
    fs.createReadStream(absolutePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
