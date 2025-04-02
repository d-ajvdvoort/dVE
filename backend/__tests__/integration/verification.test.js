const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { User, FileMetadata, Mapping, ValidationRule, VerificationRecord } = require('../../src/models');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

describe('Verification Integration Tests', () => {
  let testUser;
  let authToken;
  let testFileId;
  let testFileMetadata;
  let mappingId;
  const testFilePath = path.join(__dirname, '../fixtures/test_file.csv');

  beforeAll(async () => {
    // Create test fixtures directory if it doesn't exist
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a test CSV file
    const testFileContent = 'id,type,value,unit,date\n001,CO2,100,kg,2023-01-01\n002,CH4,50,kg,2023-01-02\n';
    fs.writeFileSync(testFilePath, testFileContent);

    // Create a test user
    testUser = new User({
      username: 'verifyuser',
      email: 'verify@example.com',
      password: await bcrypt.hash('testpassword', 10),
      role: 'verifier',
      organization: 'Test Org'
    });
    await testUser.save();

    // Login to get auth token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'verify@example.com',
        password: 'testpassword'
      });

    authToken = res.body.token;

    // Upload a test file
    const uploadRes = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', testFilePath)
      .field('metadata', JSON.stringify({
        contractId: 'contract_123',
        originator: 'Test Company',
        dataType: 'First Party Data'
      }));

    testFileId = uploadRes.body.file.fileId;
    testFileMetadata = await FileMetadata.findOne({ fileId: testFileId });

    // Create a mapping for the file
    const mappingData = {
      fileId: testFileMetadata._id,
      schemaId: 'EmissionData',
      columnMappings: {
        emissionId: 'id',
        emissionType: 'type',
        emissionValue: 'value',
        emissionUnit: 'unit',
        reportingDate: 'date'
      },
      assignedReferences: {
        emissionType: 'GHG',
        emissionScope: 'Scope 1'
      }
    };

    const mappingRes = await request(app)
      .post('/api/mapping')
      .set('Authorization', `Bearer ${authToken}`)
      .send(mappingData);

    mappingId = mappingRes.body.mapping._id;

    // Apply the mapping
    await request(app)
      .post(`/api/mapping/${mappingId}/apply`)
      .set('Authorization', `Bearer ${authToken}`);

    // Create validation rules
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
        createdBy: testUser._id
      },
      {
        name: 'Emission Value Range',
        description: 'Emission value must be positive',
        ruleType: 'range',
        targetField: 'emissionValue',
        parameters: {
          min: 0
        },
        severity: 'error',
        message: 'Emission value must be positive',
        active: true,
        schemaId: 'EmissionData',
        createdBy: testUser._id
      }
    ];

    for (const rule of rules) {
      const validationRule = new ValidationRule(rule);
      await validationRule.save();
    }
  });

  afterAll(async () => {
    // Clean up test user
    await User.findByIdAndDelete(testUser._id);

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // Clean up any uploaded files
    const uploadedFiles = await FileMetadata.find({ uploadedBy: testUser._id });
    for (const file of uploadedFiles) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      await FileMetadata.findByIdAndDelete(file._id);
    }

    // Clean up mappings
    await Mapping.deleteMany({ createdBy: testUser._id });

    // Clean up validation rules
    await ValidationRule.deleteMany({ createdBy: testUser._id });

    // Clean up verification records
    await VerificationRecord.deleteMany({ createdBy: testUser._id.toString() });
  });

  describe('POST /api/validation/rules', () => {
    test('should create validation rule successfully', async () => {
      const ruleData = {
        name: 'Test Pattern Rule',
        description: 'Test pattern validation',
        ruleType: 'pattern',
        targetField: 'emissionId',
        parameters: {
          pattern: '^[A-Z0-9]+$'
        },
        severity: 'warning',
        message: 'Emission ID should be uppercase alphanumeric',
        schemaId: 'EmissionData'
      };

      const res = await request(app)
        .post('/api/validation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ruleData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.rule).toBeDefined();
      expect(res.body.rule.name).toBe(ruleData.name);
      expect(res.body.rule.ruleType).toBe(ruleData.ruleType);
      expect(res.body.rule.active).toBe(true);
    });

    test('should return error for invalid rule type', async () => {
      const ruleData = {
        name: 'Invalid Rule',
        description: 'Rule with invalid type',
        ruleType: 'invalid-type',
        targetField: 'emissionId',
        severity: 'error',
        message: 'Invalid rule type',
        schemaId: 'EmissionData'
      };

      const res = await request(app)
        .post('/api/validation/rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ruleData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/validation/rules', () => {
    test('should get validation rules successfully', async () => {
      const res = await request(app)
        .get('/api/validation/rules')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rules).toBeDefined();
      expect(Array.isArray(res.body.rules)).toBe(true);
      expect(res.body.rules.length).toBeGreaterThan(0);
    });

    test('should filter rules by schema ID', async () => {
      const res = await request(app)
        .get('/api/validation/rules?schemaId=EmissionData')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rules).toBeDefined();
      
      // All returned rules should have schemaId 'EmissionData'
      res.body.rules.forEach(rule => {
        expect(rule.schemaId).toBe('EmissionData');
      });
    });
  });

  describe('POST /api/verification/verify/:fileId', () => {
    test('should verify file successfully', async () => {
      const verificationData = {
        createBlockchainRecord: true,
        emissionInventoryType: 'GHG',
        emissionCategory: 'Scope 1',
        emissionScope: 'Direct',
        activityCategories: ['Energy', 'Transportation'],
        standards: ['ISO-14061', 'GHG Protocol']
      };

      const res = await request(app)
        .post(`/api/verification/verify/${testFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(verificationData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verificationResults).toBeDefined();
      expect(res.body.verificationResults.isValid).toBeDefined();
      expect(res.body.verificationRecord).toBeDefined();
      expect(res.body.verificationRecord.recordId).toBeDefined();
      expect(res.body.blockchainTxId).toBeDefined();
      
      // Save verification record ID for subsequent tests
      verificationRecordId = res.body.verificationRecord.recordId;
      
      // Verify file metadata was updated
      const updatedFile = await FileMetadata.findById(testFileMetadata._id);
      expect(updatedFile.status).toBe('verified');
      expect(updatedFile.verificationRecordId).toBeDefined();
      expect(updatedFile.blockchainTxId).toBeDefined();
    });

    test('should return error for non-existent file', async () => {
      const res = await request(app)
        .post('/api/verification/verify/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          createBlockchainRecord: true
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('should return error for file with wrong status', async () => {
      // Upload a new file but don't map it
      const uploadRes = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('metadata', JSON.stringify({
          contractId: 'unmapped_file',
          originator: 'Test Company'
        }));

      const unmappedFileId = uploadRes.body.file.fileId;

      // Try to verify the unmapped file
      const res = await request(app)
        .post(`/api/verification/verify/${unmappedFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          createBlockchainRecord: true
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('must be in \'mapped\' status');
    });
  });

  describe('GET /api/verification/record/:recordId', () => {
    test('should get verification record successfully', async () => {
      // First verify a file to create a record
      const verificationData = {
        createBlockchainRecord: true,
        emissionInventoryType: 'GHG',
        emissionCategory: 'Scope 1'
      };

      const verifyRes = await request(app)
        .post(`/api/verification/verify/${testFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(verificationData);

      const recordId = verifyRes.body.verificationRecord.recordId;

      // Now get the verification record
      const res = await request(app)
        .get(`/api/verification/record/${recordId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verificationRecord).toBeDefined();
      expect(res.body.verificationRecord.recordId).toBe(recordId);
      expect(res.body.blockchainVerification).toBeDefined();
      expect(res.body.blockchainVerification.isValid).toBeDefined();
    });

    test('should return error for non-existent record', async () => {
      const res = await request(app)
        .get('/api/verification/record/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/verification/records', () => {
    test('should list verification records successfully', async () => {
      const res = await request(app)
        .get('/api/verification/records')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.records).toBeDefined();
      expect(Array.isArray(res.body.records)).toBe(true);
      expect(res.body.records.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    test('should filter records by validation status', async () => {
      const res = await request(app)
        .get('/api/verification/records?validationStatus=Valid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.records).toBeDefined();
      
      // All returned records should have validationStatus 'Valid'
      res.body.records.forEach(record => {
        expect(record.validationStatus).toBe('Valid');
      });
    });

    test('should paginate results', async () => {
      const res = await request(app)
        .get('/api/verification/records?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });
});
