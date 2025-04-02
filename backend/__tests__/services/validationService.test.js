const validationService = require('../../services/validationService');
const { ValidationRule, ReferenceData } = require('../../models');
const mongoose = require('mongoose');

describe('Validation Service Tests', () => {
  const userId = new mongoose.Types.ObjectId();
  
  beforeEach(async () => {
    // Create test validation rules
    const rules = [
      {
        name: 'Required Field Rule',
        description: 'Test required field validation',
        ruleType: 'required',
        targetField: 'testField',
        severity: 'error',
        message: 'Field is required',
        active: true,
        schemaId: 'EmissionData',
        createdBy: userId
      },
      {
        name: 'Range Rule',
        description: 'Test range validation',
        ruleType: 'range',
        targetField: 'numericField',
        parameters: new Map([
          ['min', 0],
          ['max', 100]
        ]),
        severity: 'warning',
        message: 'Value must be between 0 and 100',
        active: true,
        schemaId: 'EmissionData',
        createdBy: userId
      },
      {
        name: 'Inactive Rule',
        description: 'This rule is inactive',
        ruleType: 'required',
        targetField: 'inactiveField',
        severity: 'error',
        message: 'This rule should not be loaded',
        active: false,
        schemaId: 'EmissionData',
        createdBy: userId
      }
    ];

    for (const rule of rules) {
      const validationRule = new ValidationRule(rule);
      await validationRule.save();
    }
    
    // Create test reference data
    const referenceData = [
      {
        type: 'emissionFactor',
        code: 'EF001',
        name: 'Electricity - Grid Average',
        description: 'Average emission factor for grid electricity',
        value: 0.5,
        unit: 'kgCO2e/kWh',
        source: 'Test Source',
        active: true,
        createdBy: userId
      },
      {
        type: 'emissionScope',
        code: 'Scope1',
        name: 'Scope 1',
        description: 'Direct emissions',
        active: true,
        createdBy: userId
      }
    ];
    
    for (const data of referenceData) {
      const refData = new ReferenceData(data);
      await refData.save();
    }
  });
  
  test('should load active validation rules for a schema', async () => {
    const rules = await validationService.loadValidationRules('EmissionData');
    
    expect(rules).toBeDefined();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBe(2); // Only active rules
    
    // Check that rules are sorted by severity
    expect(rules[0].severity).toBe('error');
    expect(rules[1].severity).toBe('warning');
  });
  
  test('should create a new validation rule', async () => {
    const newRule = {
      name: 'New Pattern Rule',
      description: 'Test pattern validation',
      ruleType: 'pattern',
      targetField: 'emailField',
      parameters: new Map([
        ['pattern', '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$']
      ]),
      severity: 'error',
      message: 'Invalid email format',
      active: true,
      schemaId: 'EmissionData',
      createdBy: userId
    };
    
    const createdRule = await validationService.createValidationRule(newRule);
    
    expect(createdRule).toBeDefined();
    expect(createdRule._id).toBeDefined();
    expect(createdRule.name).toBe(newRule.name);
    expect(createdRule.ruleType).toBe(newRule.ruleType);
    
    // Verify it was saved to the database
    const foundRule = await ValidationRule.findById(createdRule._id);
    expect(foundRule).toBeDefined();
  });
  
  test('should update a validation rule', async () => {
    // Get an existing rule
    const existingRule = await ValidationRule.findOne({ name: 'Required Field Rule' });
    
    const updateData = {
      description: 'Updated description',
      message: 'Updated error message',
      active: false
    };
    
    const updatedRule = await validationService.updateValidationRule(existingRule._id, updateData);
    
    expect(updatedRule).toBeDefined();
    expect(updatedRule.description).toBe(updateData.description);
    expect(updatedRule.message).toBe(updateData.message);
    expect(updatedRule.active).toBe(updateData.active);
    
    // Verify it was updated in the database
    const foundRule = await ValidationRule.findById(existingRule._id);
    expect(foundRule.description).toBe(updateData.description);
  });
  
  test('should delete a validation rule', async () => {
    // Get an existing rule
    const existingRule = await ValidationRule.findOne({ name: 'Range Rule' });
    
    const result = await validationService.deleteValidationRule(existingRule._id);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    
    // Verify it was deleted from the database
    const foundRule = await ValidationRule.findById(existingRule._id);
    expect(foundRule).toBeNull();
  });
  
  test('should load reference data by type', async () => {
    const referenceData = await validationService.loadReferenceData('emissionFactor');
    
    expect(referenceData).toBeDefined();
    expect(Array.isArray(referenceData)).toBe(true);
    expect(referenceData.length).toBe(1);
    expect(referenceData[0].code).toBe('EF001');
  });
  
  test('should load reference data by type and code', async () => {
    const referenceData = await validationService.loadReferenceData('emissionScope', 'Scope1');
    
    expect(referenceData).toBeDefined();
    expect(referenceData.code).toBe('Scope1');
    expect(referenceData.name).toBe('Scope 1');
  });
  
  test('should validate data type correctly', async () => {
    const rule = {
      ruleType: 'dataType',
      parameters: new Map([
        ['type', 'string']
      ])
    };
    
    const result = await validationService.validateValue(rule, 'test string');
    expect(result.isValid).toBe(true);
    
    const invalidResult = await validationService.validateValue(rule, 123);
    expect(invalidResult.isValid).toBe(false);
  });
  
  test('should validate range correctly', async () => {
    const rule = {
      ruleType: 'range',
      parameters: new Map([
        ['min', 0],
        ['max', 100]
      ])
    };
    
    const result = await validationService.validateValue(rule, 50);
    expect(result.isValid).toBe(true);
    
    const invalidResult1 = await validationService.validateValue(rule, -10);
    expect(invalidResult1.isValid).toBe(false);
    
    const invalidResult2 = await validationService.validateValue(rule, 150);
    expect(invalidResult2.isValid).toBe(false);
  });
  
  test('should validate required correctly', async () => {
    const rule = {
      ruleType: 'required'
    };
    
    const result = await validationService.validateValue(rule, 'test');
    expect(result.isValid).toBe(true);
    
    const invalidResult1 = await validationService.validateValue(rule, '');
    expect(invalidResult1.isValid).toBe(false);
    
    const invalidResult2 = await validationService.validateValue(rule, null);
    expect(invalidResult2.isValid).toBe(false);
  });
  
  test('should validate pattern correctly', async () => {
    const rule = {
      ruleType: 'pattern',
      parameters: new Map([
        ['pattern', '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$']
      ])
    };
    
    const result = await validationService.validateValue(rule, 'test@example.com');
    expect(result.isValid).toBe(true);
    
    const invalidResult = await validationService.validateValue(rule, 'invalid-email');
    expect(invalidResult.isValid).toBe(false);
  });
  
  test('should validate reference correctly', async () => {
    const rule = {
      ruleType: 'reference',
      parameters: new Map([
        ['referenceType', 'emissionScope']
      ])
    };
    
    const result = await validationService.validateValue(rule, 'Scope1');
    expect(result.isValid).toBe(true);
    
    const invalidResult = await validationService.validateValue(rule, 'InvalidScope');
    expect(invalidResult.isValid).toBe(false);
  });
});
