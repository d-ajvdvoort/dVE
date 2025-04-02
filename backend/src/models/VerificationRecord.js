const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the VerificationRecord schema
const VerificationRecordSchema = new Schema({
  recordId: {
    type: String,
    required: true,
    unique: true
  },
  fileId: {
    type: Schema.Types.ObjectId,
    ref: 'FileMetadata',
    required: true
  },
  version: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  validationStatus: {
    type: String,
    enum: ['Valid', 'Invalid', 'Pending'],
    required: true
  },
  ancestry: [{
    type: String
  }],
  fileChecksum: {
    type: String,
    required: true
  },
  complianceData: {
    contractId: {
      type: String
    },
    expirationDate: {
      type: Date
    },
    securityClassification: {
      type: String,
      default: 'Private'
    },
    accessControlList: [{
      type: String
    }]
  },
  validationResults: {
    isValid: {
      type: Boolean,
      required: true
    },
    ruleOutcomes: [{
      ruleId: {
        type: String
      },
      result: {
        type: String,
        enum: ['Pass', 'Fail', 'Warning', 'NotApplicable']
      },
      message: {
        type: String
      }
    }],
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected', 'InProgress'],
      default: 'Pending'
    },
    mappingConfirmations: [{
      sourceField: {
        type: String
      },
      targetField: {
        type: String
      },
      status: {
        type: String,
        enum: ['Confirmed', 'Rejected', 'Unknown']
      }
    }]
  },
  referenceMatches: {
    emissionInventoryType: {
      type: String
    },
    emissionCategory: {
      type: String
    },
    emissionScope: {
      type: String
    },
    activityCategories: [{
      type: String
    }],
    standards: [{
      type: String
    }]
  },
  createdBy: {
    type: String,
    required: true
  },
  signature: {
    type: String
  },
  blockchainTxId: {
    type: String
  },
  blockchainStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Failed'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create and export the VerificationRecord model
const VerificationRecord = mongoose.model('VerificationRecord', VerificationRecordSchema);
module.exports = VerificationRecord;
