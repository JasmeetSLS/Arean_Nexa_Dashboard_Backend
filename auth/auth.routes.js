const express = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/login', controller.login);

module.exports = router;