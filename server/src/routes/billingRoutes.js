import express from 'express';
import { createCheckoutSession, createPortalSession, cancelSubscription } from '../controllers/billingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/checkout', protect, createCheckoutSession);
router.post('/portal', protect, createPortalSession);
router.post('/cancel', protect, cancelSubscription);
// /webhook is mounted directly in index.js with raw body parser

export default router;
