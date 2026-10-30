const router = require('express').Router();
const webhook = require('./webhook.controller');

router.post('/webhook/rounds', webhook.saveRound);
router.post('/webhook/reset', webhook.resetRounds);

module.exports = router;