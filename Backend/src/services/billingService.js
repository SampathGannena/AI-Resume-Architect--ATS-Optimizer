const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const {
  normalizeUserId,
  getEntitlementsForUser,
  upsertSubscriptionForUser,
  applyStripeEvent,
  digestPayload
} = require("../store/billingStore");

function loadStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  try {
    const Stripe = require("stripe");
    return new Stripe(secretKey, {
      apiVersion: "2024-06-20"
    });
  } catch {
    return null;
  }
}

async function createCheckoutSession({ userId, email, successUrl, cancelUrl, origin }) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    throw new Error("INVALID_USER_ID");
  }

  const stripe = loadStripeClient();

  if (!stripe || !process.env.STRIPE_PRO_PRICE_ID) {
    const checkoutId = `mock_checkout_${uuidv4()}`;
    return {
      mode: "mock",
      checkoutId,
      checkoutUrl: `${origin}/billing/mock-checkout?session_id=${checkoutId}`,
      note: "Stripe not configured. Running in local mock mode."
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email || undefined,
    line_items: [
      {
        price: process.env.STRIPE_PRO_PRICE_ID,
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: normalizedUserId,
      plan: "pro"
    }
  });

  return {
    mode: "stripe",
    checkoutId: session.id,
    checkoutUrl: session.url,
    stripeCustomerId: session.customer || null
  };
}

async function processMockCheckoutSuccess({ userId }) {
  const subscription = await upsertSubscriptionForUser({
    userId,
    plan: "pro",
    status: "active",
    source: "mock-checkout"
  });

  return {
    ok: true,
    subscription
  };
}

function parseWebhookEvent(req) {
  const stripe = loadStripeClient();
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (stripe && signature && webhookSecret && req.rawBody) {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      webhookSecret
    );

    return {
      source: "stripe",
      event
    };
  }

  return {
    source: "mock",
    event: {
      id: req.body?.id || `mock_evt_${uuidv4()}`,
      type: req.body?.type || "checkout.session.completed",
      data: {
        object: req.body?.data?.object || req.body?.payload || req.body || {}
      }
    }
  };
}

async function applyWebhookEvent(event) {
  const payload = event?.data?.object || {};
  const eventType = event?.type || "unknown";

  const rawUserId =
    payload?.metadata?.userId ||
    payload?.client_reference_id ||
    payload?.userId ||
    null;

  const userId =
    typeof rawUserId === "string" && mongoose.isValidObjectId(rawUserId)
      ? rawUserId
      : null;

  let plan = "free";
  let status = "active";

  if (eventType === "checkout.session.completed") {
    plan = payload?.metadata?.plan || "pro";
    status = "active";
  }

  if (eventType === "customer.subscription.deleted") {
    plan = "free";
    status = "canceled";
  }

  if (eventType === "customer.subscription.updated") {
    plan = payload?.metadata?.plan || payload?.plan || "pro";
    status = payload?.status || "active";
  }

  const result = await applyStripeEvent({
    eventId: event?.id,
    userId,
    eventType,
    payload: {
      ...payload,
      plan,
      status
    }
  });

  return {
    ...result,
    eventType,
    userId: result.userId || userId,
    payloadDigest: digestPayload(payload)
  };
}

function getUserEntitlements(userId) {
  return getEntitlementsForUser(userId);
}

module.exports = {
  createCheckoutSession,
  processMockCheckoutSuccess,
  parseWebhookEvent,
  applyWebhookEvent,
  getUserEntitlements
};
