const express = require('express');
const router = express.Router();
const setupController = require('./setup.controller');

// ---- Setup panel ----
router.post('/projects', setupController.addProject);

router.get('/projects',                    setupController.getProjects);
router.get('/filters',          setupController.getFilters);
router.get('/dashboard',        setupController.getDashboard);
router.get('/grid-trainer',     setupController.getGridTrainer);
router.get('/grid-participant', setupController.getGridParticipant);


module.exports = router;