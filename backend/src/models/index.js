// Database models index file
// Export all models from a single file for easier imports

const User = require('./User');
const FileMetadata = require('./FileMetadata');
const Mapping = require('./Mapping');
const ValidationRule = require('./ValidationRule');
const ReferenceData = require('./ReferenceData');
const VerificationRecord = require('./VerificationRecord');

module.exports = {
  User,
  FileMetadata,
  Mapping,
  ValidationRule,
  ReferenceData,
  VerificationRecord
};
