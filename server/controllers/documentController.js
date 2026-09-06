const Document = require('../models/Document');
const User = require('../models/User');
const Notification = require('../models/Notification');
const s3Client = require('../config/s3');
const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const { validationResult } = require('express-validator');

// Helper: Generate unique S3 key
const generateS3Key = (userId, originalName) => {
  const ext = path.extname(originalName);
  const uniqueId = crypto.randomUUID();
  return `documents/${userId}/${uniqueId}${ext}`;
};

// Helper: Get file type category
const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType.includes('word') ||
    mimeType.includes('document')
  )
    return 'doc';
  if (
    mimeType.includes('sheet') ||
    mimeType.includes('excel') ||
    mimeType === 'text/csv'
  )
    return 'xls';
  if (
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint')
  )
    return 'ppt';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('tar') ||
    mimeType.includes('compressed')
  )
    return 'zip';
  return 'other';
};

// @desc    Upload document(s)
// @route   POST /api/documents/upload
// @access  Private
const uploadDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a file to upload',
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const { description, tags, folderId } = req.body;

    // Atomically check and reserve storage limit to prevent race conditions during bulk uploads
    const user = await User.findOneAndUpdate(
      {
        _id: req.user.id,
        $expr: { $lte: [{ $add: ['$storageUsed', size] }, '$storageLimit'] },
      },
      { $inc: { storageUsed: size } },
      { new: true }
    );

    if (!user) {
      // Check if it failed because user doesn't exist or limit exceeded
      const existingUser = await User.findById(req.user.id);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.status(400).json({
        success: false,
        message: 'Storage limit exceeded. Please delete some files or upgrade your plan.',
      });
    }

    try {
      // Generate S3 key and upload
      const s3Key = generateS3Key(req.user.id, originalname);

      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

      // Parse tags
      let parsedTags = [];
      if (tags) {
        parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;
      }

      // Save document metadata to MongoDB
      const document = await Document.create({
        name: path.parse(originalname).name,
        originalName: originalname,
        description: description || '',
        fileType: getFileType(mimetype),
        mimeType: mimetype,
        size,
        s3Key,
        s3Url,
        tags: parsedTags,
        folderId: folderId || null,
        uploadedBy: req.user.id,
      });

      // Create success notification
      await Notification.create({
        user: req.user.id,
        title: 'Upload Successful',
        message: `${document.originalName} was uploaded successfully.`,
        type: 'success',
        icon: 'UploadCloud',
        referenceId: document._id,
        referenceType: 'Document',
      });

      // Check storage threshold (e.g., 90%)
      const storagePercentage = (user.storageUsed / user.storageLimit) * 100;
      if (storagePercentage >= 90) {
        await Notification.create({
          user: req.user.id,
          title: 'Storage Warning',
          message: `You have used ${storagePercentage.toFixed(1)}% of your storage limit.`,
          type: 'storage_warning',
          icon: 'AlertCircle',
        });
      }

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document,
      });

      
    } catch (uploadError) {
      // Rollback storage reservation on failure
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { storageUsed: -size },
      });
      throw uploadError;
    }
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading document',
    });
  }
};

// @desc    Get all documents for the logged-in user
// @route   GET /api/documents
// @access  Private
const getDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      folderId,
      fileType,
      search,
      favorite,
    } = req.query;

    const query = {
      uploadedBy: req.user.id,
      isDeleted: false,
    };

    // Filter by folder (allow null for root)
    if (folderId !== undefined) {
      query.folderId = folderId === 'null' ? null : folderId;
    }

    // Filter by file type
    if (fileType) query.fileType = fileType;

    // Filter favorites
    if (favorite === 'true') query.isFavorite = true;

    // Text/Regex search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: { $regex: searchRegex } },
        { originalName: { $regex: searchRegex } },
        { fileType: { $regex: searchRegex } },
      ];
    }

    const documents = await Document.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Document.countDocuments(query);

    res.status(200).json({
      success: true,
      count: documents.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      documents,
    });
  } catch (error) {
    console.error('Get Documents Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching documents',
    });
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get Document Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching document',
    });
  }
};

// @desc    Get presigned download URL
// @route   GET /api/documents/:id/download
// @access  Private
const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Generate presigned URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: document.s3Key,
      ResponseContentDisposition: `attachment; filename="${document.originalName}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    res.status(200).json({
      success: true,
      downloadUrl,
      fileName: document.originalName,
    });

    
  } catch (error) {
    console.error('Download Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating download link',
    });
  }
};

// @desc    Get presigned preview URL
// @route   GET /api/documents/:id/preview
// @access  Private
const previewDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: document.s3Key,
    });

    const previewUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    res.status(200).json({
      success: true,
      previewUrl,
      document,
    });

    
  } catch (error) {
    console.error('Preview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
    });
  }
};

// @desc    Update document metadata
// @route   PUT /api/documents/:id
// @access  Private
const updateDocument = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name, description, tags, folderId, isFavorite } = req.body;

    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Update fields
    if (name !== undefined) document.name = name;
    if (description !== undefined) document.description = description;
    if (tags !== undefined) {
      document.tags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;
    }
    if (folderId !== undefined) document.folderId = folderId || null;
    if (isFavorite !== undefined) document.isFavorite = isFavorite;

    await document.save();

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      document,
    });

    if (name !== undefined) {
      
    }
    if (isFavorite !== undefined) {
      
    }
  } catch (error) {
    console.error('Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating document',
    });
  }
};

// @desc    Soft delete document (move to trash)
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Soft delete
    document.isDeleted = true;
    document.deletedAt = new Date();
    await document.save();

    await Notification.create({
      user: req.user.id,
      title: 'File Deleted',
      message: `${document.originalName || document.name} was moved to trash.`,
      type: 'info',
      icon: 'Trash2',
      referenceId: document._id,
      referenceType: 'Document',
    });

    res.status(200).json({
      success: true,
      message: 'Document moved to trash',
    });

    
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting document',
    });
  }
};

// @desc    Restore document from trash
// @route   PUT /api/documents/:id/restore
// @access  Private
const restoreDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
      isDeleted: true,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found in trash',
      });
    }

    document.isDeleted = false;
    document.deletedAt = null;
    await document.save();

    await Notification.create({
      user: req.user.id,
      title: 'File Restored',
      message: `${document.originalName || document.name} was restored from trash.`,
      type: 'file_restored',
      icon: 'RefreshCw',
      referenceId: document._id,
      referenceType: 'Document',
    });

    res.status(200).json({
      success: true,
      message: 'Document restored successfully',
      document,
    });

    
  } catch (error) {
    console.error('Restore Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring document',
    });
  }
};

// @desc    Permanently delete document
// @route   DELETE /api/documents/:id/permanent
// @access  Private
const permanentDelete = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    // Delete from S3
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: document.s3Key,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));

    // Update user storage
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { storageUsed: -document.size },
    });

    // Delete from MongoDB
    await Document.findByIdAndDelete(document._id);

    res.status(200).json({
      success: true,
      message: 'Document permanently deleted',
    });

    
  } catch (error) {
    console.error('Permanent Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting document',
    });
  }
};

// @desc    Get trash documents
// @route   GET /api/documents/trash
// @access  Private
const getTrash = async (req, res) => {
  try {
    const documents = await Document.find({
      uploadedBy: req.user.id,
      isDeleted: true,
    }).sort('-deletedAt');

    res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    console.error('Get Trash Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trash',
    });
  }
};

// @desc    Get storage stats
// @route   GET /api/documents/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const totalDocs = await Document.countDocuments({
      uploadedBy: req.user.id,
      isDeleted: false,
    });

    const trashCount = await Document.countDocuments({
      uploadedBy: req.user.id,
      isDeleted: true,
    });

    const favoriteCount = await Document.countDocuments({
      uploadedBy: req.user.id,
      isDeleted: false,
      isFavorite: true,
    });

    // Get file type distribution
    const rawDistribution = await Document.aggregate([
      {
        $match: {
          uploadedBy: user._id,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$fileType',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
        },
      },
    ]);

    const breakdownMap = {};
    rawDistribution.forEach(item => {
      let rawType = (item._id || '').toLowerCase();
      let type = 'Other';
      
      if (rawType.includes('pdf')) type = 'PDF';
      else if (rawType.includes('doc') || rawType.includes('word') || rawType.includes('text')) type = 'DOC';
      else if (rawType.includes('xls') || rawType.includes('spreadsheet') || rawType.includes('excel')) type = 'XLS';
      else if (rawType.includes('ppt') || rawType.includes('presentation')) type = 'PPT';
      else if (rawType.includes('image') || rawType.includes('jpg') || rawType.includes('png') || rawType.includes('jpeg') || rawType.includes('gif') || rawType.includes('webp')) type = 'Image';
      else if (rawType.includes('zip') || rawType.includes('archive') || rawType.includes('rar') || rawType.includes('7z')) type = 'ZIP';
      
      if (!breakdownMap[type]) {
        breakdownMap[type] = { type, size: 0, count: 0 };
      }
      breakdownMap[type].size += item.totalSize;
      breakdownMap[type].count += item.count;
    });

    const breakdown = Object.values(breakdownMap).sort((a, b) => b.size - a.size);

    // Get recent uploads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUploads = await Document.countDocuments({
      uploadedBy: req.user.id,
      isDeleted: false,
      createdAt: { $gte: sevenDaysAgo },
    });

    // Get folder count
    const Folder = require('../models/Folder');
    const folderCount = await Folder.countDocuments({ userId: req.user.id });

    res.status(200).json({
      success: true,
      stats: {
        totalDocuments: totalDocs,
        trashCount,
        favoriteCount,
        recentUploads,
        storageUsed: user.storageUsed,
        totalUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        storagePercentage: ((user.storageUsed / user.storageLimit) * 100).toFixed(1),
        usagePercentage: ((user.storageUsed / user.storageLimit) * 100).toFixed(1),
        breakdown,
        folderCount,
      },
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
    });
  }
};

// @desc    Bulk move documents to a folder
// @route   PUT /api/documents/move
// @access  Private
const moveDocuments = async (req, res) => {
  try {
    const { documentIds, targetFolderId } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No documents provided' });
    }

    await Document.updateMany(
      { _id: { $in: documentIds }, uploadedBy: req.user.id },
      { $set: { folderId: targetFolderId || null } }
    );

    if (documentIds.length > 0) {
      await Notification.create({
        user: req.user.id,
        title: 'Files Moved',
        message: `${documentIds.length} file(s) were moved successfully.`,
        type: 'file_moved',
        icon: 'FolderInput',
      });
    }

    res.status(200).json({
      success: true,
      message: `${documentIds.length} files moved successfully`,
    });

    
  } catch (error) {
    console.error('Move Documents Error:', error);
    res.status(500).json({ success: false, message: 'Error moving documents' });
  }
};

// @desc    Check if document exists by name and folderId
// @route   GET /api/documents/check
// @access  Private
const checkExists = async (req, res) => {
  try {
    const { name, folderId } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    
    const query = {
      uploadedBy: req.user.id,
      originalName: name,
      isDeleted: false,
    };
    
    if (folderId && folderId !== 'null') {
      query.folderId = folderId;
    } else {
      query.folderId = null;
    }
    
    const document = await Document.findOne(query);
    
    res.status(200).json({
      success: true,
      exists: !!document,
      document: document || null
    });
  } catch (error) {
    console.error('Check Exists Error:', error);
    res.status(500).json({ success: false, message: 'Error checking document existence' });
  }
};

module.exports = {
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
};
