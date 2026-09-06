const cron = require('node-cron');
const Document = require('../models/Document');
const User = require('../models/User');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('../config/s3');

const startCronJobs = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running 30-day trash auto-purge cron job...');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find all documents in trash older than 30 days
      const expiredDocuments = await Document.find({
        isDeleted: true,
        deletedAt: { $lte: thirtyDaysAgo },
      });

      if (expiredDocuments.length === 0) {
        console.log('No expired documents found in trash.');
        return;
      }

      console.log(`Found ${expiredDocuments.length} expired documents. Purging...`);

      for (const document of expiredDocuments) {
        try {
          // Delete from S3
          const deleteParams = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: document.s3Key,
          };
          
          await s3Client.send(new DeleteObjectCommand(deleteParams));

          // Update user storage quota
          await User.findByIdAndUpdate(document.uploadedBy, {
            $inc: { storageUsed: -document.size },
          });

          // Delete from MongoDB
          await Document.findByIdAndDelete(document._id);
          
          console.log(`Successfully purged document: ${document._id}`);
        } catch (docError) {
          console.error(`Failed to purge document ${document._id}:`, docError);
          // Continue with the next document even if one fails
        }
      }

      console.log('Trash auto-purge completed successfully.');
    } catch (error) {
      console.error('Error running trash auto-purge cron job:', error);
    }
  });
};

module.exports = startCronJobs;
