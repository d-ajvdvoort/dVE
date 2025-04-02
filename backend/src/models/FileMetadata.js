const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the FileMetadata schema
const FileMetadataSchema = new Schema({
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  fileId: {
    type: String,
    required: true,
    unique: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'mapped', 'validated', 'verified', 'error'],
    default: 'uploaded'
  },
  checksum: {
    type: String
  },
  metadata: {
    contractId: {
      type: String
    },
    originator: {
      type: String
    },
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
    }
  },
  mappingId: {
    type: Schema.Types.ObjectId,
    ref: 'Mapping'
  },
  validationResults: {
    isValid: {
      type: Boolean
    },
    timestamp: {
      type: Date
    },
    errors: [{
      type: String
    }],
    warnings: [{
      type: String
    }]
  },
  verificationRecordId: {
    type: String
  },
  blockchainTxId: {
    type: String
  }
}, {
  timestamps: true
});

// Create and export the FileMetadata model
const FileMetadata = mongoose.model('FileMetadata', FileMetadataSchema);
module.exports = FileMetadata;
