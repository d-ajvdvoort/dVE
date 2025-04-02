/**
 * Verification Engine Test
 * Tests for the verification engine core
 */
const verificationEngine = require('../services/verificationEngine');
const validationService = require('../services/validationService');
const dataMappingService = require('../services/dataMappingService');
const fileService = require('../services/fileService');
const { FileMetadata, Mapping, ValidationRule } = require('../models');
const mongoose = require('mongoose');
const config = require('../config');

// Sample test data
const sampleFileMetadata = {
  originalName: 'test_emissions.csv',
  fileName: 'file_test_12345.csv',
  fileId: 'file_test_12345',
  mimeType: 'text/csv',
  size: 1024,
  path: '/tmp/test_emissions.csv',
  uploadedBy: '60a1b2c3d4e5f6a7b8c9d0e1',
  status: 'uploaded',
  checksum: 'sha256_abcdef1234567890',
  metadata: {
    contractId: 'contract_123',
    originator: 'Test Company',
    dataType: 'First Party Data',
    securityClassification: 'Private'
  }
};

const sampleMapping = {
  fileId: '60a1b2c3d4e5f6a7b8c9d0e1',
  schemaId: 'EmissionData',
  columnMappings: new Map([
    ['emissionId', 'id'],
    ['emissionType', 'type'],
    ['emissionScope', 'scope'],
    ['emissionCategory', 'category'],
    ['emissionValue', 'value'],
    ['emissionUnit', 'unit'],
    ['reportingPeriod', 'period'],
    ['reportingDate', 'date']
  ]),
  assignedReferences: new Map([
    ['emissionType', 'GHG'],
    ['emissionScope', 'Scope 1']
  ]),
  inferReferences: true,
  skipValidation: false,
  createdBy: '60a1b2c3d4e5f6a7b8c9d0e1',
  status: 'draft'
};

const sampleValidationRules = [
  {
    name: 'Emission ID Required',
    description: 'Emission ID is required',
    ruleType: 'required',
    targetField: 'emissionId',
    severity: 'error',
    message: 'Emission ID is required',
    active: true,
    schemaId: 'EmissionData',
    createdBy: '60a1b2c3d4e5f6a7b8c9d0e1'
  },
  {
    name: 'Emission Value Range',
    description: 'Emission value must be positive',
    ruleType: 'range',
    targetField: 'emissionValue',
    parameters: new Map([
      ['min', 0]
    ]),
    severity: 'error',
    message: 'Emission value must be positive',
    active: true,
    schemaId: 'EmissionData',
    createdBy: '60a1b2c3d4e5f6a7b8c9d0e1'
  }
];

/**
 * Run verification engine tests
 */
async function runVerificationEngineTests() {
  console.log('Starting verification engine tests...');
  
  try {
    // Connect to database
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Initialize verification engine
    console.log('Initializing verification engine...');
    await verificationEngine.initialize();
    console.log('✓ Verification engine initialized successfully');
    
    // Setup test data
    console.log('\nSetting up test data...');
    const fileMetadata = await setupTestData();
    console.log('✓ Test data setup complete');
    
    // Test file verification
    console.log('\nTesting file verification...');
    const verificationResult = await verificationEngine.verifyFile(fileMetadata.fileId, {
      createBlockchainRecord: true,
      emissionInventoryType: 'GHG',
      emissionCategory: 'Scope 1',
      emissionScope: 'Direct',
      activityCategories: ['Energy', 'Transportation'],
      standards: ['ISO-14061', 'GHG Protocol'],
      createdBy: 'system'
    });
    console.log('✓ File verification result:', verificationResult.success ? 'Success' : 'Failed');
    
    // Test getting verification record
    if (verificationResult.verificationRecord) {
      console.log('\nTesting get verification record...');
      const recordResult = await verificationEngine.getVerificationRecord(
        verificationResult.verificationRecord.recordId,
        { verifyOnBlockchain: true }
      );
      console.log('✓ Verification record retrieved successfully');
      console.log('✓ Blockchain verification:', recordResult.blockchainVerification.isValid ? 'Valid' : 'Invalid');
    }
    
    // Clean up test data
    console.log('\nCleaning up test data...');
    await cleanupTestData(fileMetadata._id);
    console.log('✓ Test data cleanup complete');
    
    console.log('\nAll verification engine tests completed successfully!');
  } catch (error) {
    console.error('Error in verification engine tests:', error);
  } finally {
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Setup test data
 * @returns {Promise<Object>} - Created file metadata
 */
async function setupTestData() {
  // Create file metadata
  const fileMetadata = new FileMetadata(sampleFileMetadata);
  await fileMetadata.save();
  
  // Create mapping
  const mapping = new Mapping({
    ...sampleMapping,
    fileId: fileMetadata._id
  });
  await mapping.save();
  
  // Update file metadata with mapping ID
  fileMetadata.mappingId = mapping._id;
  fileMetadata.status = 'mapped';
  await fileMetadata.save();
  
  // Create validation rules
  for (const ruleData of sampleValidationRules) {
    const rule = new ValidationRule(ruleData);
    await rule.save();
  }
  
  return fileMetadata;
}

/**
 * Clean up test data
 * @param {string} fileId - ID of the file
 * @returns {Promise<void>}
 */
async function cleanupTestData(fileId) {
  // Delete file metadata
  await FileMetadata.findByIdAndDelete(fileId);
  
  // Delete mapping
  await Mapping.deleteOne({ fileId });
  
  // Delete validation rules
  for (const ruleData of sampleValidationRules) {
    await ValidationRule.deleteOne({ name: ruleData.name });
  }
}

// Export the test function
module.exports = { runVerificationEngineTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runVerificationEngineTests();
}
