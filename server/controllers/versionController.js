const Version = require('../models/Version');
const Document = require('../models/Document');
const User = require('../models/User');
const Share = require('../models/Share');
const Notification = require('../models/Notification');
const s3Client = require('../config/s3');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

const generateS3Key = (userId, originalName) => {
  const ext = path.extname(originalName);
  const uniqueId = crypto.randomUUID();
  return `documents/${userId}/${uniqueId}${ext}`;
};

const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'images';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'xls';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'ppt';
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'zip';
  return 'other';
};

const hasPermission = async (document, userId) => {
  if (document.uploadedBy.toString() === userId) return true;
  const share = await Share.findOne({
    fileId: document._id,
    sharedWithUserId: userId,
    shareType: 'people',
    permission: 'editor'
  });
  return !!share;
};

exports.uploadNewVersion = async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!req.file || !fileId) {
      return res.status(400).json({ success: false, message: 'File and fileId are required' });
    }

    const document = await Document.findById(fileId);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (!(await hasPermission(document, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    // Check storage
    const user = await User.findOneAndUpdate(
      { _id: req.user.id, $expr: { $lte: [{ $add: ['$storageUsed', size] }, '$storageLimit'] } },
      { $inc: { storageUsed: size } },
      { new: true }
    );
    if (!user) return res.status(400).json({ success: false, message: 'Storage limit exceeded.' });

    try {
      // Find latest version number
      const latestVersion = await Version.findOne({ fileId }).sort({ versionNumber: -1 });
      const nextVersionNum = latestVersion ? latestVersion.versionNumber + 1 : 2;

      // Save current state as previous version
      await Version.create({
        versionNumber: nextVersionNum - 1,
        fileId: document._id,
        ownerId: document.uploadedBy,
        s3Key: document.s3Key,
        s3Url: document.s3Url,
        size: document.size,
        mimeType: document.mimeType,
        uploadedAt: document.updatedAt || document.createdAt,
        uploadedBy: document.uploadedBy
      });

      // Upload new file to S3
      const s3Key = generateS3Key(req.user.id, originalname);
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype,
      }));

      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

      // Update document to new state
      document.s3Key = s3Key;
      document.s3Url = s3Url;
      document.size = size;
      document.mimeType = mimetype;
      document.fileType = getFileType(mimetype);
      document.originalName = originalname;
      document.name = path.parse(originalname).name;
      await document.save();

      await Notification.create({
        user: req.user.id,
        title: 'Version Upload Successful',
        message: `A new version of ${document.originalName} was uploaded.`,
        type: 'version_uploaded',
        icon: 'UploadCloud',
        referenceId: document._id,
        referenceType: 'Document'
      });

      res.status(200).json({ success: true, message: 'New version uploaded', document });

      
    } catch (uploadError) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { storageUsed: -size } });
      throw uploadError;
    }
  } catch (error) {
    console.error('Upload version error:', error);
    res.status(500).json({ success: false, message: 'Error uploading version' });
  }
};

exports.getVersions = async (req, res) => {
  try {
    const document = await Document.findById(req.params.fileId);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    // Check if user has view permission (Owner or any Share)
    if (document.uploadedBy.toString() !== req.user.id) {
      const share = await Share.findOne({ fileId: document._id, sharedWithUserId: req.user.id });
      if (!share) return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const versions = await Version.find({ fileId: document._id })
      .populate('uploadedBy', 'name email avatar')
      .sort({ versionNumber: -1 });

    res.status(200).json({ success: true, versions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching versions' });
  }
};

exports.downloadVersion = async (req, res) => {
  try {
    const version = await Version.findById(req.params.versionId);
    if (!version) return res.status(404).json({ success: false, message: 'Version not found' });

    const document = await Document.findById(version.fileId);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (document.uploadedBy.toString() !== req.user.id) {
      const share = await Share.findOne({ fileId: document._id, sharedWithUserId: req.user.id });
      if (!share) return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: version.s3Key,
      ResponseContentDisposition: `attachment; filename="${document.originalName}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.status(200).json({ success: true, downloadUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generating download link for version' });
  }
};

exports.restoreVersion = async (req, res) => {
  try {
    const { versionId } = req.body;
    const version = await Version.findById(versionId);
    if (!version) return res.status(404).json({ success: false, message: 'Version not found' });

    const document = await Document.findById(version.fileId);
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (!(await hasPermission(document, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    // Save current document state as a version
    const latestVersion = await Version.findOne({ fileId: document._id }).sort({ versionNumber: -1 });
    const currentVersionNum = latestVersion ? latestVersion.versionNumber + 1 : 2;

    await Version.create({
      versionNumber: currentVersionNum,
      fileId: document._id,
      ownerId: document.uploadedBy,
      s3Key: document.s3Key,
      s3Url: document.s3Url,
      size: document.size,
      mimeType: document.mimeType,
      uploadedAt: document.updatedAt || document.createdAt,
      uploadedBy: document.uploadedBy
    });

    // Update document with restored version details
    document.s3Key = version.s3Key;
    document.s3Url = version.s3Url;
    document.size = version.size;
    document.mimeType = version.mimeType;
    document.fileType = getFileType(version.mimeType);
    await document.save();

    // Remove the restored version record from history (optional, but requested: "Current Latest becomes previous version", meaning the restored version replaces the current, but what about the historical record? We should probably keep it in history or remove it. If we restore it, it becomes the new latest. We can delete it from the `Version` collection to avoid duplicates, OR just leave it. Leaving it makes a linear history harder to read. Let's delete the version document we just restored so it doesn't exist twice.)
    await Version.findByIdAndDelete(versionId);

    res.status(200).json({ success: true, message: 'Version restored', document });

    
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ success: false, message: 'Error restoring version' });
  }
};

exports.deleteVersion = async (req, res) => {
  try {
    const version = await Version.findById(req.params.versionId);
    if (!version) return res.status(404).json({ success: false, message: 'Version not found' });

    const document = await Document.findById(version.fileId);
    if (!document || !(await hasPermission(document, req.user.id))) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    // Delete from S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: version.s3Key,
    }));

    // Update user storage
    await User.findByIdAndUpdate(version.ownerId, { $inc: { storageUsed: -version.size } });

    // Delete from DB
    await Version.findByIdAndDelete(version._id);

    res.status(200).json({ success: true, message: 'Version deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting version' });
  }
};
