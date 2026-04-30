import Subscription from '../models/Subscription.js';

const FREE_RESUME_LIMIT = 3;
const FREE_COVER_LETTER_LIMIT = 3;

export const enforceLimit = (type) => async (req, res, next) => {
  try {
    let sub = await Subscription.findOne({ userId: req.user._id });
    if (!sub) {
      sub = await Subscription.create({ userId: req.user._id });
    }

    if (sub.plan === 'pro') return next();

    if (type === 'resume' && sub.resumesUsed >= FREE_RESUME_LIMIT) {
      return res.status(403).json({
        message: `Free plan limit reached (${FREE_RESUME_LIMIT} resumes). Upgrade to Pro for unlimited.`,
        code: 'LIMIT_REACHED',
      });
    }
    if (type === 'cover' && sub.coverLettersUsed >= FREE_COVER_LETTER_LIMIT) {
      return res.status(403).json({
        message: `Free plan limit reached (${FREE_COVER_LETTER_LIMIT} cover letters). Upgrade to Pro for unlimited.`,
        code: 'LIMIT_REACHED',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requirePro = async (req, res, next) => {
  try {
    let sub = await Subscription.findOne({ userId: req.user._id });
    if (!sub) {
      sub = await Subscription.create({ userId: req.user._id });
    }

    if (sub.plan === 'pro') return next();

    return res.status(403).json({
      message: 'Upgrade to Pro to apply JD suggestion prompts.',
      code: 'PRO_REQUIRED',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { FREE_RESUME_LIMIT, FREE_COVER_LETTER_LIMIT };
