const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    fileType: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
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
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
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

// Text index for search functionality
documentSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Index for faster queries
documentSchema.index({ uploadedBy: 1, isDeleted: 1 });
documentSchema.index({ uploadedBy: 1, folderId: 1 });

module.exports = mongoose.model('Document', documentSchema);
