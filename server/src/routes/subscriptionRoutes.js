import express from 'express';
import { getSubscription, updateSubscription } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getSubscription);
router.put('/', protect, updateSubscription);

export default router;
