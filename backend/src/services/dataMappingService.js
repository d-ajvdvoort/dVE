/**
 * Data Mapping Service
 * Provides data mapping functionality for the dVeracity Verification Engine
 */
const { Mapping, FileMetadata } = require('../models');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class DataMappingService {
  /**
   * Create a new mapping
   * @param {Object} mappingData - Mapping data
   * @returns {Promise<Object>} - Created mapping
   */
  async createMapping(mappingData) {
    try {
      const mapping = new Mapping(mappingData);
      await mapping.save();
      
      // Update file metadata with mapping ID
      if (mappingData.fileId) {
        await FileMetadata.findByIdAndUpdate(
          mappingData.fileId,
          { 
            mappingId: mapping._id,
            status: 'mapped'
          }
        );
      }
      
      return mapping;
    } catch (error) {
      console.error('Failed to create mapping:', error);
      throw error;
    }
  }

  /**
   * Get mapping by ID
   * @param {string} mappingId - ID of the mapping
   * @returns {Promise<Object>} - Mapping
   */
  async getMapping(mappingId) {
    try {
      const mapping = await Mapping.findById(mappingId);
      
      if (!mapping) {
        throw new Error(`Mapping with ID ${mappingId} not found`);
      }
      
      return mapping;
    } catch (error) {
      console.error('Failed to get mapping:', error);
      throw error;
    }
  }

  /**
   * Update mapping
   * @param {string} mappingId - ID of the mapping to update
   * @param {Object} updateData - Updated mapping data
   * @returns {Promise<Object>} - Updated mapping
   */
  async updateMapping(mappingId, updateData) {
    try {
      const mapping = await Mapping.findByIdAndUpdate(
        mappingId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
      
      if (!mapping) {
        throw new Error(`Mapping with ID ${mappingId} not found`);
      }
      
      return mapping;
    } catch (error) {
      console.error('Failed to update mapping:', error);
      throw error;
    }
  }

  /**
   * Delete mapping
   * @param {string} mappingId - ID of the mapping to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteMapping(mappingId) {
    try {
      const mapping = await Mapping.findById(mappingId);
      
      if (!mapping) {
        throw new Error(`Mapping with ID ${mappingId} not found`);
      }
      
      // Update file metadata to remove mapping reference
      await FileMetadata.findByIdAndUpdate(
        mapping.fileId,
        { 
          $unset: { mappingId: 1 },
          status: 'uploaded'
        }
      );
      
      // Delete the mapping
      await Mapping.findByIdAndDelete(mappingId);
      
      return { success: true, message: 'Mapping deleted successfully' };
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      throw error;
    }
  }

  /**
   * Apply mapping to a file
   * @param {string} fileId - ID of the file
   * @param {string} mappingId - ID of the mapping
   * @returns {Promise<Object>} - Mapping result
   */
  async applyMapping(fileId, mappingId) {
    try {
      // Get file metadata
      const fileMetadata = await FileMetadata.findById(fileId);
      
      if (!fileMetadata) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // Get mapping
      const mapping = await Mapping.findById(mappingId);
      
      if (!mapping) {
        throw new Error(`Mapping with ID ${mappingId} not found`);
      }
      
      // Check if mapping is for this file
      if (mapping.fileId.toString() !== fileId) {
        throw new Error('Mapping is not associated with this file');
      }
      
      // In a real implementation, this would read the file and apply the mapping
      // For this implementation, we'll simulate mapping application
      
      // Update mapping status
      mapping.status = 'applied';
      await mapping.save();
      
      // Update file metadata
      fileMetadata.status = 'mapped';
      await fileMetadata.save();
      
      return {
        success: true,
        fileId,
        mappingId,
        message: 'Mapping applied successfully'
      };
    } catch (error) {
      console.error('Failed to apply mapping:', error);
      throw error;
    }
  }

  /**
   * Get file schema
   * @param {string} fileId - ID of the file
   * @returns {Promise<Object>} - File schema
   */
  async getFileSchema(fileId) {
    try {
      // Get file metadata
      const fileMetadata = await FileMetadata.findById(fileId);
      
      if (!fileMetadata) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // In a real implementation, this would read the file and extract the schema
      // For this implementation, we'll simulate schema extraction
      
      // Check if file exists
      if (!fs.existsSync(fileMetadata.path)) {
        throw new Error(`File not found at path: ${fileMetadata.path}`);
      }
      
      // Extract schema from CSV file
      const schema = await this._extractCsvSchema(fileMetadata.path);
      
      return {
        fileId,
        fileName: fileMetadata.originalName,
        schema
      };
    } catch (error) {
      console.error('Failed to get file schema:', error);
      throw error;
    }
  }

  /**
   * Extract schema from CSV file
   * @private
   * @param {string} filePath - Path to the CSV file
   * @returns {Promise<Array>} - CSV schema
   */
  async _extractCsvSchema(filePath) {
    return new Promise((resolve, reject) => {
      const headers = [];
      const sampleData = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (row) => {
          if (sampleData.length < 5) {
            sampleData.push(row);
          }
        })
        .on('end', () => {
          // Infer data types from sample data
          const schema = headers.map(header => {
            const values = sampleData.map(row => row[header]);
            const dataType = this._inferDataType(values);
            
            return {
              field: header,
              dataType,
              sample: values.slice(0, 3)
            };
          });
          
          resolve(schema);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Infer data type from values
   * @private
   * @param {Array} values - Sample values
   * @returns {string} - Inferred data type
   */
  _inferDataType(values) {
    // Check if all values are numbers
    const allNumbers = values.every(value => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      return !isNaN(Number(value));
    });
    
    if (allNumbers) {
      // Check if all values are integers
      const allIntegers = values.every(value => {
        if (value === null || value === undefined || value === '') {
          return true;
        }
        const num = Number(value);
        return Number.isInteger(num);
      });
      
      return allIntegers ? 'integer' : 'number';
    }
    
    // Check if all values are dates
    const allDates = values.every(value => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      const date = new Date(value);
      return !isNaN(date.getTime());
    });
    
    if (allDates) {
      return 'date';
    }
    
    // Check if all values are booleans
    const allBooleans = values.every(value => {
      if (value === null || value === undefined || value === '') {
        return true;
      }
      return value.toLowerCase() === 'true' || value.toLowerCase() === 'false';
    });
    
    if (allBooleans) {
      return 'boolean';
    }
    
    // Default to string
    return 'string';
  }

  /**
   * Get target schemas
   * @returns {Promise<Array>} - Target schemas
   */
  async getTargetSchemas() {
    // In a real implementation, this would load schemas from a database or configuration
    // For this implementation, we'll return predefined schemas
    
    return [
      {
        id: 'EmissionData',
        name: 'Emission Data Schema',
        description: 'Schema for emission data',
        fields: [
          { name: 'emissionId', type: 'string', required: true },
          { name: 'emissionType', type: 'string', required: true },
          { name: 'emissionScope', type: 'string', required: true },
          { name: 'emissionCategory', type: 'string', required: true },
          { name: 'emissionValue', type: 'number', required: true },
          { name: 'emissionUnit', type: 'string', required: true },
          { name: 'reportingPeriod', type: 'string', required: true },
          { name: 'reportingDate', type: 'date', required: true },
          { name: 'location', type: 'string', required: false },
          { name: 'notes', type: 'string', required: false }
        ]
      },
      {
        id: 'ActivityData',
        name: 'Activity Data Schema',
        description: 'Schema for activity data',
        fields: [
          { name: 'activityId', type: 'string', required: true },
          { name: 'activityType', type: 'string', required: true },
          { name: 'activityCategory', type: 'string', required: true },
          { name: 'activityValue', type: 'number', required: true },
          { name: 'activityUnit', type: 'string', required: true },
          { name: 'startDate', type: 'date', required: true },
          { name: 'endDate', type: 'date', required: true },
          { name: 'location', type: 'string', required: false },
          { name: 'notes', type: 'string', required: false }
        ]
      },
      {
        id: 'ReferenceData',
        name: 'Reference Data Schema',
        description: 'Schema for reference data',
        fields: [
          { name: 'referenceId', type: 'string', required: true },
          { name: 'referenceType', type: 'string', required: true },
          { name: 'referenceCode', type: 'string', required: true },
          { name: 'referenceName', type: 'string', required: true },
          { name: 'referenceValue', type: 'number', required: false },
          { name: 'referenceUnit', type: 'string', required: false },
          { name: 'validFrom', type: 'date', required: false },
          { name: 'validTo', type: 'date', required: false },
          { name: 'source', type: 'string', required: false },
          { name: 'notes', type: 'string', required: false }
        ]
      }
    ];
  }
}

module.exports = new DataMappingService();
