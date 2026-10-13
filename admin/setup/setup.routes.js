const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');

// ---- Setup panel ----
router.get ('/setup', setupController.getSetup);
router.post('/setup', setupController.saveSetup);

// ---- Dashboard / Grid / Filters ----
router.get('/grid',         setupController.getGrid);
router.get('/dashboard',    setupController.getDashboard);
router.get('/filters',      setupController.getFilters);
router.get('/export/users', setupController.exportUsers);

module.exports = router;