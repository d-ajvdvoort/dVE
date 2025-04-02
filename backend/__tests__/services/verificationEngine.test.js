const verificationEngine = require('../../services/verificationEngine');
const blockchainService = require('../../../blockchain/services/blockchainService');
const { FileMetadata, Mapping, ValidationRule, VerificationRecord } = require('../../models');
const mongoose = require('mongoose');

// Mock blockchain service
jest.mock('../../../blockchain/services/blockchainService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  createVerificationRecord: jest.fn().mockResolvedValue({
    success: true,
    record: { recordId: 'rec_test_12345' },
    transaction: { txId: 'tx_test_12345' }
  }),
  verifyRecord: jest.fn().mockResolvedValue({
    isValid: true,
    isAuthentic: true
  })
}));

describe('Verification Engine Service Tests', () => {
  const userId = new mongoose.Types.ObjectId();
  let fileMetadata;
  let mapping;

  beforeEach(async () => {
    // Create test file metadata
    fileMetadata = new FileMetadata({
      originalName: 'test_file.csv',
      fileName: 'file_test_12345.csv',
      fileId: 'file_test_12345',
      mimeType: 'text/csv',
      size: 1024,
      path: '/tmp/test_file.csv',
      uploadedBy: userId,
      status: 'mapped',
      checksum: 'sha256_abcdef1234567890',
      metadata: {
        contractId: 'contract_123',
        originator: 'Test Company',
        dataType: 'First Party Data',
        securityClassification: 'Private'
      }
    });
    await fileMetadata.save();

    // Create test mapping
    mapping = new Mapping({
      fileId: fileMetadata._id,
      schemaId: 'EmissionData',
      columnMappings: new Map([
        ['emissionId', 'id'],
        ['emissionType', 'type'],
        ['emissionValue', 'value']
      ]),
      assignedReferences: new Map([
        ['emissionType', 'GHG']
      ]),
      createdBy: userId,
      status: 'applied'
    });
    await mapping.save();

    // Update file metadata with mapping ID
    fileMetadata.mappingId = mapping._id;
    await fileMetadata.save();

    // Create test validation rules
    const rules = [
      {
        name: 'Emission ID Required',
        description: 'Emission ID is required',
        ruleType: 'required',
        targetField: 'emissionId',
        severity: 'error',
        message: 'Emission ID is required',
        active: true,
        schemaId: 'EmissionData',
        createdBy: userId
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
        createdBy: userId
      }
    ];

    for (const rule of rules) {
      const validationRule = new ValidationRule(rule);
      await validationRule.save();
    }

    // Initialize verification engine
    await verificationEngine.initialize();
  });

  afterEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
  });

  test('should initialize verification engine successfully', async () => {
    // Re-initialize to test
    const result = await verificationEngine.initialize();
    
    expect(result).toBe(true);
    expect(blockchainService.initialize).toHaveBeenCalled();
  });

  test('should verify a file successfully', async () => {
    const verificationResult = await verificationEngine.verifyFile(fileMetadata.fileId, {
      createBlockchainRecord: true,
      emissionInventoryType: 'GHG',
      emissionCategory: 'Scope 1',
      emissionScope: 'Direct',
      activityCategories: ['Energy'],
      standards: ['ISO-14061'],
      createdBy: 'system'
    });
    
    expect(verificationResult.success).toBe(true);
    expect(verificationResult.fileId).toBe(fileMetadata.fileId);
    expect(verificationResult.validationResults).toBeDefined();
    expect(verificationResult.validationResults.isValid).toBeDefined();
    
    // Check if blockchain service was called
    expect(blockchainService.createVerificationRecord).toHaveBeenCalled();
    
    // Check if file metadata was updated
    const updatedFile = await FileMetadata.findById(fileMetadata._id);
    expect(updatedFile.status).toBe('verified');
    expect(updatedFile.verificationRecordId).toBeDefined();
    expect(updatedFile.blockchainTxId).toBeDefined();
  });

  test('should get verification record successfully', async () => {
    // First create a verification record
    const verificationResult = await verificationEngine.verifyFile(fileMetadata.fileId, {
      createBlockchainRecord: true,
      createdBy: 'system'
    });
    
    // Get the verification record
    const recordResult = await verificationEngine.getVerificationRecord(
      verificationResult.verificationRecord.recordId,
      { verifyOnBlockchain: true }
    );
    
    expect(recordResult.verificationRecord).toBeDefined();
    expect(recordResult.blockchainVerification).toBeDefined();
    expect(recordResult.blockchainVerification.isValid).toBe(true);
    
    // Check if blockchain service was called
    expect(blockchainService.verifyRecord).toHaveBeenCalledWith(
      verificationResult.verificationRecord.recordId
    );
  });

  test('should throw error when verifying non-existent file', async () => {
    await expect(
      verificationEngine.verifyFile('non_existent_file_id')
    ).rejects.toThrow('File with ID non_existent_file_id not found');
  });

  test('should throw error when verifying file with wrong status', async () => {
    // Update file status to something other than 'mapped'
    await FileMetadata.findByIdAndUpdate(
      fileMetadata._id,
      { status: 'uploaded' }
    );
    
    await expect(
      verificationEngine.verifyFile(fileMetadata.fileId)
    ).rejects.toThrow('File must be in \'mapped\' status to verify');
  });

  test('should throw error when getting non-existent verification record', async () => {
    await expect(
      verificationEngine.getVerificationRecord('non_existent_record_id')
    ).rejects.toThrow('Verification record with ID non_existent_record_id not found');
  });
});
