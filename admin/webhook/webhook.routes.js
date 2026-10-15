const router = require('express').Router();
const webhook = require('./webhook.controller');

router.post('/webhook/rounds', webhook.saveRound);

module.exports = router;