import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  return (
    <div className="header">
      <h2>Welcome to your ultimate career companion.</h2>
      <p>Build, Analyze, and Download Your Perfect Resume in minutes.</p>

      <div className="top-buttons">
        <Link to="/"><button className={location.pathname === '/' ? 'active' : ''}>🏠 Home</button></Link>
        <Link to="/create"><button className={location.pathname === '/create' ? 'active' : ''}>✏️ Create Resume</button></Link>
        <Link to="/analyze"><button className={location.pathname === '/analyze' ? 'active' : ''}>🔍 Analyze Resume</button></Link>
        <Link to="/download"><button className={location.pathname === '/download' ? 'active' : ''}>⬇️ Download Resume</button></Link>
      </div>
    </div>
  );
};

export default Header;
