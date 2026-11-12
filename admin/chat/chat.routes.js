const express = require('express');
const router  = express.Router();
const ctrl    = require('./chat.controller');

router.get ('/chat/me',                 ctrl.getMe);
router.get ('/chat/users',              ctrl.getChatUsers);
router.get ('/chat/messages/:username', ctrl.getMessages);   // 👈 :username
router.post('/chat/messages',           ctrl.sendMessage);

module.exports = router;