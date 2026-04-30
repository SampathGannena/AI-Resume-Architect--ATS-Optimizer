import express from 'express';
import {
  createResume,
  getResumes,
  getResume,
  updateResume,
  deleteResume,
  rewriteResume,
  parseUploadedResume,
  boostAts,
  applySuggestionPrompt,
} from '../controllers/resumeController.js';
import { protect } from '../middleware/auth.js';
import { enforceLimit, requirePro } from '../middleware/limits.js';

const router = express.Router();

router.get('/', protect, getResumes);
router.get('/:id', protect, getResume);
router.post('/', protect, enforceLimit('resume'), createResume);
router.put('/:id', protect, updateResume);
router.delete('/:id', protect, deleteResume);
router.post('/rewrite', protect, enforceLimit('resume'), rewriteResume);
router.post('/parse-upload', protect, parseUploadedResume);
router.post('/boost-ats', protect, boostAts);
router.post('/apply-suggestion', protect, requirePro, applySuggestionPrompt);

export default router;
