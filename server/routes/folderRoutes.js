const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  createFolder,
  getFolders,
  deleteFolder
} = require('../controllers/folderController');

const router = express.Router();

router.use(protect);

const folderValidation = [
  body('name').notEmpty().withMessage('Folder name is required').trim().escape(),
  body('parentFolderId').optional({ nullable: true, checkFalsy: true }).isMongoId(),
];

router.post('/', folderValidation, createFolder);
router.get('/', getFolders);
router.delete('/:id', deleteFolder);

module.exports = router;
