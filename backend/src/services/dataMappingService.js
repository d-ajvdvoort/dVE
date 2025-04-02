const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const FileMetadata = require('../models/FileMetadata');
const Mapping = require('../models/Mapping');

/**
 * Data Mapping Service
 * Handles mapping source file data to target schemas
 */
class DataMappingService {
  /**
   * Extract data from a CSV file
   * @param {string} filePath - Path to the CSV file
   * @returns {Promise<Array>} - Extracted data as array of objects
   */
  async extractDataFromCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }
  
  /**
   * Map extracted data to target schema
   * @param {Array} data - Source data
   * @param {Object} mapping - Mapping configuration
   * @returns {Array} - Mapped data
   */
  mapDataToSchema(data, mapping) {
    const { columnMappings, assignedReferences, inferReferences } = mapping;
    
    return data.map(row => {
      const mappedRow = {};
      
      // Apply column mappings
      for (const [targetField, sourceField] of Object.entries(columnMappings)) {
        if (row[sourceField] !== undefined) {
          mappedRow[targetField] = row[sourceField];
        }
      }
      
      // Apply assigned references (custom values)
      if (assignedReferences) {
        for (const [field, value] of Object.entries(assignedReferences)) {
          mappedRow[field] = value;
        }
      }
      
      // Apply inferred references (if available)
      if (inferReferences) {
        for (const [field, value] of Object.entries(inferReferences)) {
          mappedRow[field] = value;
        }
      }
      
      return mappedRow;
    });
  }
  
  /**
   * Process a file using a mapping configuration
   * @param {string} fileId - ID of the file to process
   * @param {Object} mappingConfig - Mapping configuration
   * @returns {Promise<Object>} - Processing result
   */
  async processFile(fileId, mappingConfig) {
    try {
      // Get file metadata
      const fileMetadata = await FileMetadata.findOne({ fileId });
      if (!fileMetadata) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // Create mapping record
      const mapping = new Mapping({
        ...mappingConfig,
        fileId
      });
      await mapping.save();
      
      // Extract data from file
      let extractedData;
      const fileExt = path.extname(fileMetadata.filePath).toLowerCase();
      
      if (fileExt === '.csv') {
        extractedData = await this.extractDataFromCSV(fileMetadata.filePath);
      } else {
        throw new Error(`Unsupported file type: ${fileExt}`);
      }
      
      // Map data to schema
      const mappedData = this.mapDataToSchema(extractedData, mappingConfig);
      
      // Save mapped data to file
      const mappedFilePath = path.join(
        path.dirname(fileMetadata.filePath),
        `${fileId}_mapped.json`
      );
      
      fs.writeFileSync(mappedFilePath, JSON.stringify(mappedData, null, 2));
      
      // Update file metadata
      fileMetadata.status = 'mapped';
      fileMetadata.processingStatus = 'completed';
      fileMetadata.datasetProperties = {
        ...fileMetadata.datasetProperties,
        mappedLocation: mappedFilePath
      };
      await fileMetadata.save();
      
      return {
        success: true,
        message: 'File processed successfully',
        fileId,
        mappingId: mapping._id,
        recordCount: mappedData.length
      };
    } catch (error) {
      console.error('Error processing file:', error);
      
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

module.exports = new DataMappingService();
