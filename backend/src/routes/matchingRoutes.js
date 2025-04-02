const express = require('express');
const router = express.Router();
const dataMatchingService = require('../services/dataMatchingService');
const authMiddleware = require('../middleware/authMiddleware');

// Match data to reference data
router.post('/', authMiddleware.protect, async (req, res) => {
  try {
    const { fileId, matchingConfig } = req.body;
    
    if (!fileId || !matchingConfig) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fileId and matchingConfig'
      });
    }
    
    const result = await dataMatchingService.processFile(fileId, matchingConfig);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing matching:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing matching',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
