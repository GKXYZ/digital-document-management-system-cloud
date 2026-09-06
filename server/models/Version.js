const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    s3Url: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch versions of a document
versionSchema.index({ fileId: 1, versionNumber: -1 });

module.exports = mongoose.model('Version', versionSchema);
