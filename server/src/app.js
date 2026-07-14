const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimit');
const { sanitizeBody } = require('./middleware/sanitize');

const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const planRoutes = require('./routes/plans');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeBody);
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(generalLimiter);

app.get('/health', (req, res) => res.json({ ok: true, service: 'labbeih-server', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/channels', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plans', planRoutes);

app.use((req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.publicMessage || 'حدث خطأ بالسيرفر' });
});

module.exports = app;
