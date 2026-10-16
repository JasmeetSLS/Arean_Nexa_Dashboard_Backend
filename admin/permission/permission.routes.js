const express = require('express');
const router = express.Router();
const permissionController = require('./permission.controller');

router.get ('/permissions/admins',  permissionController.listAdmins);
router.get ('/permissions/options', permissionController.getOptions);
router.post('/permissions',         permissionController.savePermissions);

module.exports = router;