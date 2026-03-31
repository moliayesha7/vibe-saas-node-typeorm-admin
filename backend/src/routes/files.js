const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { upload } = require('../config/cloudinary');

router.use(authenticate);

router.get('/', requirePermission('files:read'), fileController.getFiles);
router.post('/', requirePermission('files:write'), upload.single('file'), fileController.uploadFile);
router.delete('/:id', requirePermission('files:delete'), fileController.deleteFile);

module.exports = router;
