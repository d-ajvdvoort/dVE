/**
 * Blockchain Service
 * Provides a unified interface for blockchain operations
 */
const MockBlockchain = require('../mock/MockBlockchain');
const MockKeri = require('../mock/MockKeri');
const VerificationRecord = require('../models/VerificationRecord');

class BlockchainService {
  constructor() {
    this.blockchain = null;
    this.keri = null;
    this.initialized = false;
  }

  /**
   * Initialize the blockchain service
   * @param {Object} config - Configuration options
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(config = {}) {
    try {
      // Determine which blockchain implementation to use
      const blockchainType = config.blockchainType || 'mock';
      const keriType = config.keriType || 'mock';
      
      // Initialize blockchain
      if (blockchainType === 'mock') {
        this.blockchain = new MockBlockchain();
      } else if (blockchainType === 'cardano') {
        // In a real implementation, this would use the actual Cardano implementation
        throw new Error('Cardano implementation not available yet');
      } else {
        throw new Error(`Unsupported blockchain type: ${blockchainType}`);
      }
      
      // Initialize KERI
      if (keriType === 'mock') {
        this.keri = new MockKeri();
      } else if (keriType === 'keriox') {
        // In a real implementation, this would use the keriox implementation
        throw new Error('Keriox implementation not available yet');
      } else if (keriType === 'kerigo') {
        // In a real implementation, this would use the kerigo implementation
        throw new Error('Kerigo implementation not available yet');
      } else {
        throw new Error(`Unsupported KERI type: ${keriType}`);
      }
      
      // Initialize both components
      await this.blockchain.initialize(config.blockchain || {});
      await this.keri.initialize(config.keri || {});
      
      this.initialized = true;
      console.log(`Blockchain service initialized with ${blockchainType} blockchain and ${keriType} KERI`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Create a verification record
   * @param {Object} recordData - Record data
   * @returns {Promise<Object>} - Created record
   */
  async createVerificationRecord(recordData) {
    this._checkInitialized();
    
    try {
      // Create a new verification record
      const record = new VerificationRecord(recordData);
      
      // Create an identifier if needed
      let identifierId = recordData.createdBy;
      if (!identifierId) {
        const identifierResult = await this.keri.createIdentifier({
          controller: recordData.controller || 'system',
          metadata: {
            recordId: record.recordId,
            fileId: record.fileId
          }
        });
        identifierId = identifierResult.id;
        record.createdBy = identifierId;
      }
      
      // Sign the record
      const signature = await this.keri.sign(identifierId, record);
      record.signature = signature.signature;
      
      // Store the record on the blockchain
      const result = await this.blockchain.storeVerificationRecord(record);
      
      return {
        success: true,
        record,
        transaction: result
      };
    } catch (error) {
      console.error('Failed to create verification record:', error);
      throw error;
    }
  }

  /**
   * Verify a record
   * @param {string} recordId - ID of the record to verify
   * @returns {Promise<Object>} - Verification result
   */
  async verifyRecord(recordId) {
    this._checkInitialized();
    
    try {
      // Get the record from the blockchain
      const record = await this.blockchain.getVerificationRecord(recordId);
      
      // Verify the record on the blockchain
      const blockchainVerification = await this.blockchain.verifyRecord(recordId);
      
      // Verify the signature using KERI
      const signatureVerification = await this.keri.verify(
        record.createdBy,
        { ...record, signature: undefined }, // Exclude signature from verification data
        record.signature
      );
      
      return {
        recordId,
        record,
        blockchainVerification,
        signatureValid: signatureVerification,
        isValid: blockchainVerification.isAuthentic && signatureVerification
      };
    } catch (error) {
      console.error('Failed to verify record:', error);
      throw error;
    }
  }

  /**
   * Create a confidential verification record
   * @param {Object} recordData - Record data
   * @param {Object} privacyOptions - Privacy options
   * @returns {Promise<Object>} - Created record
   */
  async createConfidentialRecord(recordData, privacyOptions = {}) {
    this._checkInitialized();
    
    try {
      // Create a new verification record
      const record = new VerificationRecord(recordData);
      
      // Apply privacy options
      if (privacyOptions.encryptSensitiveData) {
        const encryptedRecord = record.encryptSensitiveData(privacyOptions.encryptionKeys || {});
        Object.assign(record, encryptedRecord);
      }
      
      // Create an identifier if needed
      let identifierId = recordData.createdBy;
      if (!identifierId) {
        const identifierResult = await this.keri.createIdentifier({
          controller: recordData.controller || 'system',
          metadata: {
            recordId: record.recordId,
            fileId: record.fileId
          }
        });
        identifierId = identifierResult.id;
        record.createdBy = identifierId;
      }
      
      // Sign the record
      const signature = await this.keri.sign(identifierId, record);
      record.signature = signature.signature;
      
      // Create a confidential transaction
      const result = await this.blockchain.createConfidentialTransaction({
        type: 'VerificationRecord',
        recordId: record.recordId,
        record: record.toBlockchainFormat()
      });
      
      return {
        success: true,
        record,
        transaction: result
      };
    } catch (error) {
      console.error('Failed to create confidential record:', error);
      throw error;
    }
  }

  /**
   * Generate a zero-knowledge proof for a record
   * @param {string} recordId - ID of the record
   * @param {Object} proofOptions - Proof options
   * @returns {Promise<Object>} - Generated proof
   */
  async generateRecordProof(recordId, proofOptions = {}) {
    this._checkInitialized();
    
    try {
      // Get the record from the blockchain
      const record = await this.blockchain.getVerificationRecord(recordId);
      
      // Determine which fields to include in the proof
      const fieldsToProve = proofOptions.fields || ['validationStatus', 'fileChecksum'];
      
      // Extract public inputs (fields that will be revealed)
      const publicInputs = {};
      fieldsToProve.forEach(field => {
        if (record[field] !== undefined) {
          publicInputs[field] = record[field];
        }
      });
      
      // Generate the proof
      const proof = await this.blockchain.generateZkProof({
        type: proofOptions.type || 'RecordFieldProof',
        record,
        publicInputs,
        privateInputs: { record }
      });
      
      return {
        recordId,
        proof,
        publicInputs
      };
    } catch (error) {
      console.error('Failed to generate record proof:', error);
      throw error;
    }
  }

  /**
   * Verify a zero-knowledge proof for a record
   * @param {Object} proof - The proof to verify
   * @param {Object} publicInputs - Public inputs for verification
   * @returns {Promise<Object>} - Verification result
   */
  async verifyRecordProof(proof, publicInputs) {
    this._checkInitialized();
    
    try {
      // Verify the proof
      const isValid = await this.blockchain.verifyZkProof(proof, publicInputs);
      
      return {
        isValid,
        proof,
        publicInputs
      };
    } catch (error) {
      console.error('Failed to verify record proof:', error);
      throw error;
    }
  }

  /**
   * Implement GDPR-compliant erasure for a record
   * @param {string} recordId - ID of the record to erase
   * @returns {Promise<Object>} - Erasure result
   */
  async implementRecordErasure(recordId) {
    this._checkInitialized();
    
    try {
      // Get the record from the blockchain
      const record = await this.blockchain.getVerificationRecord(recordId);
      
      // Implement erasure for the identifier
      const erasureResult = await this.keri.implementErasure(record.createdBy);
      
      // In a real implementation, this would also update the blockchain record
      // For the mock, we'll just return the erasure result
      
      return {
        recordId,
        erasureResult,
        success: erasureResult.success
      };
    } catch (error) {
      console.error('Failed to implement record erasure:', error);
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   * @private
   */
  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('Blockchain service not initialized');
    }
  }
}

module.exports = new BlockchainService();
