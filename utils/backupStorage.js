// utils/backupStorage.js
// ======================================================================
// Backup Storage Utility - AutoParts Pro
// ----------------------------------------------------------------------
// Handles uploading, downloading, and deleting backup files
// from cloud storage (Google Drive / AWS S3) or local disk.
// Works with backupController.js for scheduled + manual backups.
// ======================================================================

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const { google } = require('googleapis');
const logger = require('../config/logger');

// ======================================================================
// 🔹 1. AWS S3 SETUP
// ======================================================================
const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION || 'ap-south-1',
});

// ======================================================================
// 🔹 2. GOOGLE DRIVE SETUP
// ======================================================================
const oauth2Client = new google.auth.OAuth2(
  process.env.GDRIVE_CLIENT_ID,
  process.env.GDRIVE_CLIENT_SECRET,
  process.env.GDRIVE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GDRIVE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ======================================================================
// 🧠  Helper: Check file exists
// ======================================================================
const fileExists = async (filePath) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

// ======================================================================
// 💾 Upload Backup to AWS S3
// ======================================================================
exports.uploadToS3 = async (filePath, backupName = 'backup.zip') => {
  try {
    if (!(await fileExists(filePath))) throw new Error('File not found');

    const fileContent = fs.readFileSync(filePath);
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `autoparts-backups/${backupName}`,
      Body: fileContent,
      ContentType: 'application/zip',
    };

    const data = await s3.upload(params).promise();
    logger.info(`✅ Backup uploaded to S3: ${data.Location}`);

    return {
      success: true,
      provider: 'S3',
      fileUrl: data.Location,
      fileKey: params.Key,
    };
  } catch (err) {
    logger.error(`❌ S3 Upload failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ======================================================================
// ☁️ Upload Backup to Google Drive
// ======================================================================
exports.uploadToDrive = async (filePath, backupName = 'backup.zip') => {
  try {
    if (!(await fileExists(filePath))) throw new Error('File not found');

    const fileMetadata = {
      name: backupName,
      parents: [process.env.GDRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(filePath),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: 'id, webViewLink, webContentLink',
    });

    const { id, webViewLink, webContentLink } = response.data;
    logger.info(`✅ Backup uploaded to Google Drive: ${webViewLink}`);

    return {
      success: true,
      provider: 'GoogleDrive',
      fileId: id,
      fileUrl: webViewLink || webContentLink,
    };
  } catch (err) {
    logger.error(`❌ Google Drive upload failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ======================================================================
// 🧹 Delete Backup (S3 or Drive)
// ======================================================================
exports.deleteBackup = async ({ provider, fileKey, fileId }) => {
  try {
    if (provider === 'S3' && fileKey) {
      await s3.deleteObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileKey,
      }).promise();
      logger.info(`🗑️ Deleted S3 backup: ${fileKey}`);
      return { success: true };
    }

    if (provider === 'GoogleDrive' && fileId) {
      await drive.files.delete({ fileId });
      logger.info(`🗑️ Deleted Google Drive backup: ${fileId}`);
      return { success: true };
    }

    throw new Error('Invalid provider or file reference');
  } catch (err) {
    logger.error(`❌ Delete backup failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};

// ======================================================================
// 🏠 Local Backup (Fallback)
// ======================================================================
exports.saveLocalBackup = async (data, folder = 'local_backups') => {
  try {
    const dir = path.join(__dirname, '..', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(dir, `backup-${timestamp}.json`);

    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    logger.info(`💾 Local backup saved: ${filePath}`);

    return { success: true, filePath };
  } catch (err) {
    logger.error(`❌ Local backup failed: ${err.message}`);
    return { success: false, error: err.message };
  }
};
