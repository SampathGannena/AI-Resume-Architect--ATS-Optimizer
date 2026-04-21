import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`header ${darkMode ? 'dark' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>AI Resume Architect</h2>
        <button
          className="btn"
          onClick={() => setDarkMode(!darkMode)}
          title="Toggle dark mode"
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
      <p>Your AI-Powered Resume Builder &amp; ATS Optimizer — land your dream job faster.</p>

      <div className="top-buttons">
        <Link to="/"><button className={location.pathname === '/' ? 'active' : ''}>🏠 Home</button></Link>
        <Link to="/create"><button className={location.pathname === '/create' ? 'active' : ''}>✏️ Create Resume</button></Link>
        <Link to="/analyze"><button className={location.pathname === '/analyze' ? 'active' : ''}>🔍 Analyze Resume</button></Link>
        <Link to="/download"><button className={location.pathname === '/download' ? 'active' : ''}>⬇️ Download Resume</button></Link>
        <Link to="/ai"><button className={location.pathname === '/ai' ? 'active' : ''}>🤖 AI Suggestions</button></Link>
      </div>
    </div>
  );
};

export default Header;
