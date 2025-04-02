const fileService = require('../../services/fileService');
const { FileMetadata } = require('../../models');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
  unlinkSync: jest.fn()
}));

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('random123')
  }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('hash123')
  })
}));

// Mock multer
jest.mock('multer', () => {
  return {
    diskStorage: jest.fn().mockReturnValue({}),
    single: jest.fn().mockReturnValue(() => {})
  };
});

describe('File Service Tests', () => {
  const userId = new mongoose.Types.ObjectId();
  let fileMetadata;

  beforeEach(async () => {
    // Create test file metadata
    fileMetadata = new FileMetadata({
      originalName: 'test_file.csv',
      fileName: 'file_test_12345.csv',
      fileId: 'file_test_12345',
      mimeType: 'text/csv',
      size: 1024,
      path: '/tmp/test_file.csv',
      uploadedBy: userId,
      status: 'uploaded',
      checksum: 'sha256_abcdef1234567890'
    });
    await fileMetadata.save();

    // Mock fs.createReadStream to return a mock stream
    fs.createReadStream.mockImplementation(() => {
      return {
        on: jest.fn().mockImplementation(function(event, callback) {
          if (event === 'data') {
            callback(Buffer.from('test data'));
          } else if (event === 'end') {
            callback();
          }
          return this;
        })
      };
    });
  });

  test('should get upload middleware', () => {
    const middleware = fileService.getUploadMiddleware();
    expect(middleware).toBeDefined();
  });

  test('should save file metadata successfully', async () => {
    const file = {
      originalname: 'new_file.csv',
      filename: 'file_new_12345.csv',
      mimetype: 'text/csv',
      size: 2048,
      path: '/tmp/new_file.csv'
    };

    const metadata = {
      contractId: 'contract_123',
      originator: 'Test Company',
      dataType: 'First Party Data',
      securityClassification: 'Private'
    };

    const savedMetadata = await fileService.saveFileMetadata(file, metadata, userId);
    
    expect(savedMetadata).toBeDefined();
    expect(savedMetadata._id).toBeDefined();
    expect(savedMetadata.originalName).toBe(file.originalname);
    expect(savedMetadata.fileName).toBe(file.filename);
    expect(savedMetadata.mimeType).toBe(file.mimetype);
    expect(savedMetadata.size).toBe(file.size);
    expect(savedMetadata.path).toBe(file.path);
    expect(savedMetadata.uploadedBy.toString()).toBe(userId.toString());
    expect(savedMetadata.checksum).toBeDefined();
    expect(savedMetadata.metadata).toEqual(metadata);
    expect(savedMetadata.status).toBe('uploaded');
  });

  test('should get file metadata by fileId', async () => {
    const foundMetadata = await fileService.getFileMetadata('file_test_12345');
    
    expect(foundMetadata).toBeDefined();
    expect(foundMetadata._id.toString()).toBe(fileMetadata._id.toString());
    expect(foundMetadata.originalName).toBe(fileMetadata.originalName);
  });

  test('should get file by fileId', async () => {
    const result = await fileService.getFile('file_test_12345');
    
    expect(result).toBeDefined();
    expect(result.fileStream).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata._id.toString()).toBe(fileMetadata._id.toString());
  });

  test('should delete file successfully', async () => {
    const result = await fileService.deleteFile('file_test_12345');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Verify fs.unlinkSync was called
    expect(fs.unlinkSync).toHaveBeenCalledWith(fileMetadata.path);
    
    // Verify file metadata was deleted
    const deletedMetadata = await FileMetadata.findById(fileMetadata._id);
    expect(deletedMetadata).toBeNull();
  });

  test('should list files with pagination', async () => {
    // Create additional test files
    for (let i = 0; i < 5; i++) {
      const file = new FileMetadata({
        originalName: `test_file_${i}.csv`,
        fileName: `file_test_${i}.csv`,
        fileId: `file_test_${i}`,
        mimeType: 'text/csv',
        size: 1024,
        path: `/tmp/test_file_${i}.csv`,
        uploadedBy: userId,
        status: 'uploaded',
        checksum: `sha256_${i}`
      });
      await file.save();
    }
    
    // Test listing with default pagination
    const result = await fileService.listFiles({ userId });
    
    expect(result).toBeDefined();
    expect(result.files).toBeDefined();
    expect(Array.isArray(result.files)).toBe(true);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.total).toBeGreaterThan(0);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    
    // Test listing with custom pagination
    const customResult = await fileService.listFiles({ 
      userId, 
      page: 2, 
      limit: 2 
    });
    
    expect(customResult).toBeDefined();
    expect(customResult.pagination.page).toBe(2);
    expect(customResult.pagination.limit).toBe(2);
  });

  test('should list files with status filter', async () => {
    // Create a file with different status
    const verifiedFile = new FileMetadata({
      originalName: 'verified_file.csv',
      fileName: 'file_verified.csv',
      fileId: 'file_verified',
      mimeType: 'text/csv',
      size: 1024,
      path: '/tmp/verified_file.csv',
      uploadedBy: userId,
      status: 'verified',
      checksum: 'sha256_verified'
    });
    await verifiedFile.save();
    
    // Test listing with status filter
    const result = await fileService.listFiles({ status: 'verified' });
    
    expect(result).toBeDefined();
    expect(result.files).toBeDefined();
    expect(result.files.length).toBe(1);
    expect(result.files[0].fileId).toBe('file_verified');
  });

  test('should throw error when getting non-existent file metadata', async () => {
    await expect(
      fileService.getFileMetadata('non_existent_file')
    ).rejects.toThrow('File with ID non_existent_file not found');
  });

  test('should throw error when getting non-existent file', async () => {
    await expect(
      fileService.getFile('non_existent_file')
    ).rejects.toThrow('File with ID non_existent_file not found');
  });

  test('should throw error when deleting non-existent file', async () => {
    await expect(
      fileService.deleteFile('non_existent_file')
    ).rejects.toThrow('File with ID non_existent_file not found');
  });

  test('should throw error when file does not exist on filesystem', async () => {
    // Mock fs.existsSync to return false
    fs.existsSync.mockReturnValueOnce(false);
    
    await expect(
      fileService.getFile('file_test_12345')
    ).rejects.toThrow(`File not found at path: ${fileMetadata.path}`);
  });
});
