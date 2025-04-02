const fileController = require('../../controllers/fileController');
const fileService = require('../../services/fileService');
const { FileMetadata } = require('../../models');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../../services/fileService');

// Mock request and response
const mockRequest = () => {
  const req = {};
  req.body = {};
  req.params = {};
  req.query = {};
  req.user = { id: new mongoose.Types.ObjectId() };
  req.file = null;
  return req;
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  res.download = jest.fn().mockReturnThis();
  return res;
};

describe('File Controller Tests', () => {
  let req, res;
  
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });
  
  describe('uploadFile', () => {
    test('should upload file successfully', async () => {
      // Setup
      req.file = {
        originalname: 'test_file.csv',
        filename: 'file_test_12345.csv',
        mimetype: 'text/csv',
        size: 1024,
        path: '/tmp/test_file.csv'
      };
      
      req.body.metadata = JSON.stringify({
        contractId: 'contract_123',
        originator: 'Test Company'
      });
      
      // Mock fileService.saveFileMetadata
      const mockFileMetadata = {
        _id: new mongoose.Types.ObjectId(),
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileId: 'file_test_12345',
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: req.user.id,
        status: 'uploaded'
      };
      
      fileService.saveFileMetadata.mockResolvedValue(mockFileMetadata);
      
      // Execute
      await fileController.uploadFile(req, res);
      
      // Assert
      expect(fileService.saveFileMetadata).toHaveBeenCalledWith(
        req.file,
        JSON.parse(req.body.metadata),
        req.user.id
      );
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        file: expect.objectContaining({
          fileId: 'file_test_12345'
        })
      }));
    });
    
    test('should return error if no file is uploaded', async () => {
      // Setup - no file
      req.file = null;
      
      // Execute
      await fileController.uploadFile(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'No file uploaded'
      }));
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.file = {
        originalname: 'test_file.csv',
        filename: 'file_test_12345.csv',
        mimetype: 'text/csv',
        size: 1024,
        path: '/tmp/test_file.csv'
      };
      
      req.body.metadata = JSON.stringify({
        contractId: 'contract_123',
        originator: 'Test Company'
      });
      
      // Mock fileService.saveFileMetadata to throw error
      fileService.saveFileMetadata.mockRejectedValue(new Error('Database error'));
      
      // Execute
      await fileController.uploadFile(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error'
      }));
    });
  });
  
  describe('getFile', () => {
    test('should get file successfully', async () => {
      // Setup
      req.params.fileId = 'file_test_12345';
      
      // Mock fileService.getFile
      const mockFileStream = { pipe: jest.fn() };
      const mockMetadata = {
        _id: new mongoose.Types.ObjectId(),
        originalName: 'test_file.csv',
        fileName: 'file_test_12345.csv',
        fileId: 'file_test_12345',
        mimeType: 'text/csv'
      };
      
      fileService.getFile.mockResolvedValue({
        fileStream: mockFileStream,
        metadata: mockMetadata
      });
      
      // Execute
      await fileController.getFile(req, res);
      
      // Assert
      expect(fileService.getFile).toHaveBeenCalledWith(req.params.fileId);
      expect(res.download).toHaveBeenCalledWith(
        expect.any(String),
        mockMetadata.originalName
      );
    });
    
    test('should return error if file not found', async () => {
      // Setup
      req.params.fileId = 'non_existent_file';
      
      // Mock fileService.getFile to throw error
      fileService.getFile.mockRejectedValue(new Error('File not found'));
      
      // Execute
      await fileController.getFile(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'File not found'
      }));
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.params.fileId = 'file_test_12345';
      
      // Mock fileService.getFile to throw error
      fileService.getFile.mockRejectedValue(new Error('Server error'));
      
      // Execute
      await fileController.getFile(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error'
      }));
    });
  });
  
  describe('getFileMetadata', () => {
    test('should get file metadata successfully', async () => {
      // Setup
      req.params.fileId = 'file_test_12345';
      
      // Mock fileService.getFileMetadata
      const mockMetadata = {
        _id: new mongoose.Types.ObjectId(),
        originalName: 'test_file.csv',
        fileName: 'file_test_12345.csv',
        fileId: 'file_test_12345',
        mimeType: 'text/csv',
        size: 1024,
        uploadedBy: req.user.id,
        status: 'uploaded'
      };
      
      fileService.getFileMetadata.mockResolvedValue(mockMetadata);
      
      // Execute
      await fileController.getFileMetadata(req, res);
      
      // Assert
      expect(fileService.getFileMetadata).toHaveBeenCalledWith(req.params.fileId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        file: expect.objectContaining({
          fileId: 'file_test_12345'
        })
      }));
    });
    
    test('should return error if file not found', async () => {
      // Setup
      req.params.fileId = 'non_existent_file';
      
      // Mock fileService.getFileMetadata to throw error
      fileService.getFileMetadata.mockRejectedValue(new Error('File not found'));
      
      // Execute
      await fileController.getFileMetadata(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'File not found'
      }));
    });
  });
  
  describe('deleteFile', () => {
    test('should delete file successfully', async () => {
      // Setup
      req.params.fileId = 'file_test_12345';
      
      // Mock fileService.deleteFile
      fileService.deleteFile.mockResolvedValue({
        success: true,
        message: 'File deleted successfully'
      });
      
      // Execute
      await fileController.deleteFile(req, res);
      
      // Assert
      expect(fileService.deleteFile).toHaveBeenCalledWith(req.params.fileId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'File deleted successfully'
      }));
    });
    
    test('should return error if file not found', async () => {
      // Setup
      req.params.fileId = 'non_existent_file';
      
      // Mock fileService.deleteFile to throw error
      fileService.deleteFile.mockRejectedValue(new Error('File not found'));
      
      // Execute
      await fileController.deleteFile(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'File not found'
      }));
    });
  });
  
  describe('listFiles', () => {
    test('should list files successfully', async () => {
      // Setup
      req.query = {
        page: '1',
        limit: '10',
        status: 'uploaded'
      };
      
      // Mock fileService.listFiles
      const mockFiles = [
        {
          _id: new mongoose.Types.ObjectId(),
          originalName: 'test_file_1.csv',
          fileId: 'file_test_1',
          status: 'uploaded'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          originalName: 'test_file_2.csv',
          fileId: 'file_test_2',
          status: 'uploaded'
        }
      ];
      
      fileService.listFiles.mockResolvedValue({
        files: mockFiles,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
      
      // Execute
      await fileController.listFiles(req, res);
      
      // Assert
      expect(fileService.listFiles).toHaveBeenCalledWith({
        userId: req.user.id,
        status: req.query.status,
        page: parseInt(req.query.page),
        limit: parseInt(req.query.limit)
      });
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        files: expect.arrayContaining([
          expect.objectContaining({ fileId: 'file_test_1' }),
          expect.objectContaining({ fileId: 'file_test_2' })
        ]),
        pagination: expect.objectContaining({
          total: 2,
          page: 1
        })
      }));
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.query = {
        page: '1',
        limit: '10'
      };
      
      // Mock fileService.listFiles to throw error
      fileService.listFiles.mockRejectedValue(new Error('Database error'));
      
      // Execute
      await fileController.listFiles(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error'
      }));
    });
  });
});
