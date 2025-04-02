// Configuration for the application
require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  
  // MongoDB configuration
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/dve',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret',
  jwtExpiration: process.env.JWT_EXPIRATION || '1d',
  
  // File upload configuration
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: process.env.MAX_FILE_SIZE || 10 * 1024 * 1024, // 10MB
  
  // Blockchain configuration
  blockchain: {
    type: process.env.BLOCKCHAIN_TYPE || 'mock', // 'mock', 'cardano'
    apiUrl: process.env.BLOCKCHAIN_API_URL || 'http://localhost:3000',
    apiKey: process.env.BLOCKCHAIN_API_KEY
  },
  
  // KERI configuration
  keri: {
    type: process.env.KERI_TYPE || 'mock', // 'mock', 'keriox', 'kerigo'
    configPath: process.env.KERI_CONFIG_PATH || './keri_config'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  
  // CORS configuration
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

module.exports = config;
