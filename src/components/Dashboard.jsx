import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="cards">
      {/* Card 1 */}
      <div className="dash-card">
        <div className="icon">📄</div>
        <h3>Create Resume</h3>
        <p>Craft an ATS-friendly, AI-optimized resume from scratch using our smart template engine.</p>
        <Link to="/create"><button className="btn">Start Building</button></Link>
      </div>

      {/* Card 2 */}
      <div className="dash-card">
        <div className="icon">📊</div>
        <h3>Analyze Resume</h3>
        <p>Scan your resume against real job descriptions with AI-powered gap analysis and keyword scoring.</p>
        <Link to="/analyze"><button className="btn">Analyze Now</button></Link>
      </div>

      {/* Card 3 */}
      <div className="dash-card">
        <div className="icon">⬇️</div>
        <h3>Download Resume</h3>
        <p>Export your polished resume as a beautifully formatted, recruiter-ready PDF in one click.</p>
        <Link to="/download"><button className="btn">Go to Download</button></Link>
      </div>

      {/* Card 4 */}
      <div className="dash-card">
        <div className="icon">🤖</div>
        <h3>AI Suggestions</h3>
        <p>Get personalized AI recommendations to boost your resume score and improve your chances of getting hired.</p>
        <Link to="/ai"><button className="btn">Get Suggestions</button></Link>
      </div>
    </div>
  );
};

export default Dashboard;
