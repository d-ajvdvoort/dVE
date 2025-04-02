const authController = require('../../controllers/authController');
const { User } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('test_token')
}));

// Mock request and response
const mockRequest = () => {
  const req = {};
  req.body = {};
  return req;
};

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

describe('Auth Controller Tests', () => {
  let req, res;
  
  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
  });
  
  describe('register', () => {
    test('should register a new user successfully', async () => {
      // Setup
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        organization: 'Test Org'
      };
      
      // Mock User.findOne to return null (no existing user)
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Mock User constructor and save method
      const mockUser = {
        _id: new mongoose.Types.ObjectId(),
        username: req.body.username,
        email: req.body.email,
        role: 'user',
        organization: req.body.organization,
        save: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          username: req.body.username,
          email: req.body.email,
          role: 'user',
          organization: req.body.organization
        })
      };
      
      User.prototype.constructor = jest.fn().mockReturnValue(mockUser);
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(req.body.password, 10);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'User registered successfully'
      }));
    });
    
    test('should return error if user already exists', async () => {
      // Setup
      req.body = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        organization: 'Test Org'
      };
      
      // Mock User.findOne to return an existing user
      User.findOne = jest.fn().mockResolvedValue({
        username: 'existinguser',
        email: 'existing@example.com'
      });
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'User already exists'
      }));
    });
    
    test('should return error if required fields are missing', async () => {
      // Setup - missing email
      req.body = {
        username: 'testuser',
        password: 'password123',
        organization: 'Test Org'
      };
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Please provide all required fields'
      }));
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        organization: 'Test Org'
      };
      
      // Mock User.findOne to throw an error
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await authController.register(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error'
      }));
    });
  });
  
  describe('login', () => {
    test('should login user successfully', async () => {
      // Setup
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Mock User.findOne to return a user
      User.findOne = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        username: 'testuser',
        email: req.body.email,
        password: 'hashed_password',
        role: 'user',
        organization: 'Test Org'
      });
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, 'hashed_password');
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        token: 'test_token'
      }));
    });
    
    test('should return error if user not found', async () => {
      // Setup
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };
      
      // Mock User.findOne to return null
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid credentials'
      }));
    });
    
    test('should return error if password is incorrect', async () => {
      // Setup
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      
      // Mock User.findOne to return a user
      User.findOne = jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        username: 'testuser',
        email: req.body.email,
        password: 'hashed_password',
        role: 'user',
        organization: 'Test Org'
      });
      
      // Mock bcrypt.compare to return false
      bcrypt.compare.mockResolvedValueOnce(false);
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, 'hashed_password');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Invalid credentials'
      }));
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      // Mock User.findOne to throw an error
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await authController.login(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error'
      }));
    });
  });
  
  describe('getCurrentUser', () => {
    test('should return current user successfully', async () => {
      // Setup
      req.user = {
        id: new mongoose.Types.ObjectId(),
        role: 'user'
      };
      
      // Mock User.findById to return a user
      User.findById = jest.fn().mockResolvedValue({
        _id: req.user.id,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        organization: 'Test Org'
      });
      
      // Execute
      await authController.getCurrentUser(req, res);
      
      // Assert
      expect(User.findById).toHaveBeenCalledWith(req.user.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        user: expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com'
        })
      }));
    });
    
    test('should return error if user not found', async () => {
      // Setup
      req.user = {
        id: new mongoose.Types.ObjectId(),
        role: 'user'
      };
      
      // Mock User.findById to return null
      User.findById = jest.fn().mockResolvedValue(null);
      
      // Execute
      await authController.getCurrentUser(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'User not found'
      }));
    });
    
    test('should handle server errors', async () => {
      // Setup
      req.user = {
        id: new mongoose.Types.ObjectId(),
        role: 'user'
      };
      
      // Mock User.findById to throw an error
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await authController.getCurrentUser(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: 'Server error'
      }));
    });
  });
});
