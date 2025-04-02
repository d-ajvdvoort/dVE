const mongoose = require('mongoose');

const fileMetadataSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'mapped', 'validated', 'verified', 'error'],
    default: 'uploaded'
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending'
  },
  // Compliance and access controls
  contractId: String,
  expirationDate: Date,
  originator: String,
  dataType: {
    type: String,
    enum: ['Public Domain Data', 'First Party Data', 'Second Party Data'],
    default: 'First Party Data'
  },
  securityClassification: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Private'
  },
  personalData: {
    type: String,
    enum: ['No Personal Data', 'Personally Identifiable'],
    default: 'No Personal Data'
  },
  exportClassification: {
    type: String,
    enum: ['Not-Technical Data', 'No License Required'],
    default: 'Not-Technical Data'
  },
  // Ancestry and validation lineage
  ancestors: [{
    type: String,
    ref: 'FileMetadata'
  }],
  // Dataset properties
  datasetProperties: {
    fileSource: String,
    sourceLocation: String,
    extractedLocation: String,
    mappedLocation: String
  },
  // Validation results
  validationResults: {
    isValid: Boolean,
    errors: [String],
    warnings: [String],
    timestamp: Date
  }
}, {
  timestamps: true
});

const FileMetadata = mongoose.model('FileMetadata', fileMetadataSchema);

module.exports = FileMetadata;
