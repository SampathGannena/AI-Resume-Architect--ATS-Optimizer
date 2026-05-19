import express from 'express';
import {
	register,
	login,
	getMe,
	updateProfile,
	resetPassword,
	updatePassword,
	startGoogleOAuth,
	handleGoogleOAuthCallback,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/google', startGoogleOAuth);
router.get('/google/callback', handleGoogleOAuthCallback);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/reset-password', resetPassword);
router.put('/update-password', protect, updatePassword);

export default router;
