const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedWithUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    permission: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer',
    },
    shareType: {
      type: String,
      enum: ['people', 'link'],
      default: 'people',
    },
    linkToken: {
      type: String,
      default: null,
      sparse: true,
    },
    linkEnabled: {
      type: Boolean,
      default: false,
    },
    generalAccess: {
      type: String,
      enum: ['restricted', 'anyone'],
      default: 'restricted',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessed: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate people shares for the same item and user
shareSchema.index({ sharedWithUserId: 1, fileId: 1, folderId: 1 }, { unique: true, partialFilterExpression: { shareType: 'people' } });

// Prevent multiple link share records for the same item
shareSchema.index({ fileId: 1, folderId: 1 }, { unique: true, partialFilterExpression: { shareType: 'link' } });

// Lookup by token
shareSchema.index({ linkToken: 1 }, { sparse: true });

module.exports = mongoose.model('Share', shareSchema);
