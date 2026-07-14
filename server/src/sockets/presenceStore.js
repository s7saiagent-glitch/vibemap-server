// تتبّع الحضور اللحظي بالذاكرة (لكل عملية Node) - يكفي لسيرفر واحد بالمرحلة الأولى
// channelId -> Map<socketId, { id, name, isGuest }>
const rooms = new Map();

function join(channelId, socketId, member) {
  if (!rooms.has(channelId)) rooms.set(channelId, new Map());
  rooms.get(channelId).set(socketId, member);
}

function leave(channelId, socketId) {
  const room = rooms.get(channelId);
  if (!room) return;
  room.delete(socketId);
  if (room.size === 0) rooms.delete(channelId);
}

function leaveAll(socketId) {
  for (const [channelId, room] of rooms.entries()) {
    if (room.has(socketId)) {
      room.delete(socketId);
      if (room.size === 0) rooms.delete(channelId);
    }
  }
}

function list(channelId) {
  const room = rooms.get(channelId);
  return room ? Array.from(room.values()) : [];
}

module.exports = { join, leave, leaveAll, list };
