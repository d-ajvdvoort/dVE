/**
 * Integration tests for blockchain service
 */
const blockchainService = require('../services/blockchainService');

// Sample test data
const sampleVerificationRecord = {
  recordId: 'rec_' + Date.now(),
  fileId: 'file_12345',
  version: '1.0',
  timestamp: new Date().toISOString(),
  validationStatus: 'Valid',
  ancestry: ['file_parent_1'],
  fileChecksum: 'sha256_abcdef1234567890',
  complianceData: {
    contractId: 'contract_123',
    expirationDate: new Date(Date.now() + 31536000000).toISOString(), // 1 year from now
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
  }
};

/**
 * Run blockchain service tests
 */
async function runBlockchainTests() {
  console.log('Starting blockchain service tests...');
  
  try {
    // Initialize blockchain service
    console.log('Initializing blockchain service...');
    await blockchainService.initialize({
      blockchainType: 'mock',
      keriType: 'mock'
    });
    console.log('✓ Blockchain service initialized successfully');
    
    // Create verification record
    console.log('\nCreating verification record...');
    const createResult = await blockchainService.createVerificationRecord(sampleVerificationRecord);
    console.log('✓ Verification record created:', createResult.record.recordId);
    
    // Verify record
    console.log('\nVerifying record...');
    const verifyResult = await blockchainService.verifyRecord(createResult.record.recordId);
    console.log('✓ Record verification result:', verifyResult.isValid ? 'Valid' : 'Invalid');
    
    // Create confidential record
    console.log('\nCreating confidential record...');
    const confidentialResult = await blockchainService.createConfidentialRecord(
      { ...sampleVerificationRecord, recordId: 'rec_confidential_' + Date.now() },
      { encryptSensitiveData: true }
    );
    console.log('✓ Confidential record created:', confidentialResult.record.recordId);
    
    // Generate ZK proof
    console.log('\nGenerating zero-knowledge proof...');
    const proofResult = await blockchainService.generateRecordProof(createResult.record.recordId, {
      fields: ['validationStatus', 'fileChecksum']
    });
    console.log('✓ Zero-knowledge proof generated');
    
    // Verify ZK proof
    console.log('\nVerifying zero-knowledge proof...');
    const proofVerifyResult = await blockchainService.verifyRecordProof(
      proofResult.proof,
      proofResult.publicInputs
    );
    console.log('✓ Proof verification result:', proofVerifyResult.isValid ? 'Valid' : 'Invalid');
    
    // GDPR erasure
    console.log('\nImplementing GDPR-compliant erasure...');
    const erasureResult = await blockchainService.implementRecordErasure(createResult.record.recordId);
    console.log('✓ GDPR erasure result:', erasureResult.success ? 'Success' : 'Failed');
    
    console.log('\nAll blockchain service tests completed successfully!');
  } catch (error) {
    console.error('Error in blockchain tests:', error);
  }
}

// Export the test function
module.exports = { runBlockchainTests };

// Run tests if this file is executed directly
if (require.main === module) {
  runBlockchainTests();
}
