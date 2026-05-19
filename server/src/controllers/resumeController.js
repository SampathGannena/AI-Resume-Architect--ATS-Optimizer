import Resume from '../models/Resume.js';
import { callGroqAI } from '../services/aiService.js';
import { incrementUsage } from './subscriptionController.js';

export const createResume = async (req, res) => {
  try {
    const { title, sourceText, jobDescription, resumeData, template, aiResult, atsScore, optimizedScore } = req.body;

    const resume = await Resume.create({
      userId: req.user._id,
      title,
      sourceText,
      jobDescription,
      resumeData,
      template: template || 'modern',
      atsScore,
      optimizedScore,
      aiResult,
    });

    await incrementUsage(req.user._id, 'resume');

    res.status(201).json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: resumes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateResume = async (req, res) => {
  try {
    const { title, sourceText, jobDescription, resumeData, template, atsScore, optimizedScore, aiResult } = req.body;

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title, sourceText, jobDescription, resumeData, template, atsScore, optimizedScore, aiResult },
      { new: true, runValidators: true }
    );

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({ success: true, data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json({ success: true, message: 'Resume deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rewriteResume = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    const aiResult = await callGroqAI('rewrite-resume', null, {
      resumeText,
      jobDescription,
    });

    const resume = await Resume.create({
      userId: req.user._id,
      title: `Optimized Resume - ${new Date().toLocaleDateString()}`,
      sourceText: resumeText,
      jobDescription,
      resumeData: aiResult.resumeData || {},
      atsScore: aiResult.atsScore || 0,
      optimizedScore: aiResult.optimizedScore || 0,
      aiResult,
    });

    await incrementUsage(req.user._id, 'resume');

    res.status(201).json({ success: true, data: { resume, aiResult } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const parseUploadedResume = async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || String(resumeText).trim().length < 20) {
      return res.status(400).json({ message: 'resumeText is required' });
    }

    const aiResult = await callGroqAI('parse-resume', null, {
      resumeText,
    });

    res.json({
      success: true,
      data: {
        resumeData: aiResult?.resumeData || {},
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to parse resume content' });
  }
};

export const boostAts = async (req, res) => {
  try {
    const { resumeId, resumeText, missingKeywords, jobDescription } = req.body;

    const aiResult = await callGroqAI('boost-ats', null, {
      resumeText,
      missingKeywords,
      jobDescription,
    });

    let resume;
    if (resumeId) {
      resume = await Resume.findOneAndUpdate(
        { _id: resumeId, userId: req.user._id },
        { aiResult: { ...aiResult } },
        { new: true }
      );
    }

    res.json({ success: true, data: { resume, boostResult: aiResult } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const applySuggestionPrompt = async (req, res) => {
  try {
    const { resumeId, resumeData, jobDescription, suggestion } = req.body;

    if (!resumeData || !suggestion || String(suggestion).trim().length < 3) {
      return res.status(400).json({ message: 'resumeData and suggestion are required' });
    }

    const aiResult = await callGroqAI('apply-suggestion', null, {
      resumeData,
      jobDescription,
      suggestion,
    });

    let resume;
    if (resumeId) {
      resume = await Resume.findOneAndUpdate(
        { _id: resumeId, userId: req.user._id },
        {
          resumeData: aiResult.resumeData,
          jobDescription,
          aiResult: { ...aiResult },
        },
        { new: true }
      );
    }

    res.json({ success: true, data: { resume, suggestionResult: aiResult } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
