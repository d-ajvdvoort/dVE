const FileMetadata = require('../models/FileMetadata');
const { upload, generateFileMetadata } = require('../utils/fileUpload');

// Upload a new file
const uploadFile = async (req, res) => {
  try {
    // Multer middleware handles the file upload
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ 
          success: false, 
          message: err.message 
        });
      }

      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      // Generate file metadata
      const userId = req.user ? req.user.id : 'anonymous';
      const metadata = generateFileMetadata(req.file, userId);
      
      // Add additional metadata from request body
      if (req.body.contractId) metadata.contractId = req.body.contractId;
      if (req.body.originator) metadata.originator = req.body.originator;
      if (req.body.dataType) metadata.dataType = req.body.dataType;
      if (req.body.securityClassification) metadata.securityClassification = req.body.securityClassification;
      if (req.body.personalData) metadata.personalData = req.body.personalData;
      if (req.body.exportClassification) metadata.exportClassification = req.body.exportClassification;
      
      // Save metadata to database
      const fileMetadata = new FileMetadata(metadata);
      await fileMetadata.save();

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          fileId: fileMetadata.fileId,
          originalName: fileMetadata.originalName,
          uploadDate: fileMetadata.uploadDate,
          status: fileMetadata.status
        }
      });
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during file upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get file metadata by ID
const getFileMetadata = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileMetadata = await FileMetadata.findOne({ fileId });
    
    if (!fileMetadata) {
      return res.status(404).json({
        success: false,
        message: 'File metadata not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: fileMetadata
    });
  } catch (error) {
    console.error('Error retrieving file metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving file metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all files metadata (with pagination)
const getAllFilesMetadata = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const files = await FileMetadata.find()
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await FileMetadata.countDocuments();
    
    res.status(200).json({
      success: true,
      count: files.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: files
    });
  } catch (error) {
    console.error('Error retrieving files metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving files metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Download a file
const downloadFile = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileMetadata = await FileMetadata.findOne({ fileId });
    
    if (!fileMetadata) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.download(fileMetadata.filePath, fileMetadata.originalName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        return res.status(500).json({
          success: false,
          message: 'Error downloading file',
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error downloading file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a file
const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const fileMetadata = await FileMetadata.findOne({ fileId });
    
    if (!fileMetadata) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete file from filesystem
    fs.unlink(fileMetadata.filePath, async (err) => {
      if (err) {
        console.error('Error deleting file from filesystem:', err);
      }
      
      // Delete metadata from database
      await FileMetadata.deleteOne({ fileId });
      
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  uploadFile,
  getFileMetadata,
  getAllFilesMetadata,
  downloadFile,
  deleteFile
};
