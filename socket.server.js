
require('dotenv').config();

const http = require('http');
const { initSocket } = require('./utils/socket');

const socketServer = http.createServer();

const io = initSocket(socketServer);

const SOCKET_PORT = Number(process.env.SOCKET_PORT) || 5001;

socketServer.listen(SOCKET_PORT, () => {
  console.log(`Socket.IO Server running on port ${SOCKET_PORT}`);
});
