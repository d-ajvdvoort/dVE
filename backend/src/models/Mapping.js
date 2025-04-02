const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the Mapping schema
const MappingSchema = new Schema({
  fileId: {
    type: Schema.Types.ObjectId,
    ref: 'FileMetadata',
    required: true
  },
  schemaId: {
    type: String,
    required: true,
    enum: ['EmissionData', 'ActivityData', 'ReferenceData']
  },
  columnMappings: {
    type: Map,
    of: String
  },
  assignedReferences: {
    type: Map,
    of: String
  },
  inferReferences: {
    type: Boolean,
    default: true
  },
  skipValidation: {
    type: Boolean,
    default: false
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
  },
  status: {
    type: String,
    enum: ['draft', 'applied', 'error'],
    default: 'draft'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Create and export the Mapping model
const Mapping = mongoose.model('Mapping', MappingSchema);
module.exports = Mapping;
