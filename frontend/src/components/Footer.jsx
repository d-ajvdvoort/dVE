import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>dVeracity Verification Engine</h3>
            <p>Secure, transparent verification for carbon credits</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><a href="/docs">Documentation</a></li>
                <li><a href="/api-docs">API Reference</a></li>
                <li><a href="/support">Support</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
                <li><a href="/compliance">Compliance</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} dVeracity Verification Engine. All rights reserved.</p>
          <p>Powered by Cardano Midnight with KERI integration</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
