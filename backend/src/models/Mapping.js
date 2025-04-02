const mongoose = require('mongoose');

// Schema for mapping configuration
const mappingSchema = new mongoose.Schema({
  schemaId: {
    type: String,
    required: true
  },
  columnMappings: {
    type: Map,
    of: String,
    required: true
  },
  assignedReferences: {
    type: Map,
    of: String
  },
  inferReferences: {
    type: Map,
    of: String
  },
  skipValidation: {
    type: Boolean,
    default: false
  },
  // Schema properties extracted from target schema
  schemaProperties: {
    type: Map,
    of: String
  },
  requiredProperties: [String],
  foreignKeys: [{
    field: String,
    references: {
      model: String,
      field: String
    }
  }],
  // Metadata
  createdBy: String,
  fileId: {
    type: String,
    ref: 'FileMetadata',
    required: true
  }
}, {
  timestamps: true
});

const Mapping = mongoose.model('Mapping', mappingSchema);

module.exports = Mapping;
