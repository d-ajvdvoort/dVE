const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${fileId}${extension}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept common data file formats
  const allowedTypes = [
    'text/csv', 
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'application/octet-stream',
    'application/parquet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV, Excel, JSON, and Parquet files are allowed.'), false);
  }
};

// Configure upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // Default 10MB
  }
});

// File metadata generator
const generateFileMetadata = (file, userId) => {
  return {
    fileId: path.parse(file.filename).name,
    originalName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadDate: new Date().toISOString(),
    uploadedBy: userId,
    filePath: file.path,
    status: 'uploaded',
    processingStatus: 'pending'
  };
};

module.exports = {
  upload,
  generateFileMetadata
};
