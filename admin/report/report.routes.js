const express = require('express');
const reportController = require('./report.controller');
const upload = require('../../middleware/upload');

const router = express.Router();

// Arena Report API
router.get('/export-arena-daily-report', reportController.exportArenaDailyReport)
router.get('/arena-overall-attendance', reportController.exportArenaOverallAttendance)
router.get('/export-arena-overall-result', reportController.exportArenaOverallResult);
router.get('/export-arena-winner', reportController.exportArenaWinnerSummary);
router.get('/arena-filters', reportController.getArenaFilters);



// TV Report API
router.get('/export-tv-morning', reportController.exportTVMorning);
router.get('/export-tv-overall-attendance', reportController.exportTVOverallAttendance);
router.get('/export-tv-overall-result', reportController.exportTVOverallResult);
router.get('/export-tv-winner', reportController.exportTVWinners);
router.get('/export-tv-winners-zip', reportController.exportTVWinnersZIP);
router.get('/tv-filters', reportController.getTVFilters);



router.get('/download-template-round1', reportController.downloadRound1Sample);
router.post('/import-round1', upload.single('file'), reportController.importRound1);


// 2. Download Template
router.get('/download-template-main-round', reportController.downloadMainRoundTemplate);

// 3. Import Excel File
router.post('/import-main-round', upload.single('file'), reportController.importMainRoundRecords);

module.exports = router;