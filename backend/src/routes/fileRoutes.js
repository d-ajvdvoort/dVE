const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');

// File upload route
router.post('/upload', authMiddleware.protect, fileController.uploadFile);

// Get file metadata by ID
router.get('/:fileId', authMiddleware.protect, fileController.getFileMetadata);

// Get all files metadata (with pagination)
router.get('/', authMiddleware.protect, fileController.getAllFilesMetadata);

// Download a file
router.get('/download/:fileId', authMiddleware.protect, fileController.downloadFile);

// Delete a file
router.delete('/:fileId', authMiddleware.protect, fileController.deleteFile);

module.exports = router;
