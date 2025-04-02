const express = require('express');
const router = express.Router();
const validationService = require('../services/validationService');
const authMiddleware = require('../middleware/authMiddleware');

// Validate a file
router.post('/:fileId', authMiddleware.protect, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fileId'
      });
    }
    
    const result = await validationService.validateFile(fileId);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error validating file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error validating file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
