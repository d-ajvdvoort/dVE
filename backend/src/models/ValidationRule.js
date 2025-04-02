const mongoose = require('mongoose');

// Schema for validation rules
const validationRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'DataType',
      'Completeness',
      'FieldLength',
      'AllowedValue',
      'Format',
      'Timestamp',
      'Uniqueness',
      'ReferentialIntegrity',
      'Custom'
    ]
  },
  description: String,
  targetSchema: {
    type: String,
    required: true
  },
  targetFields: [String],
  configuration: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  validationFunction: String, // For custom validation rules
  active: {
    type: Boolean,
    default: true
  },
  severity: {
    type: String,
    enum: ['Error', 'Warning', 'Info'],
    default: 'Error'
  },
  createdBy: String
}, {
  timestamps: true
});

const ValidationRule = mongoose.model('ValidationRule', validationRuleSchema);

module.exports = ValidationRule;
