import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileService, validationService } from '../services/api';

const ValidationResults = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const fileResponse = await fileService.getFileMetadata(fileId);
        
        if (!fileResponse.success) {
          setError(fileResponse.message || 'Failed to fetch file data');
          setLoading(false);
          return;
        }
        
        setFile(fileResponse.data);
        
        // Check if validation results already exist
        if (fileResponse.data.validationResults) {
          setValidationResults(fileResponse.data.validationResults);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [fileId]);

  const handleValidate = async () => {
    try {
      setValidating(true);
      setError(null);
      
      const result = await validationService.validateFile(fileId);
      
      if (result.success) {
        // Refresh file data to get updated validation results
        const fileResponse = await fileService.getFileMetadata(fileId);
        setFile(fileResponse.data);
        setValidationResults(fileResponse.data.validationResults);
      } else {
        setError(result.message || 'Validation failed');
      }
    } catch (err) {
      console.error('Error validating file:', err);
      setError('Failed to validate file. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading file data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!file) {
    return <div className="error-message">File not found</div>;
  }

  return (
    <div className="validation-results-container">
      <h2>Validation Results</h2>
      <div className="file-info">
        <h3>File: {file.originalName}</h3>
        <p>Status: <span className={`status-badge status-${file.status}`}>{file.status}</span></p>
      </div>
      
      {!validationResults && (
        <div className="no-results">
          <p>This file has not been validated yet.</p>
          <button 
            onClick={handleValidate} 
            disabled={validating || file.status !== 'mapped'}
            className="btn btn-primary"
          >
            {validating ? 'Validating...' : 'Validate Now'}
          </button>
          {file.status !== 'mapped' && (
            <p className="warning">
              Note: File must be in 'mapped' status before validation. 
              Current status: {file.status}
            </p>
          )}
        </div>
      )}
      
      {validationResults && (
        <div className="results-section">
          <div className="results-summary">
            <h3>Validation Summary</h3>
            <div className={`validation-status ${validationResults.isValid ? 'valid' : 'invalid'}`}>
              {validationResults.isValid ? 'VALID' : 'INVALID'}
            </div>
            <div className="validation-stats">
              <div className="stat">
                <span className="stat-label">Errors:</span>
                <span className="stat-value error-count">{validationResults.errors.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Warnings:</span>
                <span className="stat-value warning-count">{validationResults.warnings.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Validated on:</span>
                <span className="stat-value">{new Date(validationResults.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          {validationResults.errors.length > 0 && (
            <div className="errors-section">
              <h3>Errors</h3>
              <ul className="error-list">
                {validationResults.errors.map((error, index) => (
                  <li key={index} className="error-item">{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationResults.warnings.length > 0 && (
            <div className="warnings-section">
              <h3>Warnings</h3>
              <ul className="warning-list">
                {validationResults.warnings.map((warning, index) => (
                  <li key={index} className="warning-item">{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="actions">
            <button 
              onClick={() => navigate(`/files/${fileId}`)} 
              className="btn btn-secondary"
            >
              Back to File Details
            </button>
            {file.status === 'verified' && (
              <button 
                onClick={() => navigate(`/verification/${fileId}`)} 
                className="btn btn-success"
              >
                Proceed to Verification
              </button>
            )}
            {!validationResults.isValid && (
              <button 
                onClick={() => navigate(`/mapping/${fileId}`)} 
                className="btn btn-primary"
              >
                Edit Mapping
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationResults;
