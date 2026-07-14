const express = require('express');
const channelsDb = require('../db/channels');
const workspacesDb = require('../db/workspaces');
const jwtService = require('../services/jwt');
const { requireAuth } = require('../middleware/auth');
const { loadWorkspaceMembership, requireAdmin } = require('../middleware/workspaceContext');
const { checkChannelLimit } = require('../middleware/planLimits');

const router = express.Router();

// ---- قنوات المنشأة ----

router.post('/workspaces/:workspaceId/channels', requireAuth, loadWorkspaceMembership, checkChannelLimit, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم القناة مطلوب' });
    const channel = await channelsDb.createWorkspaceChannel({
      workspaceId: req.workspace.id,
      name: name.trim(),
      createdBy: req.user.id,
    });
    res.status(201).json({ channel });
  } catch (err) {
    next(err);
  }
});

router.get('/workspaces/:workspaceId/channels', requireAuth, loadWorkspaceMembership, async (req, res, next) => {
  try {
    const channels = await channelsDb.listForWorkspace(req.workspace.id);
    res.json({ channels });
  } catch (err) {
    next(err);
  }
});

router.patch('/workspaces/:workspaceId/channels/:channelId', requireAuth, loadWorkspaceMembership, requireAdmin, async (req, res, next) => {
  try {
    const channel = await channelsDb.findById(req.params.channelId);
    if (!channel || channel.workspace_id !== req.workspace.id) {
      return res.status(404).json({ error: 'القناة غير موجودة' });
    }
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
    const updated = await channelsDb.rename(channel.id, name.trim());
    res.json({ channel: updated });
  } catch (err) {
    next(err);
  }
});

// جلب قناة داخل منشأة (للتأكد من العضوية قبل فتح الشاشة)
router.get('/workspaces/:workspaceId/channels/:channelId', requireAuth, loadWorkspaceMembership, async (req, res, next) => {
  try {
    const channel = await channelsDb.findById(req.params.channelId);
    if (!channel || channel.workspace_id !== req.workspace.id) {
      return res.status(404).json({ error: 'القناة غير موجودة' });
    }
    res.json({ channel });
  } catch (err) {
    next(err);
  }
});

// ---- القنوات المؤقتة (QR) ----

// أي مستخدم مسجّل ينشئ قناة مؤقتة تنتهي بعد 48 ساعة
router.post('/temporary', requireAuth, async (req, res, next) => {
  try {
    const { name } = req.body;
    const channel = await channelsDb.createTemporaryChannel({
      name: (name && name.trim()) || 'قناة مؤقتة',
      createdBy: req.user.id,
    });
    res.status(201).json({ channel, joinUrl: `/join/${channel.qr_token}` });
  } catch (err) {
    next(err);
  }
});

// معاينة عامة للقناة المؤقتة قبل الانضمام (بدون تسجيل دخول) - تُستخدم بصفحة مسح QR
router.get('/qr/:token', async (req, res, next) => {
  try {
    const channel = await channelsDb.findByQrToken(req.params.token);
    if (!channel) return res.status(404).json({ error: 'رابط منتهي أو غير صحيح' });
    res.json({ channel: { id: channel.id, name: channel.name, expiresAt: channel.expires_at } });
  } catch (err) {
    next(err);
  }
});

// انضمام ضيف بمسح QR: اسم مستعار فقط، بدون تسجيل. يرجّع توكن ضيف مؤقت
router.post('/qr/:token/join', async (req, res, next) => {
  try {
    const channel = await channelsDb.findByQrToken(req.params.token);
    if (!channel) return res.status(404).json({ error: 'رابط منتهي أو غير صحيح' });

    const rawName = (req.body.guestName || '').trim();
    const guestName = rawName.slice(0, 40) || `ضيف-${Math.floor(1000 + Math.random() * 9000)}`;

    await channelsDb.upsertPresence({ channelId: channel.id, isGuest: true, guestName });
    const token = jwtService.signGuestToken({ channelId: channel.id, guestName });

    res.json({ token, channel: { id: channel.id, name: channel.name, expiresAt: channel.expires_at }, guestName });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
