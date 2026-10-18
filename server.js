require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const http    = require('http');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  next();
});

const authRoutes       = require('./auth/auth.routes');
const setupRoutes      = require('./admin/setup/setup.routes');
const permissionRoutes = require('./admin/permission/permission.routes');
const chatRoutes       = require('./admin/chat/chat.routes');
const webhookRoutes    = require('./admin/webhook/webhook.routes');
const requireAuth      = require('./middleware/auth');

app.use('/api', authRoutes);
app.use('/api',requireAuth, setupRoutes);
app.use('/api', requireAuth, permissionRoutes);
app.use('/api', requireAuth, chatRoutes);
app.use('/api', requireAuth,webhookRoutes );

app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const { initSocket } = require('./socket');
initSocket(server);

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, () => {
  console.log(`✅ API + Socket.IO running → http://localhost:${PORT}`);
});