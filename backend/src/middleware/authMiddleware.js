const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Authentication Middleware
 * Handles user authentication and authorization
 */
const authMiddleware = {
  /**
   * Protect routes - verify JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  protect: (req, res, next) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      let token;
      
      if (authHeader && authHeader.startsWith('Bearer')) {
        token = authHeader.split(' ')[1];
      }
      
      // Check if token exists
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to access this route'
        });
      }
      
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add user to request object
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error in authentication'
      });
    }
  },
  
  /**
   * Authorize by role
   * @param {Array} roles - Array of allowed roles
   * @returns {Function} - Express middleware function
   */
  authorize: (roles) => {
    return (req, res, next) => {
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: User role not defined'
        });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: User role ${req.user.role} not authorized`
        });
      }
      
      next();
    };
  }
};

module.exports = authMiddleware;
