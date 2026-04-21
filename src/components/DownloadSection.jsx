import React from 'react';
import { FiDownload } from 'react-icons/fi';
import { IoDocumentTextOutline } from 'react-icons/io5';

const DownloadSection = () => {
  return (
    <div className="card">
      <h2 className="card-title">
        <FiDownload />
        Download Resume
      </h2>

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <IoDocumentTextOutline className="download-icon-lg" />
        <p className="download-msg">
          Your resume is ready to download.
        </p>
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem', padding: '1rem' }}>
          <FiDownload style={{ marginRight: '0.5rem' }} />
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default DownloadSection;
