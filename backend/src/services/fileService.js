/**
 * File Service
 * Provides file handling functionality for the dVeracity Verification Engine
 */
const { FileMetadata } = require('../models');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const multer = require('multer');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), config.uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const fileId = 'file_' + crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = fileId + extension;
    
    cb(null, filename);
  }
});

// Configure multer upload
const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    // In a real implementation, this would filter by allowed types
    cb(null, true);
  }
});

class FileService {
  /**
   * Get multer upload middleware
   * @returns {Function} - Multer middleware
   */
  getUploadMiddleware() {
    return upload.single('file');
  }

  /**
   * Save file metadata
   * @param {Object} file - Uploaded file
   * @param {Object} metadata - Additional metadata
   * @param {string} userId - ID of the user who uploaded the file
   * @returns {Promise<Object>} - Saved file metadata
   */
  async saveFileMetadata(file, metadata, userId) {
    try {
      // Calculate file checksum
      const checksum = await this._calculateChecksum(file.path);
      
      // Create file ID
      const fileId = path.basename(file.filename, path.extname(file.filename));
      
      // Create file metadata
      const fileMetadata = new FileMetadata({
        originalName: file.originalname,
        fileName: file.filename,
        fileId,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedBy: userId,
        checksum,
        metadata: metadata || {}
      });
      
      await fileMetadata.save();
      
      return fileMetadata;
    } catch (error) {
      console.error('Failed to save file metadata:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param {string} fileId - ID of the file
   * @returns {Promise<Object>} - File metadata
   */
  async getFileMetadata(fileId) {
    try {
      const fileMetadata = await FileMetadata.findOne({ fileId });
      
      if (!fileMetadata) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      return fileMetadata;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  /**
   * Get file by ID
   * @param {string} fileId - ID of the file
   * @returns {Promise<Object>} - File stream and metadata
   */
  async getFile(fileId) {
    try {
      const fileMetadata = await this.getFileMetadata(fileId);
      
      // Check if file exists
      if (!fs.existsSync(fileMetadata.path)) {
        throw new Error(`File not found at path: ${fileMetadata.path}`);
      }
      
      // Create file stream
      const fileStream = fs.createReadStream(fileMetadata.path);
      
      return {
        fileStream,
        metadata: fileMetadata
      };
    } catch (error) {
      console.error('Failed to get file:', error);
      throw error;
    }
  }

  /**
   * Delete file
   * @param {string} fileId - ID of the file to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteFile(fileId) {
    try {
      const fileMetadata = await this.getFileMetadata(fileId);
      
      // Delete file from filesystem
      if (fs.existsSync(fileMetadata.path)) {
        fs.unlinkSync(fileMetadata.path);
      }
      
      // Delete file metadata from database
      await FileMetadata.findByIdAndDelete(fileMetadata._id);
      
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * List files
   * @param {Object} query - Query parameters
   * @returns {Promise<Array>} - List of files
   */
  async listFiles(query = {}) {
    try {
      const { userId, status, page = 1, limit = 10 } = query;
      
      // Build query
      const dbQuery = {};
      
      if (userId) {
        dbQuery.uploadedBy = userId;
      }
      
      if (status) {
        dbQuery.status = status;
      }
      
      // Execute query with pagination
      const files = await FileMetadata.find(dbQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      
      const total = await FileMetadata.countDocuments(dbQuery);
      
      return {
        files,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  /**
   * Calculate file checksum
   * @private
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - File checksum
   */
  async _calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => {
        hash.update(data);
      });
      
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      
      stream.on('error', error => {
        reject(error);
      });
    });
  }
}

module.exports = new FileService();
