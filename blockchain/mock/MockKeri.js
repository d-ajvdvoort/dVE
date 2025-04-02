/**
 * Mock KERI Implementation
 * Simulates KERI functionality for testing
 */
const KeriInterface = require('../interfaces/KeriInterface');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class MockKeri extends KeriInterface {
  constructor() {
    super();
    this.initialized = false;
    this.keyPairs = new Map();
    this.identifiers = new Map();
    this.eventLogs = new Map();
    this.storageDir = path.join(__dirname, 'keri_storage');
    this.mockLatency = 500; // Simulate network latency in ms
  }

  /**
   * Initialize the mock KERI system
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
      if (fs.existsSync(path.join(this.storageDir, 'keypairs.json'))) {
        const keyPairsData = JSON.parse(fs.readFileSync(path.join(this.storageDir, 'keypairs.json'), 'utf8'));
        Object.entries(keyPairsData).forEach(([key, value]) => {
          this.keyPairs.set(key, value);
        });
      }
      
      if (fs.existsSync(path.join(this.storageDir, 'identifiers.json'))) {
        const identifiersData = JSON.parse(fs.readFileSync(path.join(this.storageDir, 'identifiers.json'), 'utf8'));
        Object.entries(identifiersData).forEach(([key, value]) => {
          this.identifiers.set(key, value);
        });
      }
      
      if (fs.existsSync(path.join(this.storageDir, 'eventlogs.json'))) {
        const eventLogsData = JSON.parse(fs.readFileSync(path.join(this.storageDir, 'eventlogs.json'), 'utf8'));
        Object.entries(eventLogsData).forEach(([key, value]) => {
          this.eventLogs.set(key, value);
        });
      }
    } catch (error) {
      console.error('Error loading mock KERI data:', error);
    }
    
    this.initialized = true;
    console.log('Mock KERI initialized with config:', config);
    return true;
  }

  /**
   * Save current state to storage
   * @private
   */
  _saveState() {
    // Convert Maps to objects for JSON serialization
    const keyPairsObj = Object.fromEntries(this.keyPairs);
    const identifiersObj = Object.fromEntries(this.identifiers);
    const eventLogsObj = Object.fromEntries(this.eventLogs);
    
    fs.writeFileSync(path.join(this.storageDir, 'keypairs.json'), JSON.stringify(keyPairsObj, null, 2));
    fs.writeFileSync(path.join(this.storageDir, 'identifiers.json'), JSON.stringify(identifiersObj, null, 2));
    fs.writeFileSync(path.join(this.storageDir, 'eventlogs.json'), JSON.stringify(eventLogsObj, null, 2));
  }

  /**
   * Simulate KERI latency
   * @private
   * @returns {Promise<void>}
   */
  async _simulateLatency() {
    return new Promise(resolve => setTimeout(resolve, this.mockLatency));
  }

  /**
   * Generate a mock key pair with pre-rotation
   * @param {Object} options - Key generation options
   * @returns {Promise<Object>} - Generated key information
   */
  async generateKeyPair(options) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    // Generate current key pair
    const currentKeyPair = {
      publicKey: 'pub_' + crypto.randomBytes(32).toString('hex'),
      privateKey: 'priv_' + crypto.randomBytes(32).toString('hex')
    };
    
    // Generate next key pair for pre-rotation
    const nextKeyPair = {
      publicKey: 'pub_' + crypto.randomBytes(32).toString('hex'),
      privateKey: 'priv_' + crypto.randomBytes(32).toString('hex')
    };
    
    const keyPairId = 'key_' + crypto.randomBytes(16).toString('hex');
    
    const keyPairInfo = {
      id: keyPairId,
      current: currentKeyPair,
      next: nextKeyPair,
      created: new Date().toISOString(),
      algorithm: options?.algorithm || 'Ed25519',
      status: 'Active'
    };
    
    this.keyPairs.set(keyPairId, keyPairInfo);
    this._saveState();
    
    // Return only public information
    return {
      id: keyPairId,
      publicKey: currentKeyPair.publicKey,
      nextPublicKey: nextKeyPair.publicKey,
      created: keyPairInfo.created,
      algorithm: keyPairInfo.algorithm
    };
  }

  /**
   * Create a new identifier
   * @param {Object} identifierData - Identifier information
   * @returns {Promise<Object>} - Created identifier
   */
  async createIdentifier(identifierData) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    // Generate key pair if not provided
    let keyPairInfo;
    if (identifierData.keyPairId) {
      keyPairInfo = this.keyPairs.get(identifierData.keyPairId);
      if (!keyPairInfo) {
        throw new Error(`Key pair with ID ${identifierData.keyPairId} not found`);
      }
    } else {
      const keyPairResult = await this.generateKeyPair({
        algorithm: identifierData.algorithm || 'Ed25519'
      });
      keyPairInfo = this.keyPairs.get(keyPairResult.id);
    }
    
    const identifierId = 'did:keri:' + crypto.randomBytes(16).toString('hex');
    
    const identifier = {
      id: identifierId,
      keyPairId: keyPairInfo.id,
      controller: identifierData.controller || 'unknown',
      created: new Date().toISOString(),
      status: 'Active',
      metadata: identifierData.metadata || {}
    };
    
    this.identifiers.set(identifierId, identifier);
    
    // Initialize event log for this identifier
    this.eventLogs.set(identifierId, [
      {
        type: 'inception',
        timestamp: identifier.created,
        data: {
          identifierId,
          publicKey: keyPairInfo.current.publicKey,
          nextPublicKey: keyPairInfo.next.publicKey
        }
      }
    ]);
    
    this._saveState();
    
    return identifier;
  }

  /**
   * Rotate keys for an identifier
   * @param {string} identifierId - ID of the identifier
   * @returns {Promise<Object>} - Rotation result
   */
  async rotateKeys(identifierId) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    const identifier = this.identifiers.get(identifierId);
    if (!identifier) {
      throw new Error(`Identifier ${identifierId} not found`);
    }
    
    const keyPairInfo = this.keyPairs.get(identifier.keyPairId);
    if (!keyPairInfo) {
      throw new Error(`Key pair ${identifier.keyPairId} not found`);
    }
    
    // Rotate keys: current becomes previous, next becomes current, generate new next
    const previousKeyPair = keyPairInfo.current;
    const currentKeyPair = keyPairInfo.next;
    const nextKeyPair = {
      publicKey: 'pub_' + crypto.randomBytes(32).toString('hex'),
      privateKey: 'priv_' + crypto.randomBytes(32).toString('hex')
    };
    
    keyPairInfo.previous = previousKeyPair;
    keyPairInfo.current = currentKeyPair;
    keyPairInfo.next = nextKeyPair;
    keyPairInfo.lastRotated = new Date().toISOString();
    
    this.keyPairs.set(identifier.keyPairId, keyPairInfo);
    
    // Add rotation event to the event log
    const eventLog = this.eventLogs.get(identifierId) || [];
    eventLog.push({
      type: 'rotation',
      timestamp: keyPairInfo.lastRotated,
      data: {
        identifierId,
        previousPublicKey: previousKeyPair.publicKey,
        currentPublicKey: currentKeyPair.publicKey,
        nextPublicKey: nextKeyPair.publicKey
      }
    });
    
    this.eventLogs.set(identifierId, eventLog);
    this._saveState();
    
    return {
      identifierId,
      rotated: true,
      timestamp: keyPairInfo.lastRotated,
      currentPublicKey: currentKeyPair.publicKey,
      nextPublicKey: nextKeyPair.publicKey
    };
  }

  /**
   * Sign data with identifier's keys
   * @param {string} identifierId - ID of the identifier
   * @param {Object|string} data - Data to sign
   * @returns {Promise<Object>} - Signature result
   */
  async sign(identifierId, data) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    const identifier = this.identifiers.get(identifierId);
    if (!identifier) {
      throw new Error(`Identifier ${identifierId} not found`);
    }
    
    const keyPairInfo = this.keyPairs.get(identifier.keyPairId);
    if (!keyPairInfo) {
      throw new Error(`Key pair ${identifier.keyPairId} not found`);
    }
    
    // Convert data to string if it's an object
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // In a real implementation, this would use cryptographic libraries
    // For the mock, we'll create a simulated signature
    const signature = {
      identifierId,
      keyId: keyPairInfo.id,
      timestamp: new Date().toISOString(),
      signature: 'sig_' + crypto.createHash('sha256').update(dataStr).update(keyPairInfo.current.privateKey).digest('hex')
    };
    
    // Add signature event to the event log
    const eventLog = this.eventLogs.get(identifierId) || [];
    eventLog.push({
      type: 'signature',
      timestamp: signature.timestamp,
      data: {
        identifierId,
        keyId: keyPairInfo.id,
        dataHash: crypto.createHash('sha256').update(dataStr).digest('hex')
      }
    });
    
    this.eventLogs.set(identifierId, eventLog);
    this._saveState();
    
    return signature;
  }

  /**
   * Verify signature
   * @param {string} identifierId - ID of the identifier
   * @param {Object|string} data - Original data
   * @param {string} signature - Signature to verify
   * @returns {Promise<boolean>} - Verification result
   */
  async verify(identifierId, data, signature) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    const identifier = this.identifiers.get(identifierId);
    if (!identifier) {
      throw new Error(`Identifier ${identifierId} not found`);
    }
    
    const keyPairInfo = this.keyPairs.get(identifier.keyPairId);
    if (!keyPairInfo) {
      throw new Error(`Key pair ${identifier.keyPairId} not found`);
    }
    
    // Convert data to string if it's an object
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // In a real implementation, this would use cryptographic libraries
    // For the mock, we'll verify by recreating the signature and comparing
    const expectedSignature = 'sig_' + crypto.createHash('sha256').update(dataStr).update(keyPairInfo.current.privateKey).digest('hex');
    
    return signature === expectedSignature;
  }

  /**
   * Create a key event log
   * @param {string} identifierId - ID of the identifier
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} - Created event
   */
  async createEvent(identifierId, eventType, eventData) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    const identifier = this.identifiers.get(identifierId);
    if (!identifier) {
      throw new Error(`Identifier ${identifierId} not found`);
    }
    
    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: {
        identifierId,
        ...eventData
      }
    };
    
    // Add event to the event log
    const eventLog = this.eventLogs.get(identifierId) || [];
    eventLog.push(event);
    
    this.eventLogs.set(identifierId, eventLog);
    this._saveState();
    
    return event;
  }

  /**
   * Get key event log for an identifier
   * @param {string} identifierId - ID of the identifier
   * @returns {Promise<Array>} - Event log
   */
  async getEventLog(identifierId) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    const eventLog = this.eventLogs.get(identifierId);
    if (!eventLog) {
      throw new Error(`Event log for identifier ${identifierId} not found`);
    }
    
    return eventLog;
  }

  /**
   * Implement GDPR-compliant erasure
   * @param {string} identifierId - ID of the identifier
   * @returns {Promise<Object>} - Erasure result
   */
  async implementErasure(identifierId) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    const identifier = this.identifiers.get(identifierId);
    if (!identifier) {
      throw new Error(`Identifier ${identifierId} not found`);
    }
    
    // In a real implementation, this would implement cryptographic erasure
    // For the mock, we'll mark the identifier as erased and remove sensitive data
    
    // Create erasure event
    const erasureEvent = {
      type: 'erasure',
      timestamp: new Date().toISOString(),
      data: {
        identifierId,
        reason: 'GDPR compliance'
      }
    };
    
    // Add erasure event to the event log
    const eventLog = this.eventLogs.get(identifierId) || [];
    eventLog.push(erasureEvent);
    
    // Update identifier status
    identifier.status = 'Erased';
    identifier.erasedAt = erasureEvent.timestamp;
    
    // Remove sensitive metadata
    if (identifier.metadata) {
      delete identifier.metadata.personalData;
      delete identifier.metadata.contactInfo;
      identifier.metadata.erasureCompleted = true;
    }
    
    this.identifiers.set(identifierId, identifier);
    this.eventLogs.set(identifierId, eventLog);
    this._saveState();
    
    return {
      identifierId,
      status: 'Erased',
      timestamp: erasureEvent.timestamp,
      success: true
    };
  }

  /**
   * Establish ambient verifiability for an identifier
   * @param {string} identifierId - ID of the identifier
   * @param {Object} verifiabilityData - Verifiability information
   * @returns {Promise<Object>} - Verifiability result
   */
  async establishAmbientVerifiability(identifierId, verifiabilityData) {
    if (!this.initialized) {
      throw new Error('KERI not initialized');
    }
    
    await this._simulateLatency();
    
    const identifier = this.identifiers.get(identifierId);
    if (!identifier) {
      throw new Error(`Identifier ${identifierId} not found`);
    }
    
    // In a real implementation, this would establish ambient verifiability
    // For the mock, we'll create a verifiability record
    
    // Create verifiability event
    const verifiabilityEvent = {
      type: 'ambient-verifiability',
      timestamp: new Date().toISOString(),
      data: {
        identifierId,
        ...verifiabilityData
      }
    };
    
    // Add verifiability event to the event log
    const eventLog = this.eventLogs.get(identifierId) || [];
    eventLog.push(verifiabilityEvent);
    
    // Update identifier with verifiability information
    identifier.ambientVerifiability = {
      established: true,
      timestamp: verifiabilityEvent.timestamp,
      method: verifiabilityData.method || 'witness-based',
      witnesses: verifiabilityData.witnesses || []
    };
    
    this.identifiers.set(identifierId, identifier);
    this.eventLogs.set(identifierId, eventLog);
    this._saveState();
    
    return {
      identifierId,
      established: true,
      timestamp: verifiabilityEvent.timestamp,
      method: identifier.ambientVerifiability.method,
      witnesses: identifier.ambientVerifiability.witnesses
    };
  }
}

module.exports = MockKeri;
