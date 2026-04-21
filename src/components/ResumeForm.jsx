import React, { useState } from 'react';
import { FiFileText, FiCheckCircle, FiPlus, FiTrash2 } from 'react-icons/fi';

const ResumeForm = () => {
  const [formData, setFormData] = useState({
    // 1. Basic Info
    fullName: '', email: '', phone: '', address: '', linkedin: '', github: '',
    // 2. Summary
    summary: '',
    // 3. Education
    education: [{ degree: '', college: '', branch: '', startYear: '', endYear: '', cgpa: '' }],
    // 4. Skills
    skills: '',
    // 5. Experience
    experience: [{ role: '', company: '', duration: '', description: '' }],
    // 6. Projects
    projects: [{ title: '', technologies: '', description: '', link: '' }],
    // 7. Certifications
    certifications: '',
    // 8. Achievements
    achievements: '',
    // 9. Languages
    languages: '',
    // 10. Extra
    extra: ''
  });
  
  const [status, setStatus] = useState('idle'); // idle, generating, success

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayChange = (field, index, key, value) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = { ...newArray[index], [key]: value };
      return { ...prev, [field]: newArray };
    });
  };

  const addArrayItem = (field, emptyObj) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], emptyObj] }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray.splice(index, 1);
      return { ...prev, [field]: newArray };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone) {
      alert("Please fill in core details like Full Name, Email, and Phone.");
      return;
    }
    
    setStatus('generating');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    }, 1500);
  };

  const SectionTitle = ({ title }) => (
    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.4rem', marginBottom: '1rem', marginTop: '2rem' }}>
      {title}
    </h3>
  );

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h2 className="card-title">
        <FiFileText />
        Complete Your Resume Profile
      </h2>
      <form onSubmit={handleSubmit} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* 1. Basic Info */}
        <SectionTitle title="1. Basic Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="form-input" placeholder="John Doe" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="john@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-input" placeholder="+1 234 567 890" required />
          </div>
          <div className="form-group">
            <label className="form-label">Address (Optional)</label>
            <input type="text" name="address" value={formData.address} onChange={handleChange} className="form-input" placeholder="City, State" />
          </div>
          <div className="form-group">
            <label className="form-label">LinkedIn (Optional)</label>
            <input type="url" name="linkedin" value={formData.linkedin} onChange={handleChange} className="form-input" placeholder="https://linkedin.com/in/..." />
          </div>
          <div className="form-group">
            <label className="form-label">GitHub / Portfolio (Optional)</label>
            <input type="url" name="github" value={formData.github} onChange={handleChange} className="form-input" placeholder="https://github.com/..." />
          </div>
        </div>

        {/* 2. Professional Summary */}
        <SectionTitle title="2. Professional Summary" />
        <div className="form-group">
          <label className="form-label">Summary / Objective</label>
          <textarea name="summary" value={formData.summary} onChange={handleChange} className="form-input" placeholder="Motivated software developer with strong skills in Java..." rows={3} />
        </div>

        {/* 3. Education Details */}
        <SectionTitle title="3. Education Details" />
        {formData.education.map((edu, idx) => (
          <div key={idx} style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Education Entry #{idx + 1}</span>
              {idx > 0 && <button type="button" onClick={() => removeArrayItem('education', idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}><FiTrash2 /></button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <input type="text" placeholder="Degree (B.Tech, MCA, etc.)" value={edu.degree} onChange={e => handleArrayChange('education', idx, 'degree', e.target.value)} className="form-input" />
              <input type="text" placeholder="College / University Name" value={edu.college} onChange={e => handleArrayChange('education', idx, 'college', e.target.value)} className="form-input" />
              <input type="text" placeholder="Branch / Specialization" value={edu.branch} onChange={e => handleArrayChange('education', idx, 'branch', e.target.value)} className="form-input" />
              <input type="text" placeholder="CGPA / Percentage" value={edu.cgpa} onChange={e => handleArrayChange('education', idx, 'cgpa', e.target.value)} className="form-input" />
              <input type="text" placeholder="Start Year" value={edu.startYear} onChange={e => handleArrayChange('education', idx, 'startYear', e.target.value)} className="form-input" />
              <input type="text" placeholder="End Year" value={edu.endYear} onChange={e => handleArrayChange('education', idx, 'endYear', e.target.value)} className="form-input" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addArrayItem('education', { degree: '', college: '', branch: '', startYear: '', endYear: '', cgpa: '' })} className="btn" style={{ width: 'fit-content', padding: '0.5rem 1rem', fontSize: '0.85rem' }}><FiPlus /> Add Education</button>

        {/* 4. Skills */}
        <SectionTitle title="4. Skills" />
        <div className="form-group">
          <label className="form-label">Technical, Tools & Soft Skills</label>
          <textarea name="skills" value={formData.skills} onChange={handleChange} className="form-input" placeholder="Java, Python, SQL, Git, Docker, Leadership..." rows={2} />
        </div>

        {/* 5. Work Experience */}
        <SectionTitle title="5. Work Experience / Internships" />
        {formData.experience.map((exp, idx) => (
          <div key={idx} style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Experience Entry #{idx + 1}</span>
              <button type="button" onClick={() => removeArrayItem('experience', idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}><FiTrash2 /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Job Role / Title" value={exp.role} onChange={e => handleArrayChange('experience', idx, 'role', e.target.value)} className="form-input" />
              <input type="text" placeholder="Company Name" value={exp.company} onChange={e => handleArrayChange('experience', idx, 'company', e.target.value)} className="form-input" />
              <input type="text" placeholder="Duration (e.g. 2020 - 2023)" value={exp.duration} onChange={e => handleArrayChange('experience', idx, 'duration', e.target.value)} className="form-input" style={{ gridColumn: 'span 2' }} />
            </div>
            <textarea placeholder="Description (Bullet points e.g. Developed REST APIs...)" value={exp.description} onChange={e => handleArrayChange('experience', idx, 'description', e.target.value)} className="form-input" rows={3} />
          </div>
        ))}
        <button type="button" onClick={() => addArrayItem('experience', { role: '', company: '', duration: '', description: '' })} className="btn" style={{ width: 'fit-content', padding: '0.5rem 1rem', fontSize: '0.85rem' }}><FiPlus /> Add Experience</button>

        {/* 6. Projects */}
        <SectionTitle title="6. Projects" />
        {formData.projects.map((proj, idx) => (
          <div key={idx} style={{ padding: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#f8fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#475569' }}>Project Entry #{idx + 1}</span>
              <button type="button" onClick={() => removeArrayItem('projects', idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}><FiTrash2 /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <input type="text" placeholder="Project Title" value={proj.title} onChange={e => handleArrayChange('projects', idx, 'title', e.target.value)} className="form-input" />
              <input type="text" placeholder="Technologies Used" value={proj.technologies} onChange={e => handleArrayChange('projects', idx, 'technologies', e.target.value)} className="form-input" />
              <input type="url" placeholder="GitHub / Live Link" value={proj.link} onChange={e => handleArrayChange('projects', idx, 'link', e.target.value)} className="form-input" style={{ gridColumn: 'span 2' }} />
            </div>
            <textarea placeholder="Description" value={proj.description} onChange={e => handleArrayChange('projects', idx, 'description', e.target.value)} className="form-input" rows={3} />
          </div>
        ))}
        <button type="button" onClick={() => addArrayItem('projects', { title: '', technologies: '', description: '', link: '' })} className="btn" style={{ width: 'fit-content', padding: '0.5rem 1rem', fontSize: '0.85rem' }}><FiPlus /> Add Project</button>

        {/* 7. Certifications */}
        <SectionTitle title="7. Certifications (Optional)" />
        <div className="form-group">
          <textarea name="certifications" value={formData.certifications} onChange={handleChange} className="form-input" placeholder="Course Name, Platform (Coursera, Udemy), Year..." rows={2} />
        </div>

        {/* 8. Achievements */}
        <SectionTitle title="8. Achievements (Optional)" />
        <div className="form-group">
          <textarea name="achievements" value={formData.achievements} onChange={handleChange} className="form-input" placeholder="Hackathons, Awards, Rankings..." rows={2} />
        </div>

        {/* 9. Languages */}
        <SectionTitle title="9. Languages (Optional)" />
        <div className="form-group">
          <input type="text" name="languages" value={formData.languages} onChange={handleChange} className="form-input" placeholder="English, Telugu, Hindi, etc." />
        </div>

        {/* 10. Extra Sections */}
        <SectionTitle title="10. Extra Sections (Optional)" />
        <div className="form-group">
          <textarea name="extra" value={formData.extra} onChange={handleChange} className="form-input" placeholder="Interests, Hobbies, Publications, Volunteer Experience..." rows={3} />
        </div>

        <div style={{ marginTop: '2rem', paddingBottom: '1rem' }}>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }} disabled={status === 'generating'}>
            {status === 'generating' ? 'Validating & Formatting...' : status === 'success' ? <><FiCheckCircle /> Resume Created!</> : 'Generate Resume'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResumeForm;
