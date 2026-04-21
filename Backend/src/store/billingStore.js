const crypto = require("crypto");
const mongoose = require("mongoose");
const BillingSubscription = require("../models/BillingSubscription");
const BillingEvent = require("../models/BillingEvent");

function nowIso() {
  return new Date().toISOString();
}

function normalizeUserId(userId) {
  if (typeof userId !== "string") return null;
  const normalized = userId.trim();
  return mongoose.isValidObjectId(normalized) ? normalized : null;
}

function normalizePlan(plan) {
  const normalized = String(plan || "free").toLowerCase();
  return normalized === "pro" ? "pro" : "free";
}

function digestPayload(payload) {
  const json = JSON.stringify(payload || {});
  return crypto.createHash("sha256").update(json).digest("hex");
}

function computeFeatures(plan) {
  return {
    resumeLimit: plan === "pro" ? null : 1,
    premiumTemplates: plan === "pro",
    coverLetters: plan === "pro",
    unlimitedRewrites: plan === "pro"
  };
}

async function resolveUserIdFromStripeCustomer(payload = {}) {
  const stripeCustomerId = payload?.customer || payload?.customerId;
  if (!stripeCustomerId) return null;

  const subscription = await BillingSubscription.findOne({
    stripeCustomerId
  }).select({ userId: 1 }).lean();

  return subscription?.userId ? String(subscription.userId) : null;
}

async function getEntitlementsForUser(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return {
      userId: null,
      plan: "free",
      status: "inactive",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      updatedAt: nowIso(),
      features: computeFeatures("free")
    };
  }

  const subscription = await BillingSubscription.findOne({
    userId: normalizedUserId
  }).lean();

  const plan = normalizePlan(subscription?.plan || "free");

  return {
    userId: normalizedUserId,
    plan,
    status: subscription?.status || "active",
    stripeCustomerId: subscription?.stripeCustomerId || null,
    stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
    updatedAt: subscription?.updatedAt || nowIso(),
    features: computeFeatures(plan)
  };
}

async function upsertSubscriptionForUser({
  userId,
  plan = "free",
  status = "active",
  stripeCustomerId = null,
  stripeSubscriptionId = null,
  source = "system"
}) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    throw new Error("INVALID_USER_ID");
  }

  const normalizedPlan = normalizePlan(plan);

  const current = await BillingSubscription.findOne({
    userId: normalizedUserId
  }).lean();

  const update = {
    plan: normalizedPlan,
    status,
    stripeCustomerId: stripeCustomerId || current?.stripeCustomerId || null,
    stripeSubscriptionId: stripeSubscriptionId || current?.stripeSubscriptionId || null,
    source,
    updatedAt: new Date()
  };

  const subscription = await BillingSubscription.findOneAndUpdate(
    { userId: normalizedUserId },
    {
      $set: update,
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  ).lean();

  return {
    userId: String(subscription.userId),
    plan: subscription.plan,
    status: subscription.status,
    stripeCustomerId: subscription.stripeCustomerId || null,
    stripeSubscriptionId: subscription.stripeSubscriptionId || null,
    source: subscription.source,
    createdAt: toIsoDate(subscription.createdAt),
    updatedAt: toIsoDate(subscription.updatedAt)
  };
}

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function applyStripeEvent({ eventId, userId, eventType, payload }) {
  if (!eventId) {
    return {
      ok: false,
      code: "MISSING_EVENT_ID"
    };
  }

  const existingEvent = await BillingEvent.findOne({ eventId }).lean();
  if (existingEvent) {
    return {
      ok: true,
      duplicate: true,
      eventId,
      userId: String(existingEvent.userId)
    };
  }

  let normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    normalizedUserId = await resolveUserIdFromStripeCustomer(payload);
  }

  if (!normalizedUserId) {
    return {
      ok: false,
      code: "USER_RESOLUTION_FAILED"
    };
  }

  const inferredPlan = payload?.plan || payload?.metadata?.plan || "free";
  const inferredStatus = payload?.status || payload?.subscription_status || "active";
  const stripeCustomerId = payload?.customer || payload?.customerId || null;
  const stripeSubscriptionId = payload?.subscription || payload?.subscriptionId || null;

  const payloadDigest = digestPayload(payload);

  try {
    await BillingEvent.create({
      eventId,
      userId: normalizedUserId,
      eventType,
      payloadDigest,
      payload,
      processedAt: new Date()
    });
  } catch (error) {
    if (error?.code === 11000) {
      return {
        ok: true,
        duplicate: true,
        eventId,
        userId: normalizedUserId
      };
    }

    throw error;
  }

  const subscription = await upsertSubscriptionForUser({
    userId: normalizedUserId,
    plan: inferredPlan,
    status: inferredStatus,
    stripeCustomerId,
    stripeSubscriptionId,
    source: `stripe:${eventType}`
  });

  return {
    ok: true,
    duplicate: false,
    eventId,
    payloadDigest,
    userId: normalizedUserId,
    subscription
  };
}

module.exports = {
  normalizeUserId,
  getEntitlementsForUser,
  upsertSubscriptionForUser,
  applyStripeEvent,
  digestPayload
};
