const mongoose = require('mongoose');

// Schema for reference data
const referenceDataSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'EmissionInventoryType',
      'EmissionCategoryType',
      'EmissionScopeType',
      'EmissionActivityCategory',
      'EmissionActivityType'
    ]
  },
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  standard: {
    type: String,
    enum: [
      'ISO-14061',
      'GHG-Protocol',
      'API-Compendium',
      'LCFS',
      'Technology',
      'Ecosystems'
    ]
  },
  parentCode: String,
  metadata: {
    type: Map,
    of: String
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for type and code
referenceDataSchema.index({ type: 1, code: 1 }, { unique: true });

const ReferenceData = mongoose.model('ReferenceData', referenceDataSchema);

module.exports = ReferenceData;
