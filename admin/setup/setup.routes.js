const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');

// ---- Setup panel ----
router.post('/projects', setupController.addProject);

router.get('/projects',                    setupController.getProjects);
router.get('/dashboard/:project_id',       setupController.getDashboard);
router.get('/grid-trainer/:project_id',     setupController.getGridTrainer);
router.get('/grid-participant/:project_id', setupController.getGridParticipant);

module.exports = router;

module.exports = router;
router.get('/export/users/:project_id', setupController.exportUsers);
// router.get('/filters',      setupController.getFilters);

module.exports = router;