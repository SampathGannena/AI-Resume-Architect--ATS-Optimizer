import express from 'express';
import {
  createCoverLetter,
  getCoverLetters,
  getCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
  generateCoverLetter,
} from '../controllers/coverLetterController.js';
import { protect } from '../middleware/auth.js';
import { enforceLimit } from '../middleware/limits.js';

const router = express.Router();

router.get('/', protect, getCoverLetters);
router.get('/:id', protect, getCoverLetter);
router.post('/', protect, enforceLimit('cover'), createCoverLetter);
router.put('/:id', protect, updateCoverLetter);
router.delete('/:id', protect, deleteCoverLetter);
router.post('/generate', protect, enforceLimit('cover'), generateCoverLetter);

export default router;
