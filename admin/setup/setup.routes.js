const express = require('express');
const router  = express.Router();
const upload  = require('../../middleware/upload');
const setupController = require('./setup.controller');

// ---- Projects ----
router.post('/projects', setupController.addProject);
router.get ('/projects', setupController.getProjects);
router.get   ('/projects/:id', setupController.getProjectById);
router.put   ('/projects/:id', setupController.updateProject);
router.delete('/projects/:id', setupController.deleteProject);

// Excel: template + upload
router.get ('/participants/template', setupController.downloadParticipantTemplate);
router.post('/participants/upload',   upload.single('file'), setupController.uploadParticipants);

// ---- Dashboard / grids / filters ----
router.get('/filters',          setupController.getFilters);
router.get('/dashboard',        setupController.getDashboard);
router.get('/grid-trainer',     setupController.getGridTrainer);
router.get('/grid-participant', setupController.getGridParticipant);

module.exports = router;