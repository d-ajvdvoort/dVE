const mongoose = require('mongoose');
const { VerificationRecord } = require('../../models');

describe('VerificationRecord Model Tests', () => {
  let recordId;
  const fileId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    // Create a test verification record before each test
    const recordData = {
      recordId: 'rec_12345',
      fileId: fileId,
      version: '1.0',
      timestamp: new Date(),
      validationStatus: 'Valid',
      ancestry: ['file_parent_1'],
      fileChecksum: 'sha256_abcdef1234567890',
      complianceData: {
        contractId: 'contract_123',
        expirationDate: new Date(Date.now() + 31536000000), // 1 year from now
        securityClassification: 'Private',
        accessControlList: ['user_1', 'user_2']
      },
      validationResults: {
        isValid: true,
        ruleOutcomes: [
          { ruleId: 'rule_1', result: 'Pass', message: 'Data type validation passed' },
          { ruleId: 'rule_2', result: 'Pass', message: 'Completeness check passed' }
        ],
        verificationStatus: 'Verified',
        mappingConfirmations: [
          { sourceField: 'field_1', targetField: 'standard_field_1', status: 'Confirmed' }
        ]
      },
      referenceMatches: {
        emissionInventoryType: 'GHG',
        emissionCategory: 'Scope 1',
        emissionScope: 'Direct',
        activityCategories: ['Energy', 'Transportation'],
        standards: ['ISO-14061', 'GHG Protocol']
      },
      createdBy: 'system',
      signature: 'sig_12345',
      blockchainTxId: 'tx_12345',
      blockchainStatus: 'Confirmed'
    };

    const record = new VerificationRecord(recordData);
    await record.save();
    recordId = record._id;
  });

  test('should create a new verification record successfully', async () => {
    const newRecordData = {
      recordId: 'rec_67890',
      fileId: fileId,
      version: '1.0',
      timestamp: new Date(),
      validationStatus: 'Valid',
      ancestry: ['file_parent_2'],
      fileChecksum: 'sha256_67890abcdef',
      complianceData: {
        contractId: 'contract_456',
        expirationDate: new Date(Date.now() + 31536000000),
        securityClassification: 'Private',
        accessControlList: ['user_3', 'user_4']
      },
      validationResults: {
        isValid: true,
        ruleOutcomes: [
          { ruleId: 'rule_3', result: 'Pass', message: 'Data type validation passed' }
        ],
        verificationStatus: 'Verified',
        mappingConfirmations: [
          { sourceField: 'field_2', targetField: 'standard_field_2', status: 'Confirmed' }
        ]
      },
      referenceMatches: {
        emissionInventoryType: 'GHG',
        emissionCategory: 'Scope 2',
        emissionScope: 'Indirect',
        activityCategories: ['Electricity'],
        standards: ['GHG Protocol']
      },
      createdBy: 'system',
      signature: 'sig_67890',
      blockchainTxId: 'tx_67890',
      blockchainStatus: 'Confirmed'
    };

    const newRecord = new VerificationRecord(newRecordData);
    const savedRecord = await newRecord.save();
    
    expect(savedRecord._id).toBeDefined();
    expect(savedRecord.recordId).toBe(newRecordData.recordId);
    expect(savedRecord.fileId.toString()).toBe(fileId.toString());
    expect(savedRecord.version).toBe(newRecordData.version);
    expect(savedRecord.validationStatus).toBe(newRecordData.validationStatus);
    expect(savedRecord.fileChecksum).toBe(newRecordData.fileChecksum);
    expect(savedRecord.complianceData.contractId).toBe(newRecordData.complianceData.contractId);
    expect(savedRecord.validationResults.isValid).toBe(newRecordData.validationResults.isValid);
    expect(savedRecord.referenceMatches.emissionCategory).toBe(newRecordData.referenceMatches.emissionCategory);
    expect(savedRecord.createdBy).toBe(newRecordData.createdBy);
    expect(savedRecord.signature).toBe(newRecordData.signature);
    expect(savedRecord.blockchainTxId).toBe(newRecordData.blockchainTxId);
    expect(savedRecord.blockchainStatus).toBe(newRecordData.blockchainStatus);
    expect(savedRecord.createdAt).toBeDefined();
    expect(savedRecord.updatedAt).toBeDefined();
  });

  test('should retrieve a verification record by id', async () => {
    const foundRecord = await VerificationRecord.findById(recordId);
    
    expect(foundRecord).toBeDefined();
    expect(foundRecord.recordId).toBe('rec_12345');
    expect(foundRecord.validationStatus).toBe('Valid');
  });

  test('should retrieve a verification record by recordId', async () => {
    const foundRecord = await VerificationRecord.findOne({ recordId: 'rec_12345' });
    
    expect(foundRecord).toBeDefined();
    expect(foundRecord._id.toString()).toBe(recordId.toString());
    expect(foundRecord.validationStatus).toBe('Valid');
  });

  test('should update a verification record successfully', async () => {
    const updatedData = {
      blockchainStatus: 'Pending',
      validationResults: {
        isValid: true,
        ruleOutcomes: [
          { ruleId: 'rule_1', result: 'Pass', message: 'Data type validation passed' },
          { ruleId: 'rule_2', result: 'Pass', message: 'Completeness check passed' },
          { ruleId: 'rule_3', result: 'Warning', message: 'Minor issue detected' }
        ],
        verificationStatus: 'Verified',
        mappingConfirmations: [
          { sourceField: 'field_1', targetField: 'standard_field_1', status: 'Confirmed' }
        ]
      }
    };

    const updatedRecord = await VerificationRecord.findByIdAndUpdate(
      recordId,
      updatedData,
      { new: true }
    );
    
    expect(updatedRecord.blockchainStatus).toBe(updatedData.blockchainStatus);
    expect(updatedRecord.validationResults.ruleOutcomes.length).toBe(3);
    expect(updatedRecord.validationResults.ruleOutcomes[2].result).toBe('Warning');
  });

  test('should delete a verification record successfully', async () => {
    await VerificationRecord.findByIdAndDelete(recordId);
    const deletedRecord = await VerificationRecord.findById(recordId);
    
    expect(deletedRecord).toBeNull();
  });

  test('should not create a verification record with duplicate recordId', async () => {
    const duplicateRecord = new VerificationRecord({
      recordId: 'rec_12345', // Same recordId as test record
      fileId: new mongoose.Types.ObjectId(),
      version: '1.0',
      timestamp: new Date(),
      validationStatus: 'Valid',
      fileChecksum: 'sha256_duplicate',
      validationResults: {
        isValid: true,
        verificationStatus: 'Verified'
      },
      createdBy: 'system'
    });

    await expect(duplicateRecord.save()).rejects.toThrow();
  });

  test('should not create a verification record with invalid validation status', async () => {
    const invalidRecord = new VerificationRecord({
      recordId: 'rec_invalid',
      fileId: new mongoose.Types.ObjectId(),
      version: '1.0',
      timestamp: new Date(),
      validationStatus: 'InvalidStatus', // Invalid status
      fileChecksum: 'sha256_invalid',
      validationResults: {
        isValid: true,
        verificationStatus: 'Verified'
      },
      createdBy: 'system'
    });

    await expect(invalidRecord.save()).rejects.toThrow();
  });

  test('should not create a verification record with invalid blockchain status', async () => {
    const invalidRecord = new VerificationRecord({
      recordId: 'rec_invalid_blockchain',
      fileId: new mongoose.Types.ObjectId(),
      version: '1.0',
      timestamp: new Date(),
      validationStatus: 'Valid',
      fileChecksum: 'sha256_invalid_blockchain',
      validationResults: {
        isValid: true,
        verificationStatus: 'Verified'
      },
      createdBy: 'system',
      blockchainStatus: 'InvalidStatus' // Invalid blockchain status
    });

    await expect(invalidRecord.save()).rejects.toThrow();
  });
});
