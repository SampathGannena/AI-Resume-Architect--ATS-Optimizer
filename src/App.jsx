import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ResumeForm from './components/ResumeForm';
import AnalyzeSection from './components/AnalyzeSection';
import DownloadSection from './components/DownloadSection';

const SinglePageWrapper = ({ children }) => (
  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '800px', margin: '0 auto', padding: '0 16px' }}>
    <div style={{ width: '100%' }}>
      {children}
    </div>
  </div>
);

const AISuggestions = () => (
  <SinglePageWrapper>
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>🤖 AI Suggestions</h2>
      <p>AI-powered resume recommendations coming soon!</p>
    </div>
  </SinglePageWrapper>
);

function App() {
  return (
    <Router>
      <div style={{ width: '100%' }}>
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<SinglePageWrapper><ResumeForm /></SinglePageWrapper>} />
          <Route path="/analyze" element={<SinglePageWrapper><AnalyzeSection /></SinglePageWrapper>} />
          <Route path="/download" element={<SinglePageWrapper><DownloadSection /></SinglePageWrapper>} />
          <Route path="/ai" element={<AISuggestions />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;