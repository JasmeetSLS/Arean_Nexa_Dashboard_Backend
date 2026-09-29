const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');

router.get('/chat/:trainerId/messages', chatController.getMessages);
router.get('/chat/summary',              chatController.getSummary);

module.exports = router;