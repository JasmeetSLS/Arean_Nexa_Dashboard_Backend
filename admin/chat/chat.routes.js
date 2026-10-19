const express = require('express');
const router  = express.Router();
const ctrl    = require('./chat.controller');

router.get ('/chat/users',            ctrl.getChatUsers);
router.get ('/chat/messages/:userId', ctrl.getMessages);
router.post('/chat/messages',         ctrl.sendMessage);

module.exports = router;