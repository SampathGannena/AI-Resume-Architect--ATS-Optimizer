import React, { useState } from 'react';
import { FiUploadCloud, FiBarChart2 } from 'react-icons/fi';

const AnalyzeSection = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleUpload = () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    // Simulate file reading & API analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult({
        skillsRequired: ['SQL', 'Data Analysis', 'Leadership', 'Python', 'Tableau'],
        jobMatches: ['Data Analyst', 'Project Manager', 'Business Intelligence Analyst']
      });
    }, 2000);
  };

  return (
    <div className="card">
      <h2 className="card-title">
        <FiBarChart2 />
        Analyze Resume
      </h2>

      <div className="upload-area" onClick={handleUpload}>
        <FiUploadCloud size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
        <p style={{ color: '#475569', fontWeight: 500 }}>
          Click to Upload Your Resume
        </p>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          PDF, DOCX up to 5MB
        </p>
      </div>

      {isAnalyzing && (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Analyzing document structure...</p>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-results">
          <div className="result-group">
            <div className="result-label">Key Skills Required</div>
            <div className="result-tags">
              {analysisResult.skillsRequired.map((skill, index) => (
                <span key={index} className="tag">{skill}</span>
              ))}
            </div>
          </div>
          
          <div className="result-group" style={{ marginTop: '1.5rem' }}>
            <div className="result-label">Job Matches</div>
            <div className="result-tags">
              {analysisResult.jobMatches.map((job, index) => (
                <span key={index} className="tag" style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                  {job}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzeSection;
