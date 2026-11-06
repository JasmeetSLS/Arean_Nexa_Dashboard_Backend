const express = require('express');
const controller = require('./auth.controller');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/auth/login', controller.login);
router.post('/webhook/reset', controller.resetRounds);

module.exports = router;