import { getGroq } from '../config/groq.js';

const SYSTEM_PROMPTS = {
  'parse-resume': `You are a precise resume parser. Convert the provided resume text into a strict JSON object with this exact structure:
{
  "resumeData": {
    "name": "",
    "headline": "",
    "email": "",
    "phone": "",
    "location": "",
    "links": [{ "label": "", "url": "" }],
    "summary": "",
    "experience": [{ "company": "", "title": "", "location": "", "start_date": "", "end_date": "", "bullets": ["..."] }],
    "education": [{ "school": "", "degree": "", "start_date": "", "end_date": "", "details": "" }],
    "skills": ["..."],
    "projects": [{ "name": "", "description": "", "bullets": ["..."], "link": "" }]
  }
}
Rules:
- Preserve meaning and factual content from the source.
- Experience and project bullets must be arrays of concise one-line bullet strings.
- If a field is unknown, use empty string or empty array.
- Do not include markdown or explanation text. Return JSON only.`,

  'rewrite-resume': `You are an expert ATS (Applicant Tracking System) resume optimizer. Analyze the resume and job description, then return a JSON object with the following structure:
{
  "atsScore": number (0-100),
  "optimizedScore": number (0-100),
  "keywords": [{ "term": "keyword", "importance": "high" }],
  "missingKeywords": [{ "term": "missing keyword", "importance": "high" }],
  "resumeData": {
    "name": "",
    "headline": "",
    "email": "",
    "phone": "",
    "location": "",
    "summary": "",
    "experience": [{ "company": "", "title": "", "location": "", "start_date": "", "end_date": "", "bullets": ["..."] }],
    "education": [{ "school": "", "degree": "", "start_date": "", "end_date": "", "details": "" }],
    "skills": ["..."],
    "projects": [{ "name": "", "description": "", "bullets": ["..."], "link": "" }]
  },
  "suggestions": ["suggestion 1", "suggestion 2"]
}
Only return the JSON object, no other text.`,

  'boost-ats': `You are an expert ATS improvement specialist. The user provides a resume as JSON and a list of missing keywords plus a job description. Return a FULL improved resume in the SAME JSON shape, weaving missing keywords naturally into experience bullets, summary, and skills. Do NOT remove existing factual content. Return a JSON object:
{
  "resumeData": {
    "name": "", "headline": "", "email": "", "phone": "", "location": "", "summary": "",
    "experience": [{ "company": "", "title": "", "location": "", "start_date": "", "end_date": "", "bullets": ["..."] }],
    "education": [{ "school": "", "degree": "", "start_date": "", "end_date": "", "details": "" }],
    "skills": ["..."],
    "projects": [{ "name": "", "description": "", "bullets": ["..."], "link": "" }]
  },
  "addedKeywords": ["keyword1", "keyword2"],
  "boostScore": number,
  "explanation": "what changed"
}
Only return JSON.`,

  'apply-suggestion': `You are an expert ATS resume editor. The user provides current resume JSON, a target job description, and one selected suggestion prompt. Return JSON only:
{
  "resumeData": {
    "name": "", "headline": "", "email": "", "phone": "", "location": "", "summary": "",
    "experience": [{ "company": "", "title": "", "location": "", "start_date": "", "end_date": "", "bullets": ["..."] }],
    "education": [{ "school": "", "degree": "", "start_date": "", "end_date": "", "details": "" }],
    "skills": ["..."],
    "projects": [{ "name": "", "description": "", "bullets": ["..."], "link": "" }]
  },
  "suggestions": ["next suggestion 1", "next suggestion 2"],
  "explanation": "what changed"
}
Apply the selected suggestion by writing stronger, JD-aligned content into summary, experience bullets, project bullets, or skills as appropriate. Preserve factual claims and do not invent employers, degrees, dates, or metrics. Keep every bullet one line. Return the full resumeData shape.`,

  'generate-cover-letter': `You are a professional cover letter writer. Given resume data and job description, write a compelling cover letter in the specified tone. Return a JSON object:
{
  "content": string (the full cover letter text),
  "opening": string (first paragraph),
  "body": string (main paragraphs),
  "closing": string (final paragraph)
}
Only return JSON.`
};

const normalizeKeywords = (keywords) => {
  if (!keywords) return [];
  if (typeof keywords === 'string') {
    return [{ term: keywords, importance: 'medium', presentInResume: false }];
  }
  if (Array.isArray(keywords)) {
    return keywords.map(k => {
      if (typeof k === 'string') {
        return { term: k, importance: 'medium', presentInResume: false };
      }
      return {
        term: k.term || k.word || k.keyword || String(k),
        importance: k.importance || 'medium',
        presentInResume: k.presentInResume || false
      };
    });
  }
  return [];
};

const normalizeResumeData = (resumeData) => {
  if (!resumeData) return null;
  if (typeof resumeData === 'object') return resumeData;

  const text = String(resumeData);
  const lines = text.split('\n').filter(l => l.trim());

  const result = {
    basics: { name: '', email: '', phone: '', location: '', summary: '' },
    experience: [],
    education: [],
    skills: []
  };

  let inExperience = false;
  let inEducation = false;
  let currentExp = null;
  let currentEdu = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes('experience')) {
      inExperience = true; inEducation = false;
    } else if (trimmed.toLowerCase().includes('education')) {
      inEducation = true; inExperience = false;
    } else if (inExperience && trimmed.startsWith('-')) {
      if (!currentExp) currentExp = { company: '', position: '', startDate: '', endDate: '', highlights: [] };
      currentExp.highlights.push(trimmed.substring(1).trim());
    } else if (inExperience && /@/.test(trimmed)) {
      if (currentExp) result.experience.push(currentExp);
      currentExp = { company: trimmed.split('@')[0]?.trim() || '', position: trimmed.split('@')[1]?.trim() || '', startDate: '', endDate: '', highlights: [] };
    } else if (inEducation && /degree|university|college/i.test(trimmed)) {
      if (currentEdu) result.education.push(currentEdu);
      currentEdu = { institution: trimmed, degree: '', field: '', graduationDate: '' };
    } else if (!inExperience && !inEducation && /[\w.-]+@[\w.-]+\.\w+/.test(trimmed)) {
      result.basics.email = trimmed;
    } else if (!inExperience && !inEducation && /^\+?[\d\s()-]{10,}/.test(trimmed)) {
      result.basics.phone = trimmed;
    } else if (!inExperience && !inEducation && trimmed.length > 10 && trimmed.length < 100) {
      result.basics.summary = trimmed;
    }
  }

  if (currentExp) result.experience.push(currentExp);
  if (currentEdu) result.education.push(currentEdu);

  return result;
};

export const callGroqAI = async (promptType, userContent, options = {}) => {
  const systemPrompt = SYSTEM_PROMPTS[promptType];

  if (!systemPrompt) {
    throw new Error(`Unknown AI prompt type: ${promptType}`);
  }

  let userMessage = userContent;

  if (promptType === 'rewrite-resume') {
    userMessage = `Resume:\n${options.resumeText}\n\nJob Description:\n${options.jobDescription}`;
  } else if (promptType === 'parse-resume') {
    userMessage = `Resume:\n${options.resumeText}`;
  } else if (promptType === 'boost-ats') {
    userMessage = `Resume:\n${options.resumeText}\n\nMissing Keywords:\n${options.missingKeywords?.map(k => typeof k === 'string' ? k : k.term)?.join(', ') || ''}\n\nJob Description:\n${options.jobDescription}`;
  } else if (promptType === 'apply-suggestion') {
    userMessage = `Resume Data:\n${JSON.stringify(options.resumeData, null, 2)}\n\nJob Description:\n${options.jobDescription}\n\nSelected Suggestion Prompt:\n${options.suggestion}`;
  } else if (promptType === 'generate-cover-letter') {
    userMessage = `Resume Data:\n${JSON.stringify(options.resumeData, null, 2)}\n\nJob Description:\n${options.jobDescription}\n\nRequested Tone: ${options.tone || 'professional'}`;
  }

  const groq = await getGroq();
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0]?.message?.content;

  if (!response) {
    throw new Error('No response from Groq AI');
  }

  const result = JSON.parse(response);

  if (promptType === 'rewrite-resume') {
    return {
      ...result,
      keywords: normalizeKeywords(result.keywords || result.missingKeywords || []),
      missingKeywords: normalizeKeywords(result.missingKeywords || []),
      resumeData: toEditorResumeShape(normalizeResumeData(result.resumeData)),
    };
  }

  if ((promptType === 'boost-ats' || promptType === 'apply-suggestion') && result.resumeData) {
    return {
      ...result,
      resumeData: toEditorResumeShape(normalizeResumeData(result.resumeData)),
    };
  }

  if (promptType === 'parse-resume') {
    return {
      ...result,
      resumeData: toEditorResumeShape(normalizeResumeData(result.resumeData || result)),
    };
  }

  return result;
};

// Map AI shape ({basics, position, highlights}) → Editor shape ({name, title, bullets}).
const toEditorResumeShape = (rd) => {
  const basics = rd?.basics || {};
  return {
    name: basics.name || rd?.name || '',
    headline: basics.headline || basics.title || rd?.headline || '',
    email: basics.email || rd?.email || '',
    phone: basics.phone || rd?.phone || '',
    location: basics.location || rd?.location || '',
    links: rd?.links || [],
    summary: basics.summary || rd?.summary || '',
    experience: (rd?.experience || []).map((e) => ({
      company: e.company || '',
      title: e.title || e.position || e.role || '',
      location: e.location || '',
      start_date: e.start_date || e.startDate || '',
      end_date: e.end_date || e.endDate || 'Present',
      bullets: Array.isArray(e.bullets) ? e.bullets : Array.isArray(e.highlights) ? e.highlights : [],
    })),
    education: (rd?.education || []).map((ed) => ({
      school: ed.school || ed.institution || '',
      degree: [ed.degree, ed.field].filter(Boolean).join(', ') || ed.degree || '',
      start_date: ed.start_date || ed.startDate || '',
      end_date: ed.end_date || ed.endDate || ed.graduationDate || '',
      details: ed.details || '',
    })),
    skills: Array.isArray(rd?.skills) ? rd.skills : [],
    projects: Array.isArray(rd?.projects)
      ? rd.projects.map((p) => {
          const bullets = Array.isArray(p.bullets)
            ? p.bullets.filter(Boolean)
            : String(p.description || '').split(/\n+/).map((line) => line.replace(/^[-*•●▪◦·]\s*/, '').trim()).filter(Boolean);
          return {
            name: p.name || '',
            description: bullets.join('\n'),
            bullets,
            link: p.link || '',
          };
        })
      : [],
  };
};

export default { callGroqAI };
