const mongoose = require('mongoose');
const { FileMetadata } = require('../../models');

describe('FileMetadata Model Tests', () => {
  let fileId;
  const userId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    // Create a test file metadata before each test
    const fileData = {
      originalName: 'test_file.csv',
      fileName: 'file_12345.csv',
      fileId: 'file_12345',
      mimeType: 'text/csv',
      size: 1024,
      path: '/tmp/test_file.csv',
      uploadedBy: userId,
      status: 'uploaded',
      checksum: 'sha256_abcdef1234567890',
      metadata: {
        contractId: 'contract_123',
        originator: 'Test Company',
        dataType: 'First Party Data',
        securityClassification: 'Private'
      }
    };

    const file = new FileMetadata(fileData);
    await file.save();
    fileId = file._id;
  });

  test('should create a new file metadata successfully', async () => {
    const fileData = {
      originalName: 'new_file.csv',
      fileName: 'file_67890.csv',
      fileId: 'file_67890',
      mimeType: 'text/csv',
      size: 2048,
      path: '/tmp/new_file.csv',
      uploadedBy: userId,
      status: 'uploaded',
      checksum: 'sha256_67890abcdef',
      metadata: {
        contractId: 'contract_456',
        originator: 'New Company',
        dataType: 'Second Party Data',
        securityClassification: 'Private'
      }
    };

    const newFile = new FileMetadata(fileData);
    const savedFile = await newFile.save();
    
    expect(savedFile._id).toBeDefined();
    expect(savedFile.originalName).toBe(fileData.originalName);
    expect(savedFile.fileName).toBe(fileData.fileName);
    expect(savedFile.fileId).toBe(fileData.fileId);
    expect(savedFile.mimeType).toBe(fileData.mimeType);
    expect(savedFile.size).toBe(fileData.size);
    expect(savedFile.path).toBe(fileData.path);
    expect(savedFile.uploadedBy.toString()).toBe(userId.toString());
    expect(savedFile.status).toBe(fileData.status);
    expect(savedFile.checksum).toBe(fileData.checksum);
    expect(savedFile.metadata.contractId).toBe(fileData.metadata.contractId);
    expect(savedFile.createdAt).toBeDefined();
    expect(savedFile.updatedAt).toBeDefined();
  });

  test('should retrieve a file metadata by id', async () => {
    const foundFile = await FileMetadata.findById(fileId);
    
    expect(foundFile).toBeDefined();
    expect(foundFile.originalName).toBe('test_file.csv');
    expect(foundFile.fileId).toBe('file_12345');
  });

  test('should update a file metadata successfully', async () => {
    const updatedData = {
      status: 'mapped',
      metadata: {
        contractId: 'contract_123',
        originator: 'Updated Company',
        dataType: 'First Party Data',
        securityClassification: 'Private'
      }
    };

    const updatedFile = await FileMetadata.findByIdAndUpdate(
      fileId,
      updatedData,
      { new: true }
    );
    
    expect(updatedFile.status).toBe(updatedData.status);
    expect(updatedFile.metadata.originator).toBe(updatedData.metadata.originator);
  });

  test('should delete a file metadata successfully', async () => {
    await FileMetadata.findByIdAndDelete(fileId);
    const deletedFile = await FileMetadata.findById(fileId);
    
    expect(deletedFile).toBeNull();
  });

  test('should not create a file metadata with duplicate fileId', async () => {
    const duplicateFile = new FileMetadata({
      originalName: 'duplicate_file.csv',
      fileName: 'file_duplicate.csv',
      fileId: 'file_12345', // Same fileId as test file
      mimeType: 'text/csv',
      size: 3072,
      path: '/tmp/duplicate_file.csv',
      uploadedBy: userId,
      status: 'uploaded',
      checksum: 'sha256_duplicate'
    });

    await expect(duplicateFile.save()).rejects.toThrow();
  });

  test('should not create a file metadata with invalid status', async () => {
    const invalidFile = new FileMetadata({
      originalName: 'invalid_file.csv',
      fileName: 'file_invalid.csv',
      fileId: 'file_invalid',
      mimeType: 'text/csv',
      size: 4096,
      path: '/tmp/invalid_file.csv',
      uploadedBy: userId,
      status: 'invalid-status', // Invalid status
      checksum: 'sha256_invalid'
    });

    await expect(invalidFile.save()).rejects.toThrow();
  });

  test('should update validation results successfully', async () => {
    const validationResults = {
      isValid: true,
      timestamp: new Date(),
      errors: [],
      warnings: ['Minor warning']
    };

    const updatedFile = await FileMetadata.findByIdAndUpdate(
      fileId,
      { validationResults },
      { new: true }
    );
    
    expect(updatedFile.validationResults.isValid).toBe(validationResults.isValid);
    expect(updatedFile.validationResults.errors.length).toBe(0);
    expect(updatedFile.validationResults.warnings.length).toBe(1);
    expect(updatedFile.validationResults.warnings[0]).toBe('Minor warning');
  });
});
