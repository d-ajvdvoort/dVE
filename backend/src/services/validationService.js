const ValidationRule = require('../models/ValidationRule');
const FileMetadata = require('../models/FileMetadata');
const fs = require('fs');
const path = require('path');

/**
 * Validation Service
 * Handles validation of data against ruleset library
 */
class ValidationService {
  /**
   * Validate data against rules
   * @param {Array} data - Data to validate
   * @param {Array} rules - Validation rules to apply
   * @returns {Object} - Validation results
   */
  async validateData(data, rules) {
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      fieldResults: {}
    };
    
    // Process each rule
    for (const rule of rules) {
      const validationResult = await this.applyRule(data, rule);
      
      // Aggregate results
      if (validationResult.issues.length > 0) {
        if (rule.severity === 'Error') {
          results.isValid = false;
          results.errors.push(...validationResult.issues);
        } else if (rule.severity === 'Warning') {
          results.warnings.push(...validationResult.issues);
        } else {
          results.info.push(...validationResult.issues);
        }
        
        // Track field-level results
        rule.targetFields.forEach(field => {
          if (!results.fieldResults[field]) {
            results.fieldResults[field] = {
              errors: [],
              warnings: [],
              info: []
            };
          }
          
          if (rule.severity === 'Error') {
            results.fieldResults[field].errors.push(...validationResult.issues);
          } else if (rule.severity === 'Warning') {
            results.fieldResults[field].warnings.push(...validationResult.issues);
          } else {
            results.fieldResults[field].info.push(...validationResult.issues);
          }
        });
      }
    }
    
    return results;
  }
  
  /**
   * Apply a validation rule to data
   * @param {Array} data - Data to validate
   * @param {Object} rule - Validation rule to apply
   * @returns {Object} - Validation result for this rule
   */
  async applyRule(data, rule) {
    const result = {
      ruleId: rule._id,
      ruleName: rule.name,
      ruleType: rule.type,
      issues: []
    };
    
    try {
      switch (rule.type) {
        case 'DataType':
          this.validateDataType(data, rule, result);
          break;
        case 'Completeness':
          this.validateCompleteness(data, rule, result);
          break;
        case 'FieldLength':
          this.validateFieldLength(data, rule, result);
          break;
        case 'AllowedValue':
          this.validateAllowedValue(data, rule, result);
          break;
        case 'Format':
          this.validateFormat(data, rule, result);
          break;
        case 'Timestamp':
          this.validateTimestamp(data, rule, result);
          break;
        case 'Uniqueness':
          this.validateUniqueness(data, rule, result);
          break;
        case 'ReferentialIntegrity':
          await this.validateReferentialIntegrity(data, rule, result);
          break;
        case 'Custom':
          await this.executeCustomValidation(data, rule, result);
          break;
        default:
          result.issues.push(`Unknown rule type: ${rule.type}`);
      }
    } catch (error) {
      console.error(`Error applying rule ${rule.name}:`, error);
      result.issues.push(`Error applying rule: ${error.message}`);
    }
    
    return result;
  }
  
  /**
   * Validate data types
   */
  validateDataType(data, rule, result) {
    const { targetFields, configuration } = rule;
    const expectedTypes = configuration.get('expectedTypes') || {};
    
    data.forEach((row, index) => {
      targetFields.forEach(field => {
        if (row[field] !== undefined) {
          const value = row[field];
          const expectedType = expectedTypes[field];
          
          if (expectedType) {
            let isValid = true;
            
            switch (expectedType) {
              case 'number':
                isValid = !isNaN(Number(value));
                break;
              case 'integer':
                isValid = Number.isInteger(Number(value));
                break;
              case 'string':
                isValid = typeof value === 'string';
                break;
              case 'boolean':
                isValid = typeof value === 'boolean' || value === 'true' || value === 'false';
                break;
              case 'date':
                isValid = !isNaN(Date.parse(value));
                break;
            }
            
            if (!isValid) {
              result.issues.push(`Row ${index + 1}: Field '${field}' has invalid type. Expected ${expectedType}, got ${typeof value}`);
            }
          }
        }
      });
    });
  }
  
  /**
   * Validate completeness (required fields)
   */
  validateCompleteness(data, rule, result) {
    const { targetFields } = rule;
    
    data.forEach((row, index) => {
      targetFields.forEach(field => {
        if (row[field] === undefined || row[field] === null || row[field] === '') {
          result.issues.push(`Row ${index + 1}: Required field '${field}' is missing or empty`);
        }
      });
    });
  }
  
  /**
   * Validate field length
   */
  validateFieldLength(data, rule, result) {
    const { targetFields, configuration } = rule;
    const minLengths = configuration.get('minLengths') || {};
    const maxLengths = configuration.get('maxLengths') || {};
    
    data.forEach((row, index) => {
      targetFields.forEach(field => {
        if (row[field] !== undefined && typeof row[field] === 'string') {
          const value = row[field];
          const minLength = minLengths[field];
          const maxLength = maxLengths[field];
          
          if (minLength !== undefined && value.length < minLength) {
            result.issues.push(`Row ${index + 1}: Field '${field}' is too short. Min length: ${minLength}, actual: ${value.length}`);
          }
          
          if (maxLength !== undefined && value.length > maxLength) {
            result.issues.push(`Row ${index + 1}: Field '${field}' is too long. Max length: ${maxLength}, actual: ${value.length}`);
          }
        }
      });
    });
  }
  
  /**
   * Validate allowed values
   */
  validateAllowedValue(data, rule, result) {
    const { targetFields, configuration } = rule;
    const allowedValues = configuration.get('allowedValues') || {};
    
    data.forEach((row, index) => {
      targetFields.forEach(field => {
        if (row[field] !== undefined) {
          const value = row[field];
          const allowed = allowedValues[field];
          
          if (Array.isArray(allowed) && !allowed.includes(value)) {
            result.issues.push(`Row ${index + 1}: Field '${field}' has invalid value. Allowed values: ${allowed.join(', ')}`);
          }
        }
      });
    });
  }
  
  /**
   * Validate format (regex patterns)
   */
  validateFormat(data, rule, result) {
    const { targetFields, configuration } = rule;
    const patterns = configuration.get('patterns') || {};
    
    data.forEach((row, index) => {
      targetFields.forEach(field => {
        if (row[field] !== undefined && typeof row[field] === 'string') {
          const value = row[field];
          const pattern = patterns[field];
          
          if (pattern) {
            const regex = new RegExp(pattern);
            if (!regex.test(value)) {
              result.issues.push(`Row ${index + 1}: Field '${field}' has invalid format. Expected pattern: ${pattern}`);
            }
          }
        }
      });
    });
  }
  
  /**
   * Validate timestamps
   */
  validateTimestamp(data, rule, result) {
    const { targetFields, configuration } = rule;
    const comparisons = configuration.get('comparisons') || [];
    
    data.forEach((row, index) => {
      // Check each field is a valid date
      targetFields.forEach(field => {
        if (row[field] !== undefined) {
          const timestamp = new Date(row[field]);
          if (isNaN(timestamp.getTime())) {
            result.issues.push(`Row ${index + 1}: Field '${field}' has invalid timestamp format`);
          }
        }
      });
      
      // Check timestamp comparisons (e.g., startDate < endDate)
      comparisons.forEach(comparison => {
        const { field1, field2, operator } = comparison;
        
        if (row[field1] !== undefined && row[field2] !== undefined) {
          const date1 = new Date(row[field1]);
          const date2 = new Date(row[field2]);
          
          if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
            let isValid = true;
            
            switch (operator) {
              case '<':
                isValid = date1 < date2;
                break;
              case '<=':
                isValid = date1 <= date2;
                break;
              case '>':
                isValid = date1 > date2;
                break;
              case '>=':
                isValid = date1 >= date2;
                break;
              case '==':
                isValid = date1.getTime() === date2.getTime();
                break;
            }
            
            if (!isValid) {
              result.issues.push(`Row ${index + 1}: Timestamp comparison failed: ${field1} ${operator} ${field2}`);
            }
          }
        }
      });
    });
  }
  
  /**
   * Validate uniqueness
   */
  validateUniqueness(data, rule, result) {
    const { targetFields } = rule;
    
    targetFields.forEach(field => {
      const valueMap = new Map();
      
      data.forEach((row, index) => {
        if (row[field] !== undefined) {
          const value = row[field];
          
          if (valueMap.has(value)) {
            result.issues.push(`Duplicate value found for field '${field}': '${value}' at rows ${valueMap.get(value) + 1} and ${index + 1}`);
          } else {
            valueMap.set(value, index);
          }
        }
      });
    });
  }
  
  /**
   * Validate referential integrity
   */
  async validateReferentialIntegrity(data, rule, result) {
    const { configuration } = rule;
    const references = configuration.get('references') || [];
    
    for (const reference of references) {
      const { sourceField, targetModel, targetField } = reference;
      
      // Get all unique values from the source field
      const uniqueValues = new Set();
      data.forEach(row => {
        if (row[sourceField] !== undefined) {
          uniqueValues.add(row[sourceField]);
        }
      });
      
      // Check if values exist in the target model
      const values = Array.from(uniqueValues);
      const mongoose = require('mongoose');
      const Model = mongoose.model(targetModel);
      
      const query = {};
      query[targetField] = { $in: values };
      
      const existingValues = await Model.find(query).select(targetField);
      const existingSet = new Set(existingValues.map(doc => doc[targetField]));
      
      // Find missing references
      data.forEach((row, index) => {
        if (row[sourceField] !== undefined && !existingSet.has(row[sourceField])) {
          result.issues.push(`Row ${index + 1}: Field '${sourceField}' references non-existent value '${row[sourceField]}' in ${targetModel}.${targetField}`);
        }
      });
    }
  }
  
  /**
   * Execute custom validation function
   */
  async executeCustomValidation(data, rule, result) {
    const { validationFunction } = rule;
    
    if (validationFunction) {
      try {
        // Create a function from the string
        const validateFn = new Function('data', 'result', validationFunction);
        await validateFn(data, result);
      } catch (error) {
        console.error('Error executing custom validation function:', error);
        result.issues.push(`Custom validation error: ${error.message}`);
      }
    } else {
      result.issues.push('Custom validation rule has no validation function');
    }
  }
  
  /**
   * Process a file with validation rules
   * @param {string} fileId - ID of the file to validate
   * @returns {Promise<Object>} - Validation results
   */
  async validateFile(fileId) {
    try {
      // Get file metadata
      const fileMetadata = await FileMetadata.findOne({ fileId });
      if (!fileMetadata) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // Check if file has been mapped or matched
      const dataLocation = fileMetadata.datasetProperties?.matchedLocation || 
                          fileMetadata.datasetProperties?.mappedLocation;
      
      if (!dataLocation || !fs.existsSync(dataLocation)) {
        throw new Error(`Processed data file not found for file ID ${fileId}`);
      }
      
      // Read data
      const data = JSON.parse(fs.readFileSync(dataLocation, 'utf8'));
      
      // Get schema ID from file metadata or mapping
      const schemaId = fileMetadata.schemaId;
      if (!schemaId) {
        throw new Error(`Schema ID not found for file ID ${fileId}`);
      }
      
      // Get validation rules for this schema
      const rules = await ValidationRule.find({
        targetSchema: schemaId,
        active: true
      });
      
      if (rules.length === 0) {
        console.warn(`No validation rules found for schema ${schemaId}`);
      }
      
      // Validate data against rules
      const validationResults = await this.validateData(data, rules);
      
      // Save validation results to file
      const validationFilePath = path.join(
        path.dirname(dataLocation),
        `${fileId}_validation.json`
      );
      
      fs.writeFileSync(validationFilePath, JSON.stringify(validationResults, null, 2));
      
      // Update file metadata
      fileMetadata.status = validationResults.isValid ? 'verified' : 'error';
      fileMetadata.validationResults = {
        isValid: validationResults.isValid,
        errors: validationResults.errors,
        warnings: validationResults.warnings,
        timestamp: new Date()
      };
      await fileMetadata.save();
      
      return {
        success: true,
        fileId,
        isValid: validationResults.isValid,
        errorCount: validationResults.errors.length,
        warningCount: validationResults.warnings.length,
        infoCount: validationResults.info.length,
        validationFilePath
      };
    } catch (error) {
      console.error('Error validating file:', error);
      
      // Update file metadata with error status
      if (fileId) {
        const fileMetadata = await FileMetadata.findOne({ fileId });
        if (fileMetadata) {
          fileMetadata.status = 'error';
          fileMetadata.processingStatus = 'failed';
          await fileMetadata.save();
        }
      }
      
      throw error;
    }
  }
}

module.exports = new ValidationService();
