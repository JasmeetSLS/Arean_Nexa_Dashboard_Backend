const express = require('express');
const router  = express.Router();
const chatController = require('./chat.controller');

// Identity
router.get ('/chatbot/me',               chatController.chatbotMe);

// Lists — MUST come before /chat/:trainerId/*
router.get ('/chat/summary',             chatController.getChatSummary);
router.get ('/chat/admins',              chatController.getAllAdmins);
router.get ('/chat/trainers',            chatController.getAllTrainers);

// Conversation
router.get ('/chat/:trainerId/messages', chatController.getChatHistory);
router.post('/chat/:trainerId/read',     chatController.markChatRead);
router.post('/chat/:trainerId/send',     chatController.sendChatMessage);

module.exports = router;