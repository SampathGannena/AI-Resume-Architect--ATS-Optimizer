import Subscription from '../models/Subscription.js';

export const getSubscription = async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ userId: req.user._id });

    if (!subscription) {
      subscription = await Subscription.create({ userId: req.user._id });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const { plan } = req.body;

    const subscription = await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      { plan },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const incrementUsage = async (userId, type) => {
  const updateField = type === 'resume' ? 'resumesUsed' : 'coverLettersUsed';

  await Subscription.findOneAndUpdate(
    { userId },
    { $inc: { [updateField]: 1 } }
  );
};
