import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">
            <h1>dVeracity Verification Engine</h1>
          </Link>
        </div>
        
        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              <div className="navbar-links">
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/upload" className="nav-link">Upload</Link>
              </div>
              
              <div className="navbar-user">
                <div className="user-info">
                  <span className="username">{user.username}</span>
                  <span className="role">{user.role}</span>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
