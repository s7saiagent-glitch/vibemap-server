import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../services/socket';

let tempIdCounter = 0;
function nextTempId() {
  tempIdCounter += 1;
  return `local-${Date.now()}-${tempIdCounter}`;
}

// يدير اتصال Socket.io لقناة واحدة: انضمام، حضور، مؤشر التحدث،
// استقبال/بث الصوت اللحظي، وطابور إرسال offline يُفرَّغ تلقائياً عند عودة الاتصال
export function useChannelSocket({ token, channelId }) {
  const [connectionState, setConnectionState] = useState('connecting'); // connecting | connected | reconnecting | disconnected
  const [members, setMembers] = useState([]);
  const [speaker, setSpeaker] = useState(null);
  const [liveMessages, setLiveMessages] = useState([]); // {id/clientTempId, senderName, audioBlobUrl, pending, ...}

  const socketRef = useRef(null);
  const queueRef = useRef([]); // مقاطع بانتظار الإرسال (لا يوجد اتصال حالياً)

  const flushQueue = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    while (queueRef.current.length) {
      const item = queueRef.current.shift();
      socket.emit('audio:message', item, () => {});
    }
  }, []);

  useEffect(() => {
    if (!token || !channelId) return undefined;

    const socket = createSocket(token);
    socketRef.current = socket;
    socket.connect();
    setConnectionState('connecting');

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('channel:join', { channelId }, (resp) => {
        if (resp?.ok) setMembers(resp.members || []);
      });
      flushQueue();
    });

    socket.on('disconnect', () => setConnectionState('disconnected'));
    socket.io.on('reconnect_attempt', () => setConnectionState('reconnecting'));

    socket.on('presence:update', (payload) => {
      if (payload.channelId === channelId) setMembers(payload.members || []);
    });

    socket.on('speaking:start', (payload) => {
      if (payload.channelId === channelId) setSpeaker(payload.speaker);
    });
    socket.on('speaking:stop', (payload) => {
      if (payload.channelId === channelId) {
        setSpeaker((current) => (current?.id === payload.speaker?.id ? null : current));
      }
    });

    socket.on('audio:live', (payload) => {
      if (payload.channelId !== channelId) return;
      const bytes = payload.buffer instanceof ArrayBuffer ? payload.buffer : payload.buffer?.buffer || payload.buffer;
      const blob = new Blob([bytes], { type: payload.mimeType || 'audio/webm' });
      const url = URL.createObjectURL(blob);

      setLiveMessages((prev) => [
        ...prev,
        {
          id: payload.clientTempId || nextTempId(),
          clientTempId: payload.clientTempId,
          senderId: payload.senderId,
          senderName: payload.senderName,
          isGuest: payload.isGuest,
          durationMs: payload.durationMs,
          createdAt: payload.createdAt,
          audioBlobUrl: url,
          pending: true,
        },
      ]);

      const audio = new Audio(url);
      audio.play().catch(() => {
        /* المتصفح منع التشغيل التلقائي بدون تفاعل مستخدم سابق - يبقى بالسجل للتشغيل اليدوي */
      });
    });

    socket.on('audio:saved', (payload) => {
      if (payload.channelId !== channelId) return;
      setLiveMessages((prev) =>
        prev.map((m) =>
          m.clientTempId && m.clientTempId === payload.clientTempId
            ? { ...m, id: payload.message.id, audioUrl: payload.message.audioUrl, pending: false }
            : m
        )
      );
    });

    return () => {
      socket.emit('channel:leave', { channelId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, channelId, flushQueue]);

  const pttStart = useCallback(() => {
    socketRef.current?.emit('ptt:start', { channelId });
  }, [channelId]);

  const pttStop = useCallback(() => {
    socketRef.current?.emit('ptt:stop', { channelId });
  }, [channelId]);

  const sendAudio = useCallback(
    async ({ blob, mimeType, durationMs }) => {
      const buffer = await blob.arrayBuffer();
      const clientTempId = nextTempId();
      const payload = { channelId, mimeType, durationMs, buffer, clientTempId };

      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit('audio:message', payload, (resp) => {
          if (!resp?.ok) {
            // فشل الإرسال (مثلاً rate limit) - لا نعيد المحاولة تلقائياً لتفادي التكرار
            console.warn('فشل بث المقطع:', resp?.error);
          }
        });
      } else {
        queueRef.current.push(payload); // بدون اتصال: يُبث تلقائياً عند عودة الاتصال
      }
      return clientTempId;
    },
    [channelId]
  );

  return { connectionState, members, speaker, liveMessages, pttStart, pttStop, sendAudio };
}
