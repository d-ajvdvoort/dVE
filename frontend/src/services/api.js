import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// File service
export const fileService = {
  // Upload file
  uploadFile: async (file, metadata) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata fields
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }
    
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  // Get file metadata
  getFileMetadata: async (fileId) => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },
  
  // Get all files
  getAllFiles: async (page = 1, limit = 10) => {
    const response = await api.get(`/files?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  // Download file
  downloadFile: async (fileId) => {
    const response = await api.get(`/files/download/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  },
  
  // Delete file
  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  }
};

// Mapping service
export const mappingService = {
  // Process file with mapping
  processMapping: async (fileId, mappingConfig) => {
    const response = await api.post('/mapping', {
      fileId,
      mappingConfig
    });
    return response.data;
  }
};

// Matching service
export const matchingService = {
  // Process file with matching
  processMatching: async (fileId, matchingConfig) => {
    const response = await api.post('/matching', {
      fileId,
      matchingConfig
    });
    return response.data;
  }
};

// Validation service
export const validationService = {
  // Validate file
  validateFile: async (fileId) => {
    const response = await api.post(`/validation/${fileId}`);
    return response.data;
  }
};

// Auth service
export const authService = {
  // Register
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  // Get profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  
  // Update profile
  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },
  
  // Change password
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  }
};

export default {
  fileService,
  mappingService,
  matchingService,
  validationService,
  authService
};
