/**
 * Mock Blockchain Implementation
 * Simulates blockchain functionality for testing
 */
const BlockchainInterface = require('../interfaces/BlockchainInterface');
const VerificationRecord = require('../models/VerificationRecord');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class MockBlockchain extends BlockchainInterface {
  constructor() {
    super();
    this.initialized = false;
    this.records = new Map();
    this.transactions = new Map();
    this.identities = new Map();
    this.storageDir = path.join(__dirname, 'storage');
    this.mockLatency = 1000; // Simulate network latency in ms
  }

  /**
   * Initialize the mock blockchain
   * @param {Object} config - Configuration options
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(config) {
    // Create storage directory if it doesn't exist
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    
    // Load any existing data
    try {
      if (fs.existsSync(path.join(this.storageDir, 'records.json'))) {
        const recordsData = JSON.parse(fs.readFileSync(path.join(this.storageDir, 'records.json'), 'utf8'));
        Object.entries(recordsData).forEach(([key, value]) => {
          this.records.set(key, value);
        });
      }
      
      if (fs.existsSync(path.join(this.storageDir, 'transactions.json'))) {
        const txData = JSON.parse(fs.readFileSync(path.join(this.storageDir, 'transactions.json'), 'utf8'));
        Object.entries(txData).forEach(([key, value]) => {
          this.transactions.set(key, value);
        });
      }
      
      if (fs.existsSync(path.join(this.storageDir, 'identities.json'))) {
        const identitiesData = JSON.parse(fs.readFileSync(path.join(this.storageDir, 'identities.json'), 'utf8'));
        Object.entries(identitiesData).forEach(([key, value]) => {
          this.identities.set(key, value);
        });
      }
    } catch (error) {
      console.error('Error loading mock blockchain data:', error);
    }
    
    this.initialized = true;
    console.log('Mock blockchain initialized with config:', config);
    return true;
  }

  /**
   * Save current state to storage
   * @private
   */
  _saveState() {
    // Convert Maps to objects for JSON serialization
    const recordsObj = Object.fromEntries(this.records);
    const txObj = Object.fromEntries(this.transactions);
    const identitiesObj = Object.fromEntries(this.identities);
    
    fs.writeFileSync(path.join(this.storageDir, 'records.json'), JSON.stringify(recordsObj, null, 2));
    fs.writeFileSync(path.join(this.storageDir, 'transactions.json'), JSON.stringify(txObj, null, 2));
    fs.writeFileSync(path.join(this.storageDir, 'identities.json'), JSON.stringify(identitiesObj, null, 2));
  }

  /**
   * Generate a mock transaction ID
   * @private
   * @returns {string} - Transaction ID
   */
  _generateTxId() {
    return 'tx_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Simulate blockchain latency
   * @private
   * @returns {Promise<void>}
   */
  async _simulateLatency() {
    return new Promise(resolve => setTimeout(resolve, this.mockLatency));
  }

  /**
   * Store verification record on blockchain
   * @param {Object} verificationRecord - Record to store
   * @returns {Promise<Object>} - Transaction result
   */
  async storeVerificationRecord(verificationRecord) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    // Ensure record has proper structure
    if (!(verificationRecord instanceof VerificationRecord)) {
      verificationRecord = new VerificationRecord(verificationRecord);
    }
    
    if (!verificationRecord.isValid()) {
      throw new Error('Invalid verification record');
    }
    
    // Generate transaction ID
    const txId = this._generateTxId();
    
    // Store record
    this.records.set(verificationRecord.recordId, verificationRecord);
    
    // Create transaction record
    const transaction = {
      txId,
      type: 'StoreVerificationRecord',
      recordId: verificationRecord.recordId,
      timestamp: new Date().toISOString(),
      status: 'Confirmed',
      blockHeight: Math.floor(Math.random() * 1000000) + 1,
      confirmations: 1
    };
    
    this.transactions.set(txId, transaction);
    
    // Save state
    this._saveState();
    
    return {
      success: true,
      txId,
      recordId: verificationRecord.recordId,
      timestamp: transaction.timestamp,
      blockHeight: transaction.blockHeight
    };
  }

  /**
   * Retrieve verification record from blockchain
   * @param {string} recordId - ID of the record to retrieve
   * @returns {Promise<Object>} - Retrieved record
   */
  async getVerificationRecord(recordId) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    const record = this.records.get(recordId);
    
    if (!record) {
      throw new Error(`Record with ID ${recordId} not found`);
    }
    
    return record;
  }

  /**
   * Verify record authenticity on blockchain
   * @param {string} recordId - ID of the record to verify
   * @returns {Promise<Object>} - Verification result
   */
  async verifyRecord(recordId) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    const record = this.records.get(recordId);
    
    if (!record) {
      throw new Error(`Record with ID ${recordId} not found`);
    }
    
    // In a real implementation, this would verify cryptographic signatures
    // For the mock, we'll just check if the record exists and has a signature
    const isAuthentic = !!record.signature;
    
    return {
      recordId,
      isAuthentic,
      timestamp: new Date().toISOString(),
      verificationDetails: {
        signatureValid: isAuthentic,
        recordExists: true,
        recordIntact: true
      }
    };
  }

  /**
   * Get transaction status
   * @param {string} txId - Transaction ID
   * @returns {Promise<Object>} - Transaction status
   */
  async getTransactionStatus(txId) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    const transaction = this.transactions.get(txId);
    
    if (!transaction) {
      throw new Error(`Transaction with ID ${txId} not found`);
    }
    
    // Simulate increasing confirmations over time
    transaction.confirmations = Math.min(
      transaction.confirmations + Math.floor(Math.random() * 3),
      12
    );
    
    this.transactions.set(txId, transaction);
    this._saveState();
    
    return transaction;
  }

  /**
   * Create a new identity on the blockchain
   * @param {Object} identityData - Identity information
   * @returns {Promise<Object>} - Created identity
   */
  async createIdentity(identityData) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    const identityId = 'id_' + crypto.randomBytes(16).toString('hex');
    
    const identity = {
      identityId,
      ...identityData,
      created: new Date().toISOString(),
      status: 'Active'
    };
    
    this.identities.set(identityId, identity);
    this._saveState();
    
    return identity;
  }

  /**
   * Update an existing identity
   * @param {string} identityId - ID of the identity to update
   * @param {Object} updateData - Updated identity information
   * @returns {Promise<Object>} - Update result
   */
  async updateIdentity(identityId, updateData) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    const identity = this.identities.get(identityId);
    
    if (!identity) {
      throw new Error(`Identity with ID ${identityId} not found`);
    }
    
    const updatedIdentity = {
      ...identity,
      ...updateData,
      updated: new Date().toISOString()
    };
    
    this.identities.set(identityId, updatedIdentity);
    this._saveState();
    
    return updatedIdentity;
  }

  /**
   * Revoke an identity
   * @param {string} identityId - ID of the identity to revoke
   * @returns {Promise<Object>} - Revocation result
   */
  async revokeIdentity(identityId) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    const identity = this.identities.get(identityId);
    
    if (!identity) {
      throw new Error(`Identity with ID ${identityId} not found`);
    }
    
    identity.status = 'Revoked';
    identity.revokedAt = new Date().toISOString();
    
    this.identities.set(identityId, identity);
    this._saveState();
    
    return {
      identityId,
      status: 'Revoked',
      revokedAt: identity.revokedAt
    };
  }

  /**
   * Create a confidential transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Transaction result
   */
  async createConfidentialTransaction(transactionData) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    // Generate transaction ID
    const txId = this._generateTxId();
    
    // Create transaction record
    const transaction = {
      txId,
      type: 'ConfidentialTransaction',
      data: transactionData,
      timestamp: new Date().toISOString(),
      status: 'Confirmed',
      blockHeight: Math.floor(Math.random() * 1000000) + 1,
      confirmations: 1,
      isConfidential: true
    };
    
    this.transactions.set(txId, transaction);
    this._saveState();
    
    return {
      success: true,
      txId,
      timestamp: transaction.timestamp,
      blockHeight: transaction.blockHeight
    };
  }

  /**
   * Generate a zero-knowledge proof
   * @param {Object} proofData - Data for proof generation
   * @returns {Promise<Object>} - Generated proof
   */
  async generateZkProof(proofData) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    // In a real implementation, this would use ZK libraries
    // For the mock, we'll just create a simulated proof
    const proof = {
      id: 'proof_' + crypto.randomBytes(16).toString('hex'),
      type: proofData.type || 'MockZkProof',
      publicInputs: proofData.publicInputs || {},
      proof: 'mock_proof_' + crypto.randomBytes(32).toString('hex'),
      created: new Date().toISOString()
    };
    
    return proof;
  }

  /**
   * Verify a zero-knowledge proof
   * @param {Object} proof - Proof to verify
   * @param {Object} publicInputs - Public inputs for verification
   * @returns {Promise<boolean>} - Verification result
   */
  async verifyZkProof(proof, publicInputs) {
    if (!this.initialized) {
      throw new Error('Blockchain not initialized');
    }
    
    await this._simulateLatency();
    
    // In a real implementation, this would use ZK libraries
    // For the mock, we'll just simulate verification
    // Always return true unless the proof is explicitly marked as invalid
    return proof.invalid !== true;
  }
}

module.exports = MockBlockchain;
