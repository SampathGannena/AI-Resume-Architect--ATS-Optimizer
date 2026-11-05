import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Resume title is required'],
    trim: true,
  },
  sourceText: {
    type: String,
    default: '',
  },
  jobDescription: {
    type: String,
    default: '',
  },
  resumeData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  template: {
    type: String,
    default: 'modern',
  },
  atsScore: {
    type: Number,
    default: 0,
  },
  optimizedScore: {
    type: Number,
    default: 0,
  },
  aiResult: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);

export default Resume;
