const dataMappingService = require('../../services/dataMappingService');
const { Mapping, FileMetadata } = require('../../models');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  createReadStream: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true)
}));

// Mock csv-parser
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    const stream = {
      on: jest.fn().mockImplementation(function(event, callback) {
        if (event === 'headers') {
          callback(['id', 'type', 'value', 'unit', 'date']);
        } else if (event === 'data') {
          callback({
            id: '001',
            type: 'CO2',
            value: '100',
            unit: 'kg',
            date: '2023-01-01'
          });
        } else if (event === 'end') {
          callback();
        }
        return this;
      })
    };
    return stream;
  });
});

describe('Data Mapping Service Tests', () => {
  const userId = new mongoose.Types.ObjectId();
  let fileMetadata;
  let mapping;

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

    // Create test mapping
    mapping = new Mapping({
      fileId: fileMetadata._id,
      schemaId: 'EmissionData',
      columnMappings: new Map([
        ['emissionId', 'id'],
        ['emissionType', 'type'],
        ['emissionValue', 'value'],
        ['emissionUnit', 'unit'],
        ['reportingDate', 'date']
      ]),
      assignedReferences: new Map([
        ['emissionType', 'GHG']
      ]),
      createdBy: userId,
      status: 'draft'
    });
    await mapping.save();

    // Mock fs.createReadStream to return a mock stream
    fs.createReadStream.mockImplementation(() => {
      return {
        pipe: jest.fn().mockReturnValue({
          on: jest.fn().mockImplementation(function(event, callback) {
            if (event === 'headers') {
              callback(['id', 'type', 'value', 'unit', 'date']);
            } else if (event === 'data') {
              callback({
                id: '001',
                type: 'CO2',
                value: '100',
                unit: 'kg',
                date: '2023-01-01'
              });
            } else if (event === 'end') {
              callback();
            }
            return this;
          })
        })
      };
    });
  });

  test('should create a new mapping successfully', async () => {
    const mappingData = {
      fileId: fileMetadata._id,
      schemaId: 'ActivityData',
      columnMappings: new Map([
        ['activityId', 'id'],
        ['activityType', 'type'],
        ['activityValue', 'value']
      ]),
      assignedReferences: new Map([
        ['activityType', 'Energy']
      ]),
      createdBy: userId
    };

    const createdMapping = await dataMappingService.createMapping(mappingData);
    
    expect(createdMapping).toBeDefined();
    expect(createdMapping._id).toBeDefined();
    expect(createdMapping.fileId.toString()).toBe(fileMetadata._id.toString());
    expect(createdMapping.schemaId).toBe(mappingData.schemaId);
    expect(createdMapping.status).toBe('draft');
    
    // Verify file metadata was updated
    const updatedFile = await FileMetadata.findById(fileMetadata._id);
    expect(updatedFile.mappingId.toString()).toBe(createdMapping._id.toString());
    expect(updatedFile.status).toBe('mapped');
  });

  test('should get mapping by ID', async () => {
    const foundMapping = await dataMappingService.getMapping(mapping._id);
    
    expect(foundMapping).toBeDefined();
    expect(foundMapping._id.toString()).toBe(mapping._id.toString());
    expect(foundMapping.schemaId).toBe(mapping.schemaId);
  });

  test('should update mapping successfully', async () => {
    const updateData = {
      columnMappings: new Map([
        ['emissionId', 'id'],
        ['emissionType', 'type'],
        ['emissionValue', 'value'],
        ['emissionUnit', 'unit'],
        ['reportingDate', 'date'],
        ['notes', 'notes'] // Added new mapping
      ]),
      status: 'ready'
    };

    const updatedMapping = await dataMappingService.updateMapping(mapping._id, updateData);
    
    expect(updatedMapping).toBeDefined();
    expect(updatedMapping.columnMappings.size).toBe(6); // One more than before
    expect(updatedMapping.status).toBe(updateData.status);
  });

  test('should delete mapping successfully', async () => {
    const result = await dataMappingService.deleteMapping(mapping._id);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Verify mapping was deleted
    const deletedMapping = await Mapping.findById(mapping._id);
    expect(deletedMapping).toBeNull();
    
    // Verify file metadata was updated
    const updatedFile = await FileMetadata.findById(fileMetadata._id);
    expect(updatedFile.mappingId).toBeUndefined();
    expect(updatedFile.status).toBe('uploaded');
  });

  test('should apply mapping successfully', async () => {
    const result = await dataMappingService.applyMapping(fileMetadata._id, mapping._id);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.fileId).toBe(fileMetadata._id.toString());
    expect(result.mappingId).toBe(mapping._id.toString());
    
    // Verify mapping status was updated
    const updatedMapping = await Mapping.findById(mapping._id);
    expect(updatedMapping.status).toBe('applied');
    
    // Verify file metadata was updated
    const updatedFile = await FileMetadata.findById(fileMetadata._id);
    expect(updatedFile.status).toBe('mapped');
  });

  test('should get file schema successfully', async () => {
    const schema = await dataMappingService.getFileSchema(fileMetadata._id);
    
    expect(schema).toBeDefined();
    expect(schema.fileId).toBe(fileMetadata._id.toString());
    expect(schema.fileName).toBe(fileMetadata.originalName);
    expect(schema.schema).toBeDefined();
    expect(Array.isArray(schema.schema)).toBe(true);
  });

  test('should get target schemas successfully', async () => {
    const schemas = await dataMappingService.getTargetSchemas();
    
    expect(schemas).toBeDefined();
    expect(Array.isArray(schemas)).toBe(true);
    expect(schemas.length).toBeGreaterThan(0);
    
    // Check first schema structure
    const firstSchema = schemas[0];
    expect(firstSchema.id).toBeDefined();
    expect(firstSchema.name).toBeDefined();
    expect(firstSchema.fields).toBeDefined();
    expect(Array.isArray(firstSchema.fields)).toBe(true);
  });

  test('should throw error when getting non-existent mapping', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    await expect(
      dataMappingService.getMapping(nonExistentId)
    ).rejects.toThrow(`Mapping with ID ${nonExistentId} not found`);
  });

  test('should throw error when updating non-existent mapping', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    await expect(
      dataMappingService.updateMapping(nonExistentId, { status: 'ready' })
    ).rejects.toThrow(`Mapping with ID ${nonExistentId} not found`);
  });

  test('should throw error when applying mapping to wrong file', async () => {
    // Create another file
    const anotherFile = new FileMetadata({
      originalName: 'another_file.csv',
      fileName: 'file_another_12345.csv',
      fileId: 'file_another_12345',
      mimeType: 'text/csv',
      size: 1024,
      path: '/tmp/another_file.csv',
      uploadedBy: userId,
      status: 'uploaded',
      checksum: 'sha256_another'
    });
    await anotherFile.save();
    
    await expect(
      dataMappingService.applyMapping(anotherFile._id, mapping._id)
    ).rejects.toThrow('Mapping is not associated with this file');
  });
});
