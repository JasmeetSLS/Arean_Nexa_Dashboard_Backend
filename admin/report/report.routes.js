const express = require('express');
const reportController = require('./report.controller');
const upload = require('../../middleware/upload');

const router = express.Router();

router.get('/export-arena-morning', reportController.exportArenaMorning);
router.get('/export-arena-attendance', reportController.exportArenaAttendance);
router.get('/export-arena-overall-result', reportController.exportArenaOverallResult);
router.get('/export-arena-winner', reportController.exportArenaWinnerSummary);


router.get('/export-tv-morning', reportController.exportTVMorning);


router.get('/download-template-round1', reportController.downloadRound1Sample);
router.post('/import-round1', upload.single('file'), reportController.importRound1);


// 2. Download Template
router.get('/download-template-main-round', reportController.downloadMainRoundTemplate);

// 3. Import Excel File
router.post('/import-main-round', upload.single('file'), reportController.importMainRoundRecords);

module.exports = router;