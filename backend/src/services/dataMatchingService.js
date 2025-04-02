const ReferenceData = require('../models/ReferenceData');
const FileMetadata = require('../models/FileMetadata');
const fs = require('fs');
const path = require('path');

/**
 * Data Matching Service
 * Handles matching client data to reference and master data sets
 */
class DataMatchingService {
  /**
   * Match data values to reference data
   * @param {Array} data - Source data array
   * @param {Object} matchingConfig - Configuration for matching
   * @returns {Promise<Array>} - Data with matched reference values
   */
  async matchDataToReferences(data, matchingConfig) {
    try {
      const { fieldMappings } = matchingConfig;
      const matchedData = [...data];
      
      // Process each field mapping
      for (const mapping of fieldMappings) {
        const { sourceField, referenceType, targetField } = mapping;
        
        // Get all reference data of this type
        const referenceData = await ReferenceData.find({ 
          type: referenceType,
          active: true 
        });
        
        if (!referenceData.length) {
          console.warn(`No reference data found for type: ${referenceType}`);
          continue;
        }
        
        // Create a lookup map for faster matching
        const referenceLookup = {};
        referenceData.forEach(ref => {
          // Use lowercase for case-insensitive matching
          referenceLookup[ref.name.toLowerCase()] = ref;
          if (ref.code) {
            referenceLookup[ref.code.toLowerCase()] = ref;
          }
        });
        
        // Match each data row
        for (const row of matchedData) {
          if (row[sourceField]) {
            const sourceValue = row[sourceField].toLowerCase();
            const matchedRef = referenceLookup[sourceValue];
            
            if (matchedRef) {
              // Store the matched reference data
              row[targetField] = {
                code: matchedRef.code,
                name: matchedRef.name,
                type: matchedRef.type,
                standard: matchedRef.standard
              };
            } else {
              // No match found, mark as unmatched
              row[targetField] = {
                unmatched: true,
                originalValue: row[sourceField]
              };
            }
          }
        }
      }
      
      return matchedData;
    } catch (error) {
      console.error('Error matching data to references:', error);
      throw error;
    }
  }
  
  /**
   * Process a file with matching configuration
   * @param {string} fileId - ID of the file to process
   * @param {Object} matchingConfig - Configuration for matching
   * @returns {Promise<Object>} - Processing result
   */
  async processFile(fileId, matchingConfig) {
    try {
      // Get file metadata
      const fileMetadata = await FileMetadata.findOne({ fileId });
      if (!fileMetadata) {
        throw new Error(`File with ID ${fileId} not found`);
      }
      
      // Check if file has been mapped
      if (fileMetadata.status !== 'mapped') {
        throw new Error(`File with ID ${fileId} has not been mapped yet`);
      }
      
      // Read mapped data
      const mappedFilePath = fileMetadata.datasetProperties?.mappedLocation;
      if (!mappedFilePath || !fs.existsSync(mappedFilePath)) {
        throw new Error(`Mapped data file not found for file ID ${fileId}`);
      }
      
      const mappedData = JSON.parse(fs.readFileSync(mappedFilePath, 'utf8'));
      
      // Match data to references
      const matchedData = await this.matchDataToReferences(mappedData, matchingConfig);
      
      // Save matched data to file
      const matchedFilePath = path.join(
        path.dirname(mappedFilePath),
        `${fileId}_matched.json`
      );
      
      fs.writeFileSync(matchedFilePath, JSON.stringify(matchedData, null, 2));
      
      // Update file metadata
      fileMetadata.status = 'validated';
      fileMetadata.datasetProperties = {
        ...fileMetadata.datasetProperties,
        matchedLocation: matchedFilePath
      };
      await fileMetadata.save();
      
      // Calculate match statistics
      const stats = this.calculateMatchStatistics(matchedData, matchingConfig);
      
      return {
        success: true,
        message: 'File matched successfully',
        fileId,
        recordCount: matchedData.length,
        matchStats: stats
      };
    } catch (error) {
      console.error('Error processing file for matching:', error);
      
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
  
  /**
   * Calculate match statistics
   * @param {Array} matchedData - Data after matching
   * @param {Object} matchingConfig - Configuration used for matching
   * @returns {Object} - Match statistics
   */
  calculateMatchStatistics(matchedData, matchingConfig) {
    const stats = {
      total: matchedData.length,
      matched: 0,
      unmatched: 0,
      matchRate: 0,
      fieldStats: {}
    };
    
    // Initialize field stats
    matchingConfig.fieldMappings.forEach(mapping => {
      const { targetField } = mapping;
      stats.fieldStats[targetField] = {
        matched: 0,
        unmatched: 0,
        matchRate: 0
      };
    });
    
    // Calculate stats for each field
    matchedData.forEach(row => {
      let rowMatched = true;
      
      matchingConfig.fieldMappings.forEach(mapping => {
        const { targetField } = mapping;
        
        if (row[targetField] && !row[targetField].unmatched) {
          stats.fieldStats[targetField].matched++;
        } else {
          stats.fieldStats[targetField].unmatched++;
          rowMatched = false;
        }
      });
      
      if (rowMatched) {
        stats.matched++;
      } else {
        stats.unmatched++;
      }
    });
    
    // Calculate match rates
    stats.matchRate = stats.total > 0 ? (stats.matched / stats.total) * 100 : 0;
    
    Object.keys(stats.fieldStats).forEach(field => {
      const fieldStat = stats.fieldStats[field];
      const total = fieldStat.matched + fieldStat.unmatched;
      fieldStat.matchRate = total > 0 ? (fieldStat.matched / total) * 100 : 0;
    });
    
    return stats;
  }
}

module.exports = new DataMatchingService();
