const jwtService = require('../services/jwt');
const usersDb = require('../db/users');
const channelsDb = require('../db/channels');
const messagesDb = require('../db/messages');
const workspacesDb = require('../db/workspaces');
const audioStorage = require('../services/audioStorage');
const { verifyChannelAccess } = require('./membership');
const presence = require('./presenceStore');

const MAX_AUDIO_BYTES = 3 * 1024 * 1024; // ~3MB يكفي لمقطع PTT قصير بجودة Opus
const MIN_MS_BETWEEN_AUDIO = 350; // حد أدنى بين المقاطع لمنع إغراق البث

function roomName(channelId) {
  return `channel:${channelId}`;
}

async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('غير مصرح: لا يوجد توكن'));
    const payload = jwtService.verify(token);
    if (payload.guest) {
      socket.data.guest = { channelId: payload.channelId, guestName: payload.guestName };
    } else {
      const user = await usersDb.findById(payload.sub);
      if (!user) return next(new Error('غير مصرح: مستخدم غير موجود'));
      socket.data.user = user;
    }
    next();
  } catch (err) {
    next(new Error('غير مصرح: توكن غير صالح'));
  }
}

function memberLabel(socket) {
  if (socket.data.user) return { id: socket.data.user.id, name: socket.data.user.name, isGuest: false };
  return { id: socket.id, name: socket.data.guest.guestName, isGuest: true };
}

async function resolveRetentionHours(channel) {
  if (channel.type === 'temporary') return null; // تُحذف مع انتهاء القناة نفسها (48 ساعة) عبر مهمة التنظيف
  const workspace = await workspacesDb.withPlan(channel.workspace_id);
  return workspace.retention_hours;
}

function attachSocketServer(io) {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    socket.data.lastAudioAt = 0;

    socket.on('channel:join', async ({ channelId }, ack) => {
      try {
        const access = await verifyChannelAccess({ user: socket.data.user, guest: socket.data.guest, channelId });
        if (!access.ok) return ack?.({ ok: false, error: access.reason });

        await channelsDb.upsertPresence({
          channelId,
          userId: socket.data.user?.id,
          isGuest: !!socket.data.guest,
          guestName: socket.data.guest?.guestName,
        });

        socket.join(roomName(channelId));
        socket.data.channelId = channelId;
        presence.join(channelId, socket.id, memberLabel(socket));

        io.to(roomName(channelId)).emit('presence:update', { channelId, members: presence.list(channelId) });
        ack?.({ ok: true, members: presence.list(channelId) });
      } catch (err) {
        ack?.({ ok: false, error: 'تعذر الانضمام للقناة' });
      }
    });

    socket.on('channel:leave', ({ channelId }) => {
      socket.leave(roomName(channelId));
      presence.leave(channelId, socket.id);
      io.to(roomName(channelId)).emit('presence:update', { channelId, members: presence.list(channelId) });
    });

    // مؤشر "فلان يتحدث الآن" لحظة الضغط على الزر (قبل اكتمال المقطع)
    socket.on('ptt:start', ({ channelId }) => {
      if (socket.data.channelId !== channelId) return;
      socket.to(roomName(channelId)).emit('speaking:start', { channelId, speaker: memberLabel(socket) });
    });

    socket.on('ptt:stop', ({ channelId }) => {
      if (socket.data.channelId !== channelId) return;
      socket.to(roomName(channelId)).emit('speaking:stop', { channelId, speaker: memberLabel(socket) });
    });

    // بث المقطع الصوتي فور اكتماله (Opus/webm) - تشغيل تلقائي فوري + حفظ للسجل
    socket.on('audio:message', async ({ channelId, mimeType, durationMs, buffer, clientTempId }, ack) => {
      try {
        const now = Date.now();
        if (now - socket.data.lastAudioAt < MIN_MS_BETWEEN_AUDIO) {
          return ack?.({ ok: false, error: 'بث سريع جداً، انتظر لحظة' });
        }
        if (!buffer || buffer.length === 0) return ack?.({ ok: false, error: 'مقطع فارغ' });
        if (buffer.length > MAX_AUDIO_BYTES) return ack?.({ ok: false, error: 'المقطع كبير جداً' });

        const access = await verifyChannelAccess({ user: socket.data.user, guest: socket.data.guest, channelId });
        if (!access.ok) return ack?.({ ok: false, error: access.reason });

        socket.data.lastAudioAt = now;
        const sender = memberLabel(socket);
        const audioBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

        // 1) بث فوري لكل أعضاء القناة المتصلين (أقل من ثانيتين على 4G) مع تشغيل تلقائي
        io.to(roomName(channelId)).emit('audio:live', {
          channelId,
          clientTempId,
          senderId: sender.id,
          senderName: sender.name,
          isGuest: sender.isGuest,
          mimeType,
          durationMs,
          buffer: audioBuffer,
          createdAt: new Date().toISOString(),
        });
        ack?.({ ok: true });

        // 2) حفظ بالخلفية للسجل (لا يؤخر البث اللحظي)
        const audioPath = await audioStorage.saveAudioBuffer({ channelId, buffer: audioBuffer, mimeType });
        const retentionHours = await resolveRetentionHours(access.channel);
        const message = await messagesDb.createMessage({
          channelId,
          senderId: socket.data.user?.id || null,
          senderName: sender.name,
          isGuest: sender.isGuest,
          audioPath,
          durationMs,
          mimeType,
          retentionHours,
        });

        io.to(roomName(channelId)).emit('audio:saved', {
          channelId,
          clientTempId,
          message: {
            id: message.id,
            senderId: message.sender_id,
            senderName: message.sender_name,
            isGuest: message.is_guest,
            audioUrl: `/api/channels/${channelId}/messages/${message.id}/audio`,
            durationMs: message.duration_ms,
            createdAt: message.created_at,
          },
        });
      } catch (err) {
        console.error('audio:message error', err);
        ack?.({ ok: false, error: 'تعذر إرسال المقطع' });
      }
    });

    socket.on('disconnect', () => {
      const channelId = socket.data.channelId;
      presence.leaveAll(socket.id);
      if (channelId) {
        io.to(roomName(channelId)).emit('presence:update', { channelId, members: presence.list(channelId) });
      }
    });
  });
}

module.exports = { attachSocketServer };
