import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Placeholder components - these would be replaced with actual components
const Dashboard = () => <div>Dashboard</div>;
const FileUpload = () => <div>File Upload</div>;
const DataMapping = () => <div>Data Mapping</div>;
const Validation = () => <div>Validation</div>;
const Verification = () => <div>Verification</div>;

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>dVeracity Verification Engine</h1>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/mapping" element={<DataMapping />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/verification" element={<Verification />} />
        </Routes>
      </main>
      <footer>
        <p>&copy; 2025 dVeracity Verification Engine</p>
      </footer>
    </div>
  );
}

export default App;
