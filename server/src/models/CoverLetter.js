import mongoose from 'mongoose';

const coverLetterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    default: null,
  },
  title: {
    type: String,
    required: [true, 'Cover letter title is required'],
    trim: true,
  },
  content: {
    type: String,
    default: '',
  },
  tone: {
    type: String,
    default: 'professional',
  },
}, { timestamps: true });

const CoverLetter = mongoose.model('CoverLetter', coverLetterSchema);

export default CoverLetter;
