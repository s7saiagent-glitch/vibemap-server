'use strict';

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory state ───────────────────────────────────────────────────────────
const connectedUsers = new Map();   // socketId → { id, pin, name, lat, lng, ws }
let chatHistory = [];               // last 50 messages
const MAX_HISTORY = 50;

// ── PIN generator ─────────────────────────────────────────────────────────────
function generatePIN() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = () => chars[Math.floor(Math.random() * chars.length)];
  const part1 = Array.from({ length: 4 }, rand).join('');
  const part2 = Array.from({ length: 4 }, rand).join('');
  return `VM-${part1}-${part2}`;
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────
function broadcast(data, excludeId = null) {
  const msg = JSON.stringify(data);
  connectedUsers.forEach((user) => {
    if (user.id === excludeId) return;
    if (user.ws && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(msg);
    }
  });
}

function broadcastAll(data) {
  const msg = JSON.stringify(data);
  connectedUsers.forEach((user) => {
    if (user.ws && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(msg);
    }
  });
}

function getUserList() {
  return [...connectedUsers.values()].map(u => ({
    id: u.id,
    name: u.name,
    pin: u.pin,
    lat: u.lat || null,
    lng: u.lng || null,
  }));
}

// ── REST endpoints ─────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    online: connectedUsers.size,
    version: '5.0.0',
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', ts: Date.now() });
});

// ── HTTP + WebSocket server ───────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const socketId = uuidv4();

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      // ── join ────────────────────────────────────────────────────────────────
      case 'join': {
        const userId = uuidv4();
        const pin = generatePIN();
        const name = (msg.name || 'مجهول').slice(0, 20);
        const lat = msg.lat || null;
        const lng = msg.lng || null;

        const userEntry = { id: userId, pin, name, lat, lng, ws };
        connectedUsers.set(socketId, userEntry);

        // Send welcome to the joiner
        ws.send(JSON.stringify({
          type: 'welcome',
          userId,
          pin,
          users: getUserList().filter(u => u.id !== userId),
          history: chatHistory,
        }));

        // Notify everyone else
        broadcast({
          type: 'user_joined',
          user: { id: userId, name, pin, lat, lng },
        }, userId);

        console.log(`[+] ${name} (${pin}) joined — ${connectedUsers.size} online`);
        break;
      }

      // ── chat ────────────────────────────────────────────────────────────────
      case 'chat': {
        const sender = connectedUsers.get(socketId);
        if (!sender) return;
        const text = (msg.text || '').slice(0, 500);
        if (!text.trim()) return;

        const chatMsg = {
          id: uuidv4(),
          userId: sender.id,
          name: sender.name,
          text,
          time: Date.now(),
        };

        chatHistory.push(chatMsg);
        if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

        // Broadcast to everyone including sender
        broadcastAll({ type: 'chat', ...chatMsg });
        break;
      }

      // ── ptt_start ───────────────────────────────────────────────────────────
      case 'ptt_start': {
        const sender = connectedUsers.get(socketId);
        if (!sender) return;
        broadcast({
          type: 'ptt_start',
          userId: sender.id,
          name: sender.name,
        }, sender.id);
        break;
      }

      // ── ptt_stop ────────────────────────────────────────────────────────────
      case 'ptt_stop': {
        const sender = connectedUsers.get(socketId);
        if (!sender) return;
        broadcast({
          type: 'ptt_stop',
          userId: sender.id,
        }, sender.id);
        break;
      }

      // ── location ────────────────────────────────────────────────────────────
      case 'location': {
        const sender = connectedUsers.get(socketId);
        if (!sender) return;
        sender.lat = msg.lat || null;
        sender.lng = msg.lng || null;
        broadcast({
          type: 'location',
          userId: sender.id,
          lat: sender.lat,
          lng: sender.lng,
        }, sender.id);
        break;
      }
    }
  });

  ws.on('close', () => {
    const user = connectedUsers.get(socketId);
    if (user) {
      connectedUsers.delete(socketId);
      broadcast({ type: 'user_left', userId: user.id });
      console.log(`[-] ${user.name} left — ${connectedUsers.size} online`);
    }
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
    const user = connectedUsers.get(socketId);
    if (user) {
      connectedUsers.delete(socketId);
      broadcast({ type: 'user_left', userId: user.id });
    }
  });
});

// ── Glitch keep-alive ping ────────────────────────────────────────────────────
if (process.env.PROJECT_DOMAIN) {
  setInterval(() => {
    const url = `https://${process.env.PROJECT_DOMAIN}.glitch.me/api/health`;
    require('https').get(url).on('error', () => {});
  }, 280000);
}

server.listen(PORT, () => {
  console.log(`VibeMap AR v5.0 WebSocket server running on http://localhost:${PORT}`);
});
