const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store (replace with Supabase in production)
const users = new Map();
const channels = new Map([
  ['global-riyadh', { id: 'global-riyadh', name: 'global · الرياض', members: [] }],
  ['global-jeddah', { id: 'global-jeddah', name: 'global · جدة', members: [] }],
]);
const messages = new Map();

function generatePIN() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `VM-${part1}-${part2}`;
}

// ── Auth ──────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { provider, email, name, handle, city } = req.body;
  if (!provider) return res.status(400).json({ error: 'provider required' });

  const id = uuidv4();
  const pin = generatePIN();
  const user = {
    id,
    pin,
    name: name || 'مستخدم جديد',
    handle: handle || `user_${id.slice(0, 6)}`,
    city: city || 'الرياض',
    email: email || null,
    provider,
    publicKey: `MIIBIjANBgkqhki...${id.slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    stats: { interactions: 0, rating: 0, helpCount: 0 },
  };
  users.set(id, user);
  res.json({ success: true, user: { ...user } });
});

app.get('/api/auth/user/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});

// ── PIN ───────────────────────────────────────────────
app.get('/api/pin/lookup/:pin', (req, res) => {
  const found = [...users.values()].find(u => u.pin === req.params.pin);
  if (!found) return res.status(404).json({ error: 'PIN not found' });
  res.json({ id: found.id, name: found.name, handle: found.handle, city: found.city, pin: found.pin });
});

app.post('/api/pin/add-friend', (req, res) => {
  const { userId, friendPin } = req.body;
  const me = users.get(userId);
  const friend = [...users.values()].find(u => u.pin === friendPin);
  if (!me) return res.status(404).json({ error: 'user not found' });
  if (!friend) return res.status(404).json({ error: 'friend PIN not found' });
  if (!me.friends) me.friends = [];
  if (!me.friends.includes(friend.id)) me.friends.push(friend.id);
  res.json({ success: true, friend: { id: friend.id, name: friend.name, handle: friend.handle, pin: friend.pin } });
});

// ── Channels ──────────────────────────────────────────
app.get('/api/channels', (req, res) => {
  res.json([...channels.values()].map(c => ({ ...c, memberCount: c.members.length })));
});

app.post('/api/channels/:id/join', (req, res) => {
  const { userId } = req.body;
  const ch = channels.get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'channel not found' });
  if (!ch.members.includes(userId)) ch.members.push(userId);
  res.json({ success: true, channel: { ...ch, memberCount: ch.members.length } });
});

// ── Messages ──────────────────────────────────────────
app.get('/api/channels/:id/messages', (req, res) => {
  const msgs = messages.get(req.params.id) || [];
  res.json(msgs.slice(-50));
});

app.post('/api/channels/:id/messages', (req, res) => {
  const { userId, text, ttl } = req.body;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'user not found' });

  const msg = {
    id: uuidv4(),
    channelId: req.params.id,
    userId,
    userName: user.name,
    userHandle: user.handle,
    text,
    ttl: ttl || 'auto',
    encryptedNote: 'AES-256-GCM',
    createdAt: new Date().toISOString(),
  };

  if (!messages.has(req.params.id)) messages.set(req.params.id, []);
  messages.get(req.params.id).push(msg);

  // TTL cleanup
  if (ttl === 'auto' || ttl === '24h') {
    const delay = ttl === '24h' ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
    setTimeout(() => {
      const list = messages.get(req.params.id) || [];
      const idx = list.findIndex(m => m.id === msg.id);
      if (idx !== -1) list.splice(idx, 1);
    }, delay);
  }

  res.json({ success: true, message: msg });
});

// ── PTT Sessions ──────────────────────────────────────
const pttSessions = new Map();

app.post('/api/ptt/start', (req, res) => {
  const { userId, channelId } = req.body;
  const session = { id: uuidv4(), userId, channelId, startedAt: new Date().toISOString() };
  pttSessions.set(session.id, session);
  res.json({ success: true, session });
});

app.post('/api/ptt/stop/:sessionId', (req, res) => {
  const session = pttSessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'session not found' });
  session.endedAt = new Date().toISOString();
  pttSessions.delete(req.params.sessionId);
  res.json({ success: true, duration: Date.now() - new Date(session.startedAt).getTime() });
});

// ── Health ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '5.0.0',
    users: users.size,
    channels: channels.size,
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`VibeMap AR v5.0 running on http://localhost:${PORT}`);
});
