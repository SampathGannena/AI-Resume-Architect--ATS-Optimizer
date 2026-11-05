import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  resumesUsed: {
    type: Number,
    default: 0,
  },
  coverLettersUsed: {
    type: Number,
    default: 0,
  },
  currentPeriodEnd: {
    type: Date,
    default: () => {
      const now = new Date();
      now.setDate(now.getDate() + 30);
      return now;
    },
  },
  stripeCustomerId: {
    type: String,
    default: null,
  },
  stripeSubscriptionId: {
    type: String,
    default: null,
  },
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
