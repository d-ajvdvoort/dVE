const authMiddleware = require('../../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const { User } = require('../../models');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models');

// Mock request and response
const mockRequest = () => {
  const req = {};
  req.header = jest.fn();
  return req;
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

const mockNext = jest.fn();

describe('Auth Middleware Tests', () => {
  let req, res;
  
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });
  
  describe('auth', () => {
    test('should authenticate user successfully', async () => {
      // Setup
      const token = 'valid_token';
      const userId = new mongoose.Types.ObjectId();
      
      req.header.mockReturnValue(`Bearer ${token}`);
      
      // Mock jwt.verify
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: userId });
      });
      
      // Execute
      await authMiddleware.auth(req, res, mockNext);
      
      // Assert
      expect(req.header).toHaveBeenCalledWith('Authorization');
      expect(jwt.verify).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toEqual(userId);
      expect(mockNext).toHaveBeenCalled();
    });
    
    test('should return error if no token is provided', async () => {
      // Setup
      req.header.mockReturnValue(null);
      
      // Execute
      await authMiddleware.auth(req, res, mockNext);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'No token, authorization denied'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should return error if token is invalid', async () => {
      // Setup
      const token = 'invalid_token';
      
      req.header.mockReturnValue(`Bearer ${token}`);
      
      // Mock jwt.verify to throw error
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });
      
      // Execute
      await authMiddleware.auth(req, res, mockNext);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Token is not valid'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should handle token without Bearer prefix', async () => {
      // Setup
      const token = 'valid_token';
      const userId = new mongoose.Types.ObjectId();
      
      req.header.mockReturnValue(token); // No Bearer prefix
      
      // Mock jwt.verify
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { id: userId });
      });
      
      // Execute
      await authMiddleware.auth(req, res, mockNext);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toEqual(userId);
      expect(mockNext).toHaveBeenCalled();
    });
  });
  
  describe('authorize', () => {
    test('should authorize admin user successfully', async () => {
      // Setup
      const roles = ['admin'];
      const middleware = authMiddleware.authorize(roles);
      
      req.user = { id: new mongoose.Types.ObjectId() };
      
      // Mock User.findById
      User.findById.mockResolvedValue({
        _id: req.user.id,
        role: 'admin'
      });
      
      // Execute
      await middleware(req, res, mockNext);
      
      // Assert
      expect(User.findById).toHaveBeenCalledWith(req.user.id);
      expect(mockNext).toHaveBeenCalled();
    });
    
    test('should authorize user with multiple allowed roles', async () => {
      // Setup
      const roles = ['admin', 'verifier'];
      const middleware = authMiddleware.authorize(roles);
      
      req.user = { id: new mongoose.Types.ObjectId() };
      
      // Mock User.findById
      User.findById.mockResolvedValue({
        _id: req.user.id,
        role: 'verifier'
      });
      
      // Execute
      await middleware(req, res, mockNext);
      
      // Assert
      expect(mockNext).toHaveBeenCalled();
    });
    
    test('should return error if user role is not authorized', async () => {
      // Setup
      const roles = ['admin', 'verifier'];
      const middleware = authMiddleware.authorize(roles);
      
      req.user = { id: new mongoose.Types.ObjectId() };
      
      // Mock User.findById
      User.findById.mockResolvedValue({
        _id: req.user.id,
        role: 'user'
      });
      
      // Execute
      await middleware(req, res, mockNext);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Not authorized to access this resource'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should return error if user not found', async () => {
      // Setup
      const roles = ['admin'];
      const middleware = authMiddleware.authorize(roles);
      
      req.user = { id: new mongoose.Types.ObjectId() };
      
      // Mock User.findById
      User.findById.mockResolvedValue(null);
      
      // Execute
      await middleware(req, res, mockNext);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'User not found'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    test('should handle server errors', async () => {
      // Setup
      const roles = ['admin'];
      const middleware = authMiddleware.authorize(roles);
      
      req.user = { id: new mongoose.Types.ObjectId() };
      
      // Mock User.findById to throw error
      User.findById.mockRejectedValue(new Error('Database error'));
      
      // Execute
      await middleware(req, res, mockNext);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error'
      }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
