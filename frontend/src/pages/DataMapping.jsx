import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileService, mappingService } from '../services/api';

const DataMapping = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sampleData, setSampleData] = useState([]);
  const [targetSchema, setTargetSchema] = useState('EmissionData');
  const [columnMappings, setColumnMappings] = useState({});
  const [processing, setProcessing] = useState(false);
  
  // Target schema fields
  const targetSchemaFields = {
    EmissionData: [
      'activityId', 'activityType', 'activityCategory', 'emissionScope',
      'startDate', 'endDate', 'quantity', 'unit', 'emissionFactor',
      'emissionFactorUnit', 'emissionValue', 'emissionUnit', 'location',
      'source', 'notes'
    ]
  };
  
  useEffect(() => {
    const fetchFileData = async () => {
      try {
        setLoading(true);
        const response = await fileService.getFileMetadata(fileId);
        
        if (!response.success) {
          setError(response.message || 'Failed to fetch file data');
          setLoading(false);
          return;
        }
        
        setFile(response.data);
        
        // Fetch sample data (this would be a separate API call in a real implementation)
        // For now, we'll simulate it with some dummy data
        const sampleDataResponse = await fetch(`/api/files/${fileId}/sample`).catch(() => {
          // Simulate sample data if API doesn't exist yet
          return {
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [
                { column1: 'value1', column2: 'value2', column3: 'value3' },
                { column1: 'value4', column2: 'value5', column3: 'value6' }
              ]
            })
          };
        });
        
        if (sampleDataResponse.ok) {
          const sampleDataResult = await sampleDataResponse.json();
          setSampleData(sampleDataResult.data);
          
          // Initialize column mappings with empty values
          const initialMappings = {};
          if (sampleDataResult.data.length > 0) {
            const sourceColumns = Object.keys(sampleDataResult.data[0]);
            targetSchemaFields[targetSchema].forEach(field => {
              // Try to find a matching source column by name similarity
              const matchingColumn = sourceColumns.find(col => 
                col.toLowerCase().includes(field.toLowerCase()) || 
                field.toLowerCase().includes(col.toLowerCase())
              );
              initialMappings[field] = matchingColumn || '';
            });
          }
          setColumnMappings(initialMappings);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching file data:', err);
        setError('Failed to fetch file data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchFileData();
  }, [fileId]);
  
  const handleMappingChange = (targetField, sourceField) => {
    setColumnMappings({
      ...columnMappings,
      [targetField]: sourceField
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setProcessing(true);
      setError(null);
      
      // Filter out empty mappings
      const filteredMappings = {};
      Object.entries(columnMappings).forEach(([key, value]) => {
        if (value) {
          filteredMappings[key] = value;
        }
      });
      
      const mappingConfig = {
        schemaId: targetSchema,
        columnMappings: filteredMappings,
        assignedReferences: {},
        inferReferences: {},
        skipValidation: false
      };
      
      const result = await mappingService.processMapping(fileId, mappingConfig);
      
      if (result.success) {
        navigate(`/files/${fileId}`);
      } else {
        setError(result.message || 'Mapping failed');
      }
    } catch (err) {
      console.error('Error processing mapping:', err);
      setError('Failed to process mapping. Please try again.');
    } finally {
      setProcessing(false);
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
  
  // Get source columns from sample data
  const sourceColumns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
  
  return (
    <div className="data-mapping-container">
      <h2>Data Mapping</h2>
      <div className="file-info">
        <h3>File: {file.originalName}</h3>
        <p>Map your data columns to the target schema fields.</p>
      </div>
      
      <div className="sample-data-section">
        <h3>Sample Data</h3>
        {sampleData.length > 0 ? (
          <div className="sample-data-table-container">
            <table className="sample-data-table">
              <thead>
                <tr>
                  {sourceColumns.map(column => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleData.map((row, index) => (
                  <tr key={index}>
                    {sourceColumns.map(column => (
                      <td key={column}>{row[column]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No sample data available</p>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mapping-section">
          <h3>Column Mapping</h3>
          <div className="mapping-table-container">
            <table className="mapping-table">
              <thead>
                <tr>
                  <th>Target Field</th>
                  <th>Source Column</th>
                </tr>
              </thead>
              <tbody>
                {targetSchemaFields[targetSchema].map(field => (
                  <tr key={field}>
                    <td>{field}</td>
                    <td>
                      <select
                        value={columnMappings[field] || ''}
                        onChange={(e) => handleMappingChange(field, e.target.value)}
                        disabled={processing}
                      >
                        <option value="">-- Select Source Column --</option>
                        {sourceColumns.map(column => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="actions">
          <button type="button" onClick={() => navigate('/dashboard')} disabled={processing}>
            Cancel
          </button>
          <button type="submit" disabled={processing}>
            {processing ? 'Processing...' : 'Process Mapping'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DataMapping;
