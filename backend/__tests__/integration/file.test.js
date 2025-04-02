const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const { User, FileMetadata } = require('../../src/models');
const fs = require('fs');
const path = require('path');

describe('File Operations Integration Tests', () => {
  let testUser;
  let authToken;
  let testFileId;
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
      username: 'fileuser',
      email: 'file@example.com',
      password: await bcrypt.hash('testpassword', 10),
      role: 'user',
      organization: 'Test Org'
    });
    await testUser.save();

    // Login to get auth token
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'file@example.com',
        password: 'testpassword'
      });

    authToken = res.body.token;
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
  });

  describe('POST /api/files/upload', () => {
    test('should upload file successfully', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('metadata', JSON.stringify({
          contractId: 'contract_123',
          originator: 'Test Company',
          dataType: 'First Party Data',
          securityClassification: 'Private'
        }));

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.file).toBeDefined();
      expect(res.body.file.originalName).toBe('test_file.csv');
      expect(res.body.file.status).toBe('uploaded');
      expect(res.body.file.fileId).toBeDefined();

      // Save file ID for subsequent tests
      testFileId = res.body.file.fileId;
    });

    test('should return error when no file is uploaded', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('metadata', JSON.stringify({
          contractId: 'contract_123',
          originator: 'Test Company'
        }));

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should return error when not authenticated', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .attach('file', testFilePath);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/files/:fileId/metadata', () => {
    test('should get file metadata successfully', async () => {
      const res = await request(app)
        .get(`/api/files/${testFileId}/metadata`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.file).toBeDefined();
      expect(res.body.file.fileId).toBe(testFileId);
      expect(res.body.file.originalName).toBe('test_file.csv');
      expect(res.body.file.metadata).toBeDefined();
      expect(res.body.file.metadata.contractId).toBe('contract_123');
    });

    test('should return error for non-existent file', async () => {
      const res = await request(app)
        .get('/api/files/nonexistent/metadata')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/files', () => {
    test('should list files successfully', async () => {
      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.files).toBeDefined();
      expect(Array.isArray(res.body.files)).toBe(true);
      expect(res.body.files.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    test('should filter files by status', async () => {
      const res = await request(app)
        .get('/api/files?status=uploaded')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.files).toBeDefined();
      expect(Array.isArray(res.body.files)).toBe(true);
      
      // All returned files should have status 'uploaded'
      res.body.files.forEach(file => {
        expect(file.status).toBe('uploaded');
      });
    });

    test('should paginate results', async () => {
      const res = await request(app)
        .get('/api/files?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  describe('DELETE /api/files/:fileId', () => {
    test('should delete file successfully', async () => {
      // First upload a file to delete
      const uploadRes = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('metadata', JSON.stringify({
          contractId: 'delete_test',
          originator: 'Test Company'
        }));

      const fileIdToDelete = uploadRes.body.file.fileId;

      // Now delete the file
      const res = await request(app)
        .delete(`/api/files/${fileIdToDelete}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('File deleted successfully');

      // Verify file is deleted
      const checkRes = await request(app)
        .get(`/api/files/${fileIdToDelete}/metadata`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.statusCode).toBe(404);
    });

    test('should return error for non-existent file', async () => {
      const res = await request(app)
        .delete('/api/files/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
