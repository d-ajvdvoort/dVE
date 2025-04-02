const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { User, FileMetadata, Mapping } = require('../../src/models');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

describe('Data Mapping Integration Tests', () => {
  let testUser;
  let authToken;
  let testFileId;
  let testFileMetadata;
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
      username: 'mappinguser',
      email: 'mapping@example.com',
      password: await bcrypt.hash('testpassword', 10),
      role: 'user',
      organization: 'Test Org'
    });
    await testUser.save();

    // Login to get auth token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'mapping@example.com',
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
  });

  describe('GET /api/mapping/schemas', () => {
    test('should get target schemas successfully', async () => {
      const res = await request(app)
        .get('/api/mapping/schemas')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.schemas).toBeDefined();
      expect(Array.isArray(res.body.schemas)).toBe(true);
      expect(res.body.schemas.length).toBeGreaterThan(0);
      
      // Check schema structure
      const firstSchema = res.body.schemas[0];
      expect(firstSchema.id).toBeDefined();
      expect(firstSchema.name).toBeDefined();
      expect(firstSchema.fields).toBeDefined();
      expect(Array.isArray(firstSchema.fields)).toBe(true);
    });

    test('should return error when not authenticated', async () => {
      const res = await request(app)
        .get('/api/mapping/schemas');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/mapping/file/:fileId/schema', () => {
    test('should get file schema successfully', async () => {
      const res = await request(app)
        .get(`/api/mapping/file/${testFileId}/schema`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.schema).toBeDefined();
      expect(res.body.fileName).toBe('test_file.csv');
      expect(Array.isArray(res.body.schema)).toBe(true);
      
      // Check schema fields
      const fields = res.body.schema.map(field => field.field);
      expect(fields).toContain('id');
      expect(fields).toContain('type');
      expect(fields).toContain('value');
      expect(fields).toContain('unit');
      expect(fields).toContain('date');
    });

    test('should return error for non-existent file', async () => {
      const res = await request(app)
        .get('/api/mapping/file/nonexistent/schema')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/mapping', () => {
    test('should create mapping successfully', async () => {
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

      const res = await request(app)
        .post('/api/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.mapping).toBeDefined();
      expect(res.body.mapping.fileId).toBe(testFileMetadata._id.toString());
      expect(res.body.mapping.schemaId).toBe(mappingData.schemaId);
      expect(res.body.mapping.status).toBe('draft');
      
      // Save mapping ID for subsequent tests
      mappingId = res.body.mapping._id;
      
      // Verify file metadata was updated
      const updatedFile = await FileMetadata.findById(testFileMetadata._id);
      expect(updatedFile.mappingId).toBeDefined();
      expect(updatedFile.status).toBe('mapped');
    });

    test('should return error for invalid file ID', async () => {
      const mappingData = {
        fileId: new mongoose.Types.ObjectId(), // Non-existent file ID
        schemaId: 'EmissionData',
        columnMappings: {
          emissionId: 'id',
          emissionType: 'type'
        }
      };

      const res = await request(app)
        .post('/api/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('should return error for invalid schema ID', async () => {
      const mappingData = {
        fileId: testFileMetadata._id,
        schemaId: 'InvalidSchema', // Invalid schema ID
        columnMappings: {
          emissionId: 'id',
          emissionType: 'type'
        }
      };

      const res = await request(app)
        .post('/api/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/mapping/:mappingId', () => {
    test('should get mapping successfully', async () => {
      // First create a mapping
      const mappingData = {
        fileId: testFileMetadata._id,
        schemaId: 'ActivityData',
        columnMappings: {
          activityId: 'id',
          activityType: 'type',
          activityValue: 'value'
        }
      };

      const createRes = await request(app)
        .post('/api/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData);

      const mappingId = createRes.body.mapping._id;

      // Now get the mapping
      const res = await request(app)
        .get(`/api/mapping/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mapping).toBeDefined();
      expect(res.body.mapping._id).toBe(mappingId);
      expect(res.body.mapping.schemaId).toBe(mappingData.schemaId);
    });

    test('should return error for non-existent mapping', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .get(`/api/mapping/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/mapping/:mappingId', () => {
    test('should update mapping successfully', async () => {
      // First create a mapping
      const mappingData = {
        fileId: testFileMetadata._id,
        schemaId: 'ReferenceData',
        columnMappings: {
          referenceId: 'id',
          referenceType: 'type',
          referenceValue: 'value'
        }
      };

      const createRes = await request(app)
        .post('/api/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData);

      const mappingId = createRes.body.mapping._id;

      // Now update the mapping
      const updateData = {
        columnMappings: {
          referenceId: 'id',
          referenceType: 'type',
          referenceValue: 'value',
          referenceUnit: 'unit' // Added new mapping
        },
        status: 'ready'
      };

      const res = await request(app)
        .put(`/api/mapping/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mapping).toBeDefined();
      expect(res.body.mapping._id).toBe(mappingId);
      expect(res.body.mapping.status).toBe(updateData.status);
      expect(res.body.mapping.columnMappings).toHaveProperty('referenceUnit');
    });

    test('should return error for non-existent mapping', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .put(`/api/mapping/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'ready' });

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/mapping/:mappingId/apply', () => {
    test('should apply mapping successfully', async () => {
      // First create a mapping
      const mappingData = {
        fileId: testFileMetadata._id,
        schemaId: 'EmissionData',
        columnMappings: {
          emissionId: 'id',
          emissionType: 'type',
          emissionValue: 'value',
          emissionUnit: 'unit',
          reportingDate: 'date'
        }
      };

      const createRes = await request(app)
        .post('/api/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData);

      const mappingId = createRes.body.mapping._id;

      // Now apply the mapping
      const res = await request(app)
        .post(`/api/mapping/${mappingId}/apply`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('applied successfully');
      
      // Verify mapping status was updated
      const updatedMapping = await Mapping.findById(mappingId);
      expect(updatedMapping.status).toBe('applied');
      
      // Verify file status was updated
      const updatedFile = await FileMetadata.findById(testFileMetadata._id);
      expect(updatedFile.status).toBe('mapped');
    });

    test('should return error for non-existent mapping', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .post(`/api/mapping/${nonExistentId}/apply`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/mapping/:mappingId', () => {
    test('should delete mapping successfully', async () => {
      // First create a mapping
      const mappingData = {
        fileId: testFileMetadata._id,
        schemaId: 'EmissionData',
        columnMappings: {
          emissionId: 'id',
          emissionType: 'type'
        }
      };

      const createRes = await request(app)
        .post('/api/mapping')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mappingData);

      const mappingId = createRes.body.mapping._id;

      // Now delete the mapping
      const res = await request(app)
        .delete(`/api/mapping/${mappingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
      
      // Verify mapping was deleted
      const deletedMapping = await Mapping.findById(mappingId);
      expect(deletedMapping).toBeNull();
      
      // Verify file metadata was updated
      const updatedFile = await FileMetadata.findById(testFileMetadata._id);
      expect(updatedFile.mappingId).toBeUndefined();
      expect(updatedFile.status).toBe('uploaded');
    });

    test('should return error for non-existent mapping', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await request(app)
        .delete(`/api/mapping/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
