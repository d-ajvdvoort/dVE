const mongoose = require('mongoose');
const { ValidationRule } = require('../../models');

describe('ValidationRule Model Tests', () => {
  let ruleId;
  const userId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    // Create a test validation rule before each test
    const ruleData = {
      name: 'Test Required Rule',
      description: 'Test rule for required fields',
      ruleType: 'required',
      targetField: 'testField',
      parameters: new Map([
        ['param1', 'value1'],
        ['param2', 'value2']
      ]),
      severity: 'error',
      message: 'Field is required',
      active: true,
      schemaId: 'EmissionData',
      createdBy: userId
    };

    const rule = new ValidationRule(ruleData);
    await rule.save();
    ruleId = rule._id;
  });

  test('should create a new validation rule successfully', async () => {
    const ruleData = {
      name: 'Test Range Rule',
      description: 'Test rule for value ranges',
      ruleType: 'range',
      targetField: 'numericField',
      parameters: new Map([
        ['min', 0],
        ['max', 100]
      ]),
      severity: 'warning',
      message: 'Value must be between 0 and 100',
      active: true,
      schemaId: 'ActivityData',
      createdBy: userId
    };

    const newRule = new ValidationRule(ruleData);
    const savedRule = await newRule.save();
    
    expect(savedRule._id).toBeDefined();
    expect(savedRule.name).toBe(ruleData.name);
    expect(savedRule.description).toBe(ruleData.description);
    expect(savedRule.ruleType).toBe(ruleData.ruleType);
    expect(savedRule.targetField).toBe(ruleData.targetField);
    expect(savedRule.parameters.get('min')).toBe(0);
    expect(savedRule.parameters.get('max')).toBe(100);
    expect(savedRule.severity).toBe(ruleData.severity);
    expect(savedRule.message).toBe(ruleData.message);
    expect(savedRule.active).toBe(ruleData.active);
    expect(savedRule.schemaId).toBe(ruleData.schemaId);
    expect(savedRule.createdBy.toString()).toBe(userId.toString());
    expect(savedRule.createdAt).toBeDefined();
    expect(savedRule.updatedAt).toBeDefined();
  });

  test('should retrieve a validation rule by id', async () => {
    const foundRule = await ValidationRule.findById(ruleId);
    
    expect(foundRule).toBeDefined();
    expect(foundRule.name).toBe('Test Required Rule');
    expect(foundRule.ruleType).toBe('required');
  });

  test('should update a validation rule successfully', async () => {
    const updatedData = {
      description: 'Updated description',
      message: 'Updated error message',
      active: false
    };

    const updatedRule = await ValidationRule.findByIdAndUpdate(
      ruleId,
      updatedData,
      { new: true }
    );
    
    expect(updatedRule.description).toBe(updatedData.description);
    expect(updatedRule.message).toBe(updatedData.message);
    expect(updatedRule.active).toBe(updatedData.active);
  });

  test('should delete a validation rule successfully', async () => {
    await ValidationRule.findByIdAndDelete(ruleId);
    const deletedRule = await ValidationRule.findById(ruleId);
    
    expect(deletedRule).toBeNull();
  });

  test('should not create a validation rule with invalid rule type', async () => {
    const invalidRule = new ValidationRule({
      name: 'Invalid Rule',
      description: 'Rule with invalid type',
      ruleType: 'invalid-type', // Invalid rule type
      targetField: 'testField',
      severity: 'error',
      message: 'Invalid rule type',
      active: true,
      schemaId: 'EmissionData',
      createdBy: userId
    });

    await expect(invalidRule.save()).rejects.toThrow();
  });

  test('should not create a validation rule with invalid severity', async () => {
    const invalidRule = new ValidationRule({
      name: 'Invalid Severity Rule',
      description: 'Rule with invalid severity',
      ruleType: 'required',
      targetField: 'testField',
      severity: 'invalid-severity', // Invalid severity
      message: 'Invalid severity',
      active: true,
      schemaId: 'EmissionData',
      createdBy: userId
    });

    await expect(invalidRule.save()).rejects.toThrow();
  });

  test('should not create a validation rule with invalid schema ID', async () => {
    const invalidRule = new ValidationRule({
      name: 'Invalid Schema Rule',
      description: 'Rule with invalid schema ID',
      ruleType: 'required',
      targetField: 'testField',
      severity: 'error',
      message: 'Invalid schema ID',
      active: true,
      schemaId: 'InvalidSchema', // Invalid schema ID
      createdBy: userId
    });

    await expect(invalidRule.save()).rejects.toThrow();
  });

  test('should create a validation rule with pattern type', async () => {
    const patternRule = new ValidationRule({
      name: 'Email Pattern Rule',
      description: 'Rule for email pattern validation',
      ruleType: 'pattern',
      targetField: 'email',
      parameters: new Map([
        ['pattern', '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$']
      ]),
      severity: 'error',
      message: 'Invalid email format',
      active: true,
      schemaId: 'EmissionData',
      createdBy: userId
    });

    const savedRule = await patternRule.save();
    
    expect(savedRule._id).toBeDefined();
    expect(savedRule.ruleType).toBe('pattern');
    expect(savedRule.parameters.get('pattern')).toBe('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
  });
});
