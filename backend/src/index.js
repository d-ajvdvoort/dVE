const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const mappingRoutes = require('./routes/mappingRoutes');
const matchingRoutes = require('./routes/matchingRoutes');
const validationRoutes = require('./routes/validationRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(morgan('dev')); // Logging

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dve')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to dVeracity Verification Engine API' });
});

// API routes
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mapping', mappingRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/validation', validationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
