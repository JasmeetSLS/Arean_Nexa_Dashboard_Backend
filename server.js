// require('dotenv').config();

// const express = require('express');
// const cors = require('cors');
// const path = require('path');

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Routes
// const authRoutes = require('./auth/auth.routes');
// const reportRoutes = require('./admin/report/report.routes');
// const setupRoutes = require('./admin/setup/setup.routes');
// const permissionRoutes = require('./admin/permission/permission.routes');
// const chatRoutes = require('./admin/chat/chat.routes');
// const webhookRoutes = require('./admin/webhook/webhook.routes');

// const requireAuth = require('./middleware/auth');

// app.use('/api', authRoutes);
// app.use('/api', reportRoutes);
// app.use('/api', requireAuth, setupRoutes);
// app.use('/api', requireAuth, permissionRoutes);
// app.use('/api', requireAuth, chatRoutes);
// app.use('/api', requireAuth, webhookRoutes);

// app.get('/health', (_req, res) => {
//   res.json({ ok: true });
// });

// const PORT = Number(process.env.PORT) || 5000;

// app.listen(PORT, () => {
//   console.log(`API Server running on port ${PORT}`);
// });


require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); // ✅ Import HTTP
const { initSocket } = require('./utils/socket');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./auth/auth.routes');
const reportRoutes = require('./admin/report/report.routes');
const setupRoutes = require('./admin/setup/setup.routes');
const permissionRoutes = require('./admin/permission/permission.routes');
const chatRoutes = require('./admin/chat/chat.routes');
const webhookRoutes = require('./admin/webhook/webhook.routes');
const requireAuth = require('./middleware/auth');

app.use('/api', authRoutes);
app.use('/api', reportRoutes);
app.use('/api', requireAuth, setupRoutes);
app.use('/api', requireAuth, permissionRoutes);
app.use('/api', requireAuth, chatRoutes);
app.use('/api', requireAuth, webhookRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// ✅ Create HTTP Server and attach Socket.IO
const server = http.createServer(app);
const io = initSocket(server);

// ✅ Make io available in controllers via req.app.get('io')
app.set('io', io);

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, () => {
  console.log(`API + Socket.IO running on port ${PORT}`);
});