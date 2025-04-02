const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the ValidationRule schema
const ValidationRuleSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  ruleType: {
    type: String,
    enum: ['dataType', 'range', 'required', 'uniqueness', 'pattern', 'reference', 'custom'],
    required: true
  },
  targetField: {
    type: String,
    required: true
  },
  parameters: {
    type: Map,
    of: Schema.Types.Mixed
  },
  severity: {
    type: String,
    enum: ['error', 'warning', 'info'],
    default: 'error'
  },
  message: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  schemaId: {
    type: String,
    required: true,
    enum: ['EmissionData', 'ActivityData', 'ReferenceData']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Create and export the ValidationRule model
const ValidationRule = mongoose.model('ValidationRule', ValidationRuleSchema);
module.exports = ValidationRule;
