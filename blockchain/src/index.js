import { CardanoMidnight } from 'midnight-sdk';
import { Keri } from 'keri';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Cardano Midnight client
const initMidnight = async () => {
  try {
    const midnight = new CardanoMidnight({
      apiKey: process.env.MIDNIGHT_API_KEY,
      network: process.env.NETWORK || 'testnet'
    });
    
    console.log('Cardano Midnight client initialized');
    return midnight;
  } catch (error) {
    console.error('Failed to initialize Cardano Midnight client:', error);
    throw error;
  }
};

// Initialize KERI integration
const initKeri = async () => {
  try {
    const keri = new Keri({
      keyPath: process.env.KERI_KEY_PATH,
      configPath: process.env.KERI_CONFIG_PATH
    });
    
    console.log('KERI integration initialized');
    return keri;
  } catch (error) {
    console.error('Failed to initialize KERI integration:', error);
    throw error;
  }
};

// Main blockchain integration module
const blockchainIntegration = {
  midnight: null,
  keri: null,
  
  // Initialize blockchain components
  init: async () => {
    blockchainIntegration.midnight = await initMidnight();
    blockchainIntegration.keri = await initKeri();
    return blockchainIntegration;
  },
  
  // Store verification record on blockchain
  storeVerificationRecord: async (record) => {
    try {
      // Sign record with KERI
      const signedRecord = await blockchainIntegration.keri.sign(record);
      
      // Store on Cardano Midnight
      const txHash = await blockchainIntegration.midnight.storeRecord(signedRecord);
      
      return {
        success: true,
        txHash,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to store verification record:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  // Verify record authenticity
  verifyRecord: async (recordId) => {
    try {
      const record = await blockchainIntegration.midnight.getRecord(recordId);
      const isValid = await blockchainIntegration.keri.verify(record);
      
      return {
        success: true,
        isValid,
        record
      };
    } catch (error) {
      console.error('Failed to verify record:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

export default blockchainIntegration;
