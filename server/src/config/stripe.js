import Stripe from 'stripe';

let stripeInstance = null;

export const getStripe = () => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
  }
  return stripeInstance;
};

export const STRIPE_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRICE_ID || '';
export const STRIPE_PRO_PLAN_NAME = 'CareerForge Pro';
export const STRIPE_PRO_PLAN_PRICE = 1900; // $19.00 in cents

export default { getStripe, STRIPE_PRICE_ID, STRIPE_PRO_PLAN_NAME, STRIPE_PRO_PLAN_PRICE };
