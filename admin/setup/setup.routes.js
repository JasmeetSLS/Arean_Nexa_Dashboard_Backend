const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');

// ---- Setup panel ----
router.get ('/setup', setupController.getSetup);
router.post('/setup', setupController.saveSetup);

// ---- Dashboard / Grid / Filters ----
router.get('/grid/:project_id',         setupController.getGrid);
router.get('/dashboard/:project_id',    setupController.getDashboard);
router.get('/export/users/:project_id', setupController.exportUsers);
router.get('/filters',      setupController.getFilters);

module.exports = router;