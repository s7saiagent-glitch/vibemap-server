const http = require('http');
const { Server } = require('socket.io');

const env = require('./config/env');
const app = require('./app');
const { attachSocketServer } = require('./sockets');
const { startCleanupJobs } = require('./jobs/pruneExpired');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: env.corsOrigin, credentials: true },
  maxHttpBufferSize: 4 * 1024 * 1024, // يسمح بمقاطع PTT الصوتية عبر الـ socket
});

attachSocketServer(io);
startCleanupJobs();

server.listen(env.port, () => {
  console.log(`لبيه (Labbeih) يعمل على المنفذ ${env.port} [${env.nodeEnv}]`);
});
