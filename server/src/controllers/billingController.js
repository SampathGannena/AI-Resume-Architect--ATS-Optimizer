import { getStripe, STRIPE_PRICE_ID, STRIPE_PRO_PLAN_PRICE } from '../config/stripe.js';
import Subscription from '../models/Subscription.js';

export const createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

    const lineItem = STRIPE_PRICE_ID
      ? {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        }
      : {
          price_data: {
            currency: process.env.STRIPE_CURRENCY || 'usd',
            product_data: {
              name: 'CareerForge Pro',
              description: 'Monthly subscription',
            },
            unit_amount: STRIPE_PRO_PLAN_PRICE,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [lineItem],
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard?billing=cancelled`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
      },
      subscription_data: {
        metadata: {
          userId: req.user._id.toString(),
        },
      },
    });

    res.json({ success: true, data: { url: session.url, sessionId: session.id } });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ message: error.message || 'Failed to create checkout session' });
  }
};

export const createPortalSession = async (req, res) => {
  try {
    const stripe = getStripe();
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

    const subscription = await Subscription.findOne({ userId: req.user._id });

    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(400).json({ message: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/dashboard`,
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error('Stripe portal error:', error);
    res.status(500).json({ message: error.message || 'Failed to create portal session' });
  }
};

export const handleWebhook = async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);

          await Subscription.findOneAndUpdate(
            { userId },
            {
              plan: 'pro',
              stripeCustomerId: session.customer,
              stripeSubscriptionId: subscription.id,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
            { upsert: true }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await Subscription.findOneAndUpdate(
            { userId },
            {
              plan: subscription.status === 'active' ? 'pro' : 'free',
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            }
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await Subscription.findOneAndUpdate(
            { userId },
            {
              plan: 'free',
              stripeSubscriptionId: null,
            }
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ message: 'Webhook handler failed' });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const stripe = getStripe();
    const subscription = await Subscription.findOne({ userId: req.user._id });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

    await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      { plan: 'free', stripeSubscriptionId: null }
    );

    res.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: error.message || 'Failed to cancel subscription' });
  }
};
