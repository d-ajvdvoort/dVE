const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the ReferenceData schema
const ReferenceDataSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['emissionFactor', 'activityCategory', 'emissionScope', 'standard', 'location', 'unit'],
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  value: {
    type: Number
  },
  unit: {
    type: String
  },
  source: {
    type: String
  },
  validFrom: {
    type: Date
  },
  validTo: {
    type: Date
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  parentCode: {
    type: String,
    index: true
  },
  standardId: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
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

// Create compound index for type and code
ReferenceDataSchema.index({ type: 1, code: 1 }, { unique: true });

// Create and export the ReferenceData model
const ReferenceData = mongoose.model('ReferenceData', ReferenceDataSchema);
module.exports = ReferenceData;
