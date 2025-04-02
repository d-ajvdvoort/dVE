const mongoose = require('mongoose');
const { User } = require('../../models');
const bcrypt = require('bcryptjs');

describe('User Model Tests', () => {
  let userId;

  beforeEach(async () => {
    // Create a test user before each test
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 10),
      role: 'user',
      organization: 'Test Org'
    };

    const user = new User(userData);
    await user.save();
    userId = user._id;
  });

  test('should create a new user successfully', async () => {
    const userData = {
      username: 'newuser',
      email: 'new@example.com',
      password: await bcrypt.hash('newpassword', 10),
      role: 'verifier',
      organization: 'New Org'
    };

    const newUser = new User(userData);
    const savedUser = await newUser.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe(userData.username);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.role).toBe(userData.role);
    expect(savedUser.organization).toBe(userData.organization);
    expect(savedUser.isActive).toBe(true);
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  test('should retrieve a user by id', async () => {
    const foundUser = await User.findById(userId);
    
    expect(foundUser).toBeDefined();
    expect(foundUser.username).toBe('testuser');
    expect(foundUser.email).toBe('test@example.com');
  });

  test('should update a user successfully', async () => {
    const updatedData = {
      organization: 'Updated Org',
      role: 'admin'
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updatedData,
      { new: true }
    );
    
    expect(updatedUser.organization).toBe(updatedData.organization);
    expect(updatedUser.role).toBe(updatedData.role);
  });

  test('should delete a user successfully', async () => {
    await User.findByIdAndDelete(userId);
    const deletedUser = await User.findById(userId);
    
    expect(deletedUser).toBeNull();
  });

  test('should not create a user with duplicate email', async () => {
    const duplicateUser = new User({
      username: 'duplicate',
      email: 'test@example.com', // Same email as test user
      password: 'password456',
      role: 'user',
      organization: 'Duplicate Org'
    });

    await expect(duplicateUser.save()).rejects.toThrow();
  });

  test('should not create a user with duplicate username', async () => {
    const duplicateUser = new User({
      username: 'testuser', // Same username as test user
      email: 'another@example.com',
      password: 'password456',
      role: 'user',
      organization: 'Duplicate Org'
    });

    await expect(duplicateUser.save()).rejects.toThrow();
  });

  test('should not create a user with invalid email', async () => {
    const invalidUser = new User({
      username: 'invalid',
      email: 'invalid-email',
      password: 'password456',
      role: 'user',
      organization: 'Invalid Org'
    });

    await expect(invalidUser.save()).rejects.toThrow();
  });

  test('should not create a user with invalid role', async () => {
    const invalidUser = new User({
      username: 'invalid',
      email: 'invalid@example.com',
      password: 'password456',
      role: 'invalid-role',
      organization: 'Invalid Org'
    });

    await expect(invalidUser.save()).rejects.toThrow();
  });
});
