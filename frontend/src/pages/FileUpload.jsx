import React, { useState } from 'react';
import { fileService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState({
    contractId: '',
    originator: '',
    dataType: 'First Party Data',
    securityClassification: 'Private',
    personalData: 'No Personal Data',
    exportClassification: 'Not-Technical Data'
  });
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata({
      ...metadata,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      const result = await fileService.uploadFile(file, metadata);
      
      if (result.success) {
        navigate(`/files/${result.data.fileId}`);
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <h2>Upload File</h2>
      <p>Upload your data file for verification.</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="file">Select File</label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            accept=".csv,.xlsx,.json,.parquet"
            disabled={uploading}
          />
          <small>Supported formats: CSV, Excel, JSON, Parquet</small>
        </div>
        
        <div className="metadata-section">
          <h3>File Metadata</h3>
          
          <div className="form-group">
            <label htmlFor="contractId">Contract ID (Optional)</label>
            <input
              type="text"
              id="contractId"
              name="contractId"
              value={metadata.contractId}
              onChange={handleMetadataChange}
              disabled={uploading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="originator">Originator (Optional)</label>
            <input
              type="text"
              id="originator"
              name="originator"
              value={metadata.originator}
              onChange={handleMetadataChange}
              disabled={uploading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="dataType">Data Type</label>
            <select
              id="dataType"
              name="dataType"
              value={metadata.dataType}
              onChange={handleMetadataChange}
              disabled={uploading}
            >
              <option value="Public Domain Data">Public Domain Data</option>
              <option value="First Party Data">First Party Data</option>
              <option value="Second Party Data">Second Party Data</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="securityClassification">Security Classification</label>
            <select
              id="securityClassification"
              name="securityClassification"
              value={metadata.securityClassification}
              onChange={handleMetadataChange}
              disabled={uploading}
            >
              <option value="Public">Public</option>
              <option value="Private">Private</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="personalData">Personal Data</label>
            <select
              id="personalData"
              name="personalData"
              value={metadata.personalData}
              onChange={handleMetadataChange}
              disabled={uploading}
            >
              <option value="No Personal Data">No Personal Data</option>
              <option value="Personally Identifiable">Personally Identifiable</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="exportClassification">Export Classification</label>
            <select
              id="exportClassification"
              name="exportClassification"
              value={metadata.exportClassification}
              onChange={handleMetadataChange}
              disabled={uploading}
            >
              <option value="Not-Technical Data">Not-Technical Data</option>
              <option value="No License Required">No License Required</option>
            </select>
          </div>
        </div>
        
        <button type="submit" disabled={uploading || !file}>
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;
