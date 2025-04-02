/**
 * Validation Service
 * Provides validation functionality for the dVeracity Verification Engine
 */
const { ValidationRule, ReferenceData } = require('../models');

class ValidationService {
  /**
   * Load validation rules for a schema
   * @param {string} schemaId - ID of the schema
   * @returns {Promise<Array>} - Validation rules
   */
  async loadValidationRules(schemaId) {
    try {
      const rules = await ValidationRule.find({
        schemaId,
        active: true
      }).sort({ severity: 1 });
      
      return rules;
    } catch (error) {
      console.error('Failed to load validation rules:', error);
      throw error;
    }
  }

  /**
   * Create a new validation rule
   * @param {Object} ruleData - Rule data
   * @returns {Promise<Object>} - Created rule
   */
  async createValidationRule(ruleData) {
    try {
      const rule = new ValidationRule(ruleData);
      await rule.save();
      return rule;
    } catch (error) {
      console.error('Failed to create validation rule:', error);
      throw error;
    }
  }

  /**
   * Update a validation rule
   * @param {string} ruleId - ID of the rule to update
   * @param {Object} updateData - Updated rule data
   * @returns {Promise<Object>} - Updated rule
   */
  async updateValidationRule(ruleId, updateData) {
    try {
      const rule = await ValidationRule.findByIdAndUpdate(
        ruleId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
      
      if (!rule) {
        throw new Error(`Validation rule with ID ${ruleId} not found`);
      }
      
      return rule;
    } catch (error) {
      console.error('Failed to update validation rule:', error);
      throw error;
    }
  }

  /**
   * Delete a validation rule
   * @param {string} ruleId - ID of the rule to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteValidationRule(ruleId) {
    try {
      const result = await ValidationRule.findByIdAndDelete(ruleId);
      
      if (!result) {
        throw new Error(`Validation rule with ID ${ruleId} not found`);
      }
      
      return { success: true, message: 'Validation rule deleted successfully' };
    } catch (error) {
      console.error('Failed to delete validation rule:', error);
      throw error;
    }
  }

  /**
   * Load reference data for validation
   * @param {string} type - Type of reference data
   * @param {string} code - Code of reference data (optional)
   * @returns {Promise<Array|Object>} - Reference data
   */
  async loadReferenceData(type, code = null) {
    try {
      const query = { type, active: true };
      
      if (code) {
        query.code = code;
        return await ReferenceData.findOne(query);
      }
      
      return await ReferenceData.find(query);
    } catch (error) {
      console.error('Failed to load reference data:', error);
      throw error;
    }
  }

  /**
   * Create reference data
   * @param {Object} referenceData - Reference data
   * @returns {Promise<Object>} - Created reference data
   */
  async createReferenceData(referenceData) {
    try {
      const data = new ReferenceData(referenceData);
      await data.save();
      return data;
    } catch (error) {
      console.error('Failed to create reference data:', error);
      throw error;
    }
  }

  /**
   * Update reference data
   * @param {string} id - ID of the reference data to update
   * @param {Object} updateData - Updated reference data
   * @returns {Promise<Object>} - Updated reference data
   */
  async updateReferenceData(id, updateData) {
    try {
      const data = await ReferenceData.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
      
      if (!data) {
        throw new Error(`Reference data with ID ${id} not found`);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to update reference data:', error);
      throw error;
    }
  }

  /**
   * Delete reference data
   * @param {string} id - ID of the reference data to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteReferenceData(id) {
    try {
      const result = await ReferenceData.findByIdAndDelete(id);
      
      if (!result) {
        throw new Error(`Reference data with ID ${id} not found`);
      }
      
      return { success: true, message: 'Reference data deleted successfully' };
    } catch (error) {
      console.error('Failed to delete reference data:', error);
      throw error;
    }
  }

  /**
   * Validate a value against a rule
   * @param {Object} rule - Validation rule
   * @param {*} value - Value to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateValue(rule, value) {
    try {
      let isValid = false;
      let message = '';
      
      switch (rule.ruleType) {
        case 'dataType':
          isValid = this._validateDataType(value, rule.parameters);
          message = isValid ? 'Data type validation passed' : `Expected ${rule.parameters.get('type')}, got ${typeof value}`;
          break;
          
        case 'range':
          isValid = this._validateRange(value, rule.parameters);
          message = isValid ? 'Range validation passed' : `Value outside allowed range [${rule.parameters.get('min')}, ${rule.parameters.get('max')}]`;
          break;
          
        case 'required':
          isValid = this._validateRequired(value);
          message = isValid ? 'Required field validation passed' : 'Required field is missing or empty';
          break;
          
        case 'uniqueness':
          // Uniqueness validation requires context of all values, not implemented here
          isValid = true;
          message = 'Uniqueness validation not implemented for single value';
          break;
          
        case 'pattern':
          isValid = this._validatePattern(value, rule.parameters);
          message = isValid ? 'Pattern validation passed' : `Value does not match pattern ${rule.parameters.get('pattern')}`;
          break;
          
        case 'reference':
          isValid = await this._validateReference(value, rule.parameters);
          message = isValid ? 'Reference validation passed' : `Value not found in reference data of type ${rule.parameters.get('referenceType')}`;
          break;
          
        case 'custom':
          // Custom validation requires specific implementation
          isValid = true;
          message = 'Custom validation not implemented for single value';
          break;
          
        default:
          throw new Error(`Unknown rule type: ${rule.ruleType}`);
      }
      
      return {
        isValid,
        message: isValid ? message : (rule.message || message)
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        message: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate data type
   * @private
   * @param {*} value - Value to validate
   * @param {Map} parameters - Validation parameters
   * @returns {boolean} - Validation result
   */
  _validateDataType(value, parameters) {
    const expectedType = parameters.get('type');
    
    if (!expectedType) {
      return false;
    }
    
    switch (expectedType.toLowerCase()) {
      case 'string':
        return typeof value === 'string';
        
      case 'number':
        return typeof value === 'number' && !isNaN(value);
        
      case 'integer':
        return Number.isInteger(value);
        
      case 'boolean':
        return typeof value === 'boolean';
        
      case 'date':
        return value instanceof Date && !isNaN(value) || 
               (typeof value === 'string' && !isNaN(Date.parse(value)));
        
      case 'array':
        return Array.isArray(value);
        
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
        
      default:
        return false;
    }
  }

  /**
   * Validate range
   * @private
   * @param {*} value - Value to validate
   * @param {Map} parameters - Validation parameters
   * @returns {boolean} - Validation result
   */
  _validateRange(value, parameters) {
    const min = parameters.get('min');
    const max = parameters.get('max');
    
    if (typeof value !== 'number') {
      return false;
    }
    
    if (min !== undefined && value < min) {
      return false;
    }
    
    if (max !== undefined && value > max) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate required
   * @private
   * @param {*} value - Value to validate
   * @returns {boolean} - Validation result
   */
  _validateRequired(value) {
    if (value === undefined || value === null) {
      return false;
    }
    
    if (typeof value === 'string' && value.trim() === '') {
      return false;
    }
    
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Validate pattern
   * @private
   * @param {*} value - Value to validate
   * @param {Map} parameters - Validation parameters
   * @returns {boolean} - Validation result
   */
  _validatePattern(value, parameters) {
    const pattern = parameters.get('pattern');
    
    if (!pattern || typeof value !== 'string') {
      return false;
    }
    
    try {
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      return false;
    }
  }

  /**
   * Validate reference
   * @private
   * @param {*} value - Value to validate
   * @param {Map} parameters - Validation parameters
   * @returns {Promise<boolean>} - Validation result
   */
  async _validateReference(value, parameters) {
    const referenceType = parameters.get('referenceType');
    
    if (!referenceType || !value) {
      return false;
    }
    
    try {
      const referenceData = await this.loadReferenceData(referenceType, value);
      return !!referenceData;
    } catch (error) {
      console.error('Reference validation error:', error);
      return false;
    }
  }
}

module.exports = new ValidationService();
