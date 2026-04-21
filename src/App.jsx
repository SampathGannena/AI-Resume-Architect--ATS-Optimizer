import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ResumeForm from './components/ResumeForm';
import AnalyzeSection from './components/AnalyzeSection';
import DownloadSection from './components/DownloadSection';

const SinglePageWrapper = ({ children }) => (
  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
    <div style={{ width: '100%' }}>
      {children}
    </div>
  </div>
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;