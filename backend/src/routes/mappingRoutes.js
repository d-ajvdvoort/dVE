const express = require('express');
const router = express.Router();
const dataMappingService = require('../services/dataMappingService');
const authMiddleware = require('../middleware/authMiddleware');

// Create a new mapping
router.post('/', authMiddleware.protect, async (req, res) => {
  try {
    const { fileId, mappingConfig } = req.body;
    
    if (!fileId || !mappingConfig) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fileId and mappingConfig'
      });
    }
    
    const result = await dataMappingService.processFile(fileId, mappingConfig);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing mapping',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
