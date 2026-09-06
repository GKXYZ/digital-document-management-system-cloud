const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const versionController = require('../controllers/versionController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 52428800 }, // 50MB
});

router.use(protect);

router.post('/upload', upload.single('document'), versionController.uploadNewVersion);
router.get('/:fileId', versionController.getVersions);
router.get('/:versionId/download', versionController.downloadVersion);
router.post('/restore', versionController.restoreVersion);
router.delete('/:versionId', versionController.deleteVersion);

module.exports = router;
