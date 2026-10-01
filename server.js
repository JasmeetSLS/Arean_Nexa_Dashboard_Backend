require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const http    = require('http');

const app = express();
app.use(cors());
app.use(express.json());

// ---- Routes ----
const authRoutes     = require('./auth/auth.routes');
const setupRoutes    = require('./admin/setup/setup.routes');
const chatRoutes     = require('./admin/chat/chat.routes');
const { requireAuth } = require('./middleware/auth');

app.use('/api', authRoutes);
app.use('/api',requireAuth, setupRoutes);
app.use('/api',requireAuth, chatRoutes);

// ---- Health check ----
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- HTTP server + Socket.IO ----
const server = http.createServer(app);
const { initSocket } = require('./socket');
initSocket(server);

// ---- Start ----
const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, () => {
  console.log(`✅ API + Socket.IO running → http://localhost:${PORT}`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/grid`);
  console.log(`   GET  /api/dashboard`);
  console.log(`   GET  /api/filters`);
  console.log(`   GET  /api/export/users`);
  console.log(`   GET  /api/chat/:trainerId/messages`);
  console.log(`   GET  /api/chat/summary`);
});