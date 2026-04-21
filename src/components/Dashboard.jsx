import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="cards">
      {/* Card 1 */}
      <div className="dash-card">
        <div className="icon">📄</div>
        <h3>Create Resume</h3>
        <p>Build a professional, top-tier resume from scratch using our elegant and tailored creator tools.</p>
        <Link to="/create"><button className="btn">Start Building</button></Link>
      </div>

      {/* Card 2 */}
      <div className="dash-card">
        <div className="icon">📊</div>
        <h3>Analyze Resume</h3>
        <p>Upload your existing resume to instantly uncover matching job roles and identify key missing skills.</p>
        <Link to="/analyze"><button className="btn">Analyze Now</button></Link>
      </div>

      {/* Card 3 */}
      <div className="dash-card">
        <div className="icon">⬇️</div>
        <h3>Download Resume</h3>
        <p>Preview and securely export your finalized customized resume straight to a sleek PDF format.</p>
        <Link to="/download"><button className="btn">Go to Download</button></Link>
      </div>
    </div>
  );
};

export default Dashboard;
