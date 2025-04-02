import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fileService } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await fileService.getAllFiles(currentPage);
        setFiles(response.data);
        setTotalPages(response.totalPages);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch files');
        setLoading(false);
        console.error('Error fetching files:', err);
      }
    };

    fetchFiles();
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'uploaded':
        return 'badge-primary';
      case 'mapped':
        return 'badge-info';
      case 'validated':
        return 'badge-warning';
      case 'verified':
        return 'badge-success';
      case 'error':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      <div className="welcome-section">
        <h2>Welcome, {user?.username || 'User'}</h2>
        <p>This is your dVeracity Verification Engine dashboard.</p>
      </div>

      <div className="files-section">
        <div className="section-header">
          <h3>Your Files</h3>
          <a href="/upload" className="btn btn-primary">Upload New File</a>
        </div>

        {loading ? (
          <div className="loading">Loading files...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            {files.length === 0 ? (
              <div className="no-files">
                <p>You haven't uploaded any files yet.</p>
                <a href="/upload" className="btn btn-primary">Upload your first file</a>
              </div>
            ) : (
              <div className="files-table-container">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Upload Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.fileId}>
                        <td>{file.originalName}</td>
                        <td>{new Date(file.uploadDate).toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(file.status)}`}>
                            {file.status}
                          </span>
                        </td>
                        <td className="actions">
                          <a href={`/files/${file.fileId}`} className="btn btn-sm btn-info">View</a>
                          {file.status === 'uploaded' && (
                            <a href={`/mapping/${file.fileId}`} className="btn btn-sm btn-primary">Map</a>
                          )}
                          {file.status === 'mapped' && (
                            <a href={`/validation/${file.fileId}`} className="btn btn-sm btn-warning">Validate</a>
                          )}
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this file?')) {
                                try {
                                  await fileService.deleteFile(file.fileId);
                                  setFiles(files.filter(f => f.fileId !== file.fileId));
                                } catch (err) {
                                  console.error('Error deleting file:', err);
                                  alert('Failed to delete file');
                                }
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
