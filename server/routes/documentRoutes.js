const express = require('express');
const multer = require('multer');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  downloadDocument,
  previewDocument,
  updateDocument,
  deleteDocument,
  restoreDocument,
  permanentDelete,
  getTrash,
  getStats,
  moveDocuments,
  checkExists,
} = require('../controllers/documentController');

const router = express.Router();

// Multer config — store files in memory buffer before sending to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Only allow strictly approved formats
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('UNSUPPORTED_TYPE'), false);
    }
  },
});

// Middleware to gracefully handle multer errors
const handleUpload = (req, res, next) => {
  const uploadMiddleware = upload.single('document');
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Maximum allowed file size is 50 MB.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      if (err.message === 'UNSUPPORTED_TYPE') {
        return res.status(400).json({ success: false, message: 'This file type is not supported. Please upload only PDF, Word, Excel, PowerPoint, Image, or ZIP files.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// All routes below require authentication
router.use(protect);

// Stats & Trash & Check (placed before :id routes to avoid conflicts)
router.get('/stats', getStats);
router.get('/trash', getTrash);
router.get('/check', checkExists);

const documentValidation = [
  body('name').optional().trim().escape(),
  body('description').optional().trim().escape(),
  body('folderId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
  body('tags').optional().trim(),
  body('isFavorite').optional().isBoolean(),
];

// CRUD routes
router.post('/upload', handleUpload, documentValidation, uploadDocument);
router.put('/move', moveDocuments);
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);
router.get('/:id/preview', previewDocument);
router.put('/:id', documentValidation, updateDocument);
router.delete('/:id', deleteDocument);
router.put('/:id/restore', restoreDocument);
router.delete('/:id/permanent', permanentDelete);

module.exports = router;
