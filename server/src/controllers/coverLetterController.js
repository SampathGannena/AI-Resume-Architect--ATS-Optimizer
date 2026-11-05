import CoverLetter from '../models/CoverLetter.js';
import Resume from '../models/Resume.js';
import { callGroqAI } from '../services/aiService.js';
import { incrementUsage } from './subscriptionController.js';

export const createCoverLetter = async (req, res) => {
  try {
    const { title, content, tone, resumeId } = req.body;

    const coverLetter = await CoverLetter.create({
      userId: req.user._id,
      resumeId: resumeId || null,
      title,
      content,
      tone: tone || 'professional',
    });

    await incrementUsage(req.user._id, 'cover');

    res.status(201).json({ success: true, data: coverLetter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCoverLetters = async (req, res) => {
  try {
    const coverLetters = await CoverLetter.find({ userId: req.user._id })
      .populate('resumeId', 'title')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: coverLetters });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCoverLetter = async (req, res) => {
  try {
    const coverLetter = await CoverLetter.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('resumeId');

    if (!coverLetter) {
      return res.status(404).json({ message: 'Cover letter not found' });
    }

    res.json({ success: true, data: coverLetter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCoverLetter = async (req, res) => {
  try {
    const { title, content, tone } = req.body;

    const coverLetter = await CoverLetter.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title, content, tone },
      { new: true, runValidators: true }
    );

    if (!coverLetter) {
      return res.status(404).json({ message: 'Cover letter not found' });
    }

    res.json({ success: true, data: coverLetter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCoverLetter = async (req, res) => {
  try {
    const coverLetter = await CoverLetter.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!coverLetter) {
      return res.status(404).json({ message: 'Cover letter not found' });
    }

    res.json({ success: true, message: 'Cover letter deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateCoverLetter = async (req, res) => {
  try {
    const { resumeId, jobDescription, tone } = req.body;

    let resumeData = {};

    if (resumeId) {
      const resume = await Resume.findOne({
        _id: resumeId,
        userId: req.user._id,
      });

      if (resume) {
        resumeData = resume.resumeData || {};
      }
    }

    const aiResult = await callGroqAI('generate-cover-letter', null, {
      resumeData,
      jobDescription,
      tone,
    });

    const coverLetter = await CoverLetter.create({
      userId: req.user._id,
      resumeId: resumeId || null,
      title: `Cover Letter - ${new Date().toLocaleDateString()}`,
      content: aiResult.content,
      tone: tone || 'professional',
    });

    await incrementUsage(req.user._id, 'cover');

    res.status(201).json({ success: true, data: { coverLetter, aiResult } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
