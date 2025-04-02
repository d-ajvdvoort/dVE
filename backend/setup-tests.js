const jest = require('jest');
const path = require('path');
const fs = require('fs');

// Create Jest configuration
const jestConfig = {
  verbose: true,
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['./jest.setup.js']
};

// Write Jest configuration to file
fs.writeFileSync(
  path.join(__dirname, 'jest.config.js'),
  `module.exports = ${JSON.stringify(jestConfig, null, 2)};`
);

// Create Jest setup file
const jestSetup = `
// Jest setup file
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Set environment variables for testing
  process.env.MONGO_URI = mongoUri;
  process.env.JWT_SECRET = 'test_jwt_secret';
  process.env.NODE_ENV = 'test';
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
`;

// Write Jest setup file
fs.writeFileSync(
  path.join(__dirname, 'jest.setup.js'),
  jestSetup
);

// Create test directory structure
const testDirs = [
  'models',
  'controllers',
  'services',
  'routes',
  'middleware',
  'integration'
];

testDirs.forEach(dir => {
  const testDir = path.join(__dirname, '__tests__', dir);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
});

// Update package.json with test scripts
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = require(packageJsonPath);

packageJson.scripts = {
  ...packageJson.scripts,
  test: 'jest',
  'test:watch': 'jest --watch',
  'test:coverage': 'jest --coverage'
};

packageJson.devDependencies = {
  ...packageJson.devDependencies,
  jest: '^29.5.0',
  'mongodb-memory-server': '^8.12.2',
  supertest: '^6.3.3'
};

// Write updated package.json
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2)
);

console.log('Testing environment setup complete!');
