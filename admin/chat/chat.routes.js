const express = require('express');
const router  = express.Router();
const ctrl    = require('./chat.controller');

router.get('/chatbot/me', ctrl.me);                 // who am I

router.get('/users', ctrl.getUsers);                // step 2
router.get('/conversations', ctrl.getConversations); // step 3
router.post('/conversations', ctrl.createConversation); // step 4
router.get('/conversations/:id/messages', ctrl.getMessages); // step 5

router.post('/chat/trainer-token/:trainerId', ctrl.trainerToken);

module.exports = router;