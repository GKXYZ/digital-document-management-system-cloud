const Folder = require('../models/Folder');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
const createFolder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, parentFolderId } = req.body;
    
    // Check for duplicate in the same directory
    const existing = await Folder.findOne({ 
      userId: req.user.id, 
      parentFolderId: parentFolderId || null, 
      name 
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists here.' });
    }

    const folder = await Folder.create({
      name,
      parentFolderId: parentFolderId || null,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder
    });

    
  } catch (error) {
    console.error('Create Folder Error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists here.' });
    }
    res.status(500).json({ success: false, message: 'Error creating folder' });
  }
};

// @desc    Get folders (optionally by parentFolderId)
// @route   GET /api/folders
// @access  Private
const getFolders = async (req, res) => {
  try {
    const { parentFolderId, search } = req.query;
    
    const query = { userId: req.user.id };
    
    if (search) {
      // If searching, ignore parentFolderId to search globally
      query.name = { $regex: new RegExp(search, 'i') };
    } else if (parentFolderId !== undefined) {
      query.parentFolderId = parentFolderId === 'null' ? null : parentFolderId;
    }

    const folders = await Folder.find(query).sort({ name: 1 });
    
    // Generate Breadcrumb path if inside a folder
    let path = [];
    if (parentFolderId && parentFolderId !== 'null') {
      let currentFolder = await Folder.findOne({ _id: parentFolderId, userId: req.user.id });
      while (currentFolder) {
        path.unshift({ _id: currentFolder._id, name: currentFolder.name });
        if (currentFolder.parentFolderId) {
          currentFolder = await Folder.findOne({ _id: currentFolder.parentFolderId, userId: req.user.id });
        } else {
          currentFolder = null;
        }
      }
    }

    res.status(200).json({
      success: true,
      count: folders.length,
      folders,
      path
    });
  } catch (error) {
    console.error('Get Folders Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching folders' });
  }
};

// @desc    Soft delete folder (Move to trash equivalent)
// @route   DELETE /api/folders/:id
// @access  Private
const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // For simplicity in this iteration, we permanently delete the folder and soft-delete its documents
    // Note: In a real system, you'd recursively soft-delete folders or have an isDeleted flag on folders.
    // Given the prompt, we'll just soft-delete the immediate documents and delete the folder.
    // A robust recursive delete is better, but this handles basic deletion.
    
    // Soft delete documents inside this folder
    await Document.updateMany(
      { folderId: folder._id, uploadedBy: req.user.id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
    
    // We should also delete subfolders or handle recursion...
    // To keep it safe, prevent deletion if it contains subfolders
    const subfolders = await Folder.countDocuments({ parentFolderId: folder._id, userId: req.user.id });
    if (subfolders > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete folder. It contains subfolders.' });
    }

    await Folder.findByIdAndDelete(folder._id);

    await Notification.create({
      user: req.user.id,
      title: 'Folder Deleted',
      message: `"${folder.name}" and its files were moved to trash.`,
      type: 'info',
      icon: 'Trash2',
      referenceId: folder._id,
      referenceType: 'Folder',
    });

    res.status(200).json({
      success: true,
      message: 'Folder deleted and its files moved to trash'
    });

    
  } catch (error) {
    console.error('Delete Folder Error:', error);
    res.status(500).json({ success: false, message: 'Error deleting folder' });
  }
};

module.exports = {
  createFolder,
  getFolders,
  deleteFolder
};
