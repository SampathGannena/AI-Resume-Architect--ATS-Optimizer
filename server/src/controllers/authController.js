import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const getFrontendAuthUrl = (params = {}) => {
  const appUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  const qs = new URLSearchParams(params).toString();
  return `${appUrl}/auth${qs ? `?${qs}` : ''}`;
};

const getGoogleRedirectUri = () => {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${backendUrl}/api/auth/google/callback`;
};

export const register = async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    await Subscription.create({ userId: user._id });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { displayName, avatarUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { displayName, avatarUrl },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const resetToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset token generated',
      data: { resetToken },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id);
    user.password = password;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password updated successfully',
      data: { token },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const startGoogleOAuth = async (_req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ message: 'Google OAuth is not configured' });
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', getGoogleRedirectUri());
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');

    res.redirect(authUrl.toString());
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to start Google OAuth' });
  }
};

export const handleGoogleOAuthCallback = async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(getFrontendAuthUrl({ oauth_error: String(error) }));
    }

    if (!code) {
      return res.redirect(getFrontendAuthUrl({ oauth_error: 'Missing authorization code' }));
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(getFrontendAuthUrl({ oauth_error: 'Google OAuth is not configured' }));
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getGoogleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData?.access_token) {
      const message = tokenData?.error_description || tokenData?.error || 'Token exchange failed';
      return res.redirect(getFrontendAuthUrl({ oauth_error: String(message) }));
    }

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile?.email) {
      return res.redirect(getFrontendAuthUrl({ oauth_error: 'Failed to fetch Google profile' }));
    }

    const email = String(profile.email).toLowerCase().trim();
    let user = await User.findOne({ email });

    if (!user) {
      const generatedPassword = randomBytes(24).toString('hex');
      user = await User.create({
        email,
        password: generatedPassword,
        displayName: profile.name || email.split('@')[0],
        avatarUrl: profile.picture || '',
      });
    } else {
      const patch = {};
      if (!user.displayName && profile.name) patch.displayName = profile.name;
      if (!user.avatarUrl && profile.picture) patch.avatarUrl = profile.picture;
      if (Object.keys(patch).length > 0) {
        user = await User.findByIdAndUpdate(user._id, patch, { new: true });
      }
    }

    await Subscription.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { upsert: true, new: true }
    );

    const token = generateToken(user._id);
    return res.redirect(getFrontendAuthUrl({ oauth_token: token, oauth_provider: 'google' }));
  } catch (error) {
    return res.redirect(getFrontendAuthUrl({ oauth_error: error.message || 'Google OAuth failed' }));
  }
};
