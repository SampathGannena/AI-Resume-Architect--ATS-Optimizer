import React, { useEffect, useMemo, useState } from "react";
import {
  createBillingCheckout,
  getBillingEntitlements,
  simulateBillingSuccess
} from "../api/resumeApi";

function featurePoint(label, enabled, options = {}) {
  return {
    label,
    enabled: Boolean(enabled),
    proOnly: Boolean(options.proOnly)
  };
}

function getFeatureState(point) {
  if (point.enabled) return "included";
  if (point.proOnly) return "locked";
  return "neutral";
}

function FeatureStateIcon({ enabled, proOnly }) {
  if (!enabled && proOnly) {
    return (
      <span className="billing-feature-state locked" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
          <rect x="3" y="7" width="10" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.2 7V5.5C5.2 3.95 6.45 2.7 8 2.7C9.55 2.7 10.8 3.95 10.8 5.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (enabled) {
    return (
      <span className="billing-feature-state included" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
          <path
            d="M3.5 8.3L6.4 11.2L12.5 5.1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="billing-feature-state neutral" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
        <path d="M4 8H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function BillingSkeleton() {
  return (
    <div className="billing-skeleton-wrap" aria-hidden="true">
      <div className="billing-grid">
        <article className="billing-plan-card billing-skeleton-card">
          <div className="billing-plan-head">
            <span className="skeleton-line skeleton-title" />
            <span className="skeleton-line skeleton-tag" />
          </div>
          <div className="billing-skeleton-lines">
            <span className="skeleton-line skeleton-line-full" />
            <span className="skeleton-line skeleton-line-full" />
            <span className="skeleton-line skeleton-line-med" />
          </div>
        </article>

        <article className="billing-plan-card billing-skeleton-card">
          <div className="billing-plan-head">
            <span className="skeleton-line skeleton-title" />
            <span className="skeleton-line skeleton-tag" />
          </div>
          <div className="billing-skeleton-lines">
            <span className="skeleton-line skeleton-line-full" />
            <span className="skeleton-line skeleton-line-full" />
            <span className="skeleton-line skeleton-line-med" />
          </div>
        </article>
      </div>

      <div className="billing-actions-wrap">
        <span className="skeleton-line skeleton-label" />
        <span className="skeleton-input" />
        <div className="billing-skeleton-buttons">
          <span className="skeleton-button" />
          <span className="skeleton-button" />
        </div>
        <span className="skeleton-line skeleton-line-med" />
      </div>
    </div>
  );
}

export default function BillingPage({
  defaultEmail = "",
  onPlanUpgraded,
  onEntitlementsChange,
  onToast
}) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [entitlements, setEntitlements] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isMockUpgrading, setIsMockUpgrading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [lastCheckoutMode, setLastCheckoutMode] = useState("");

  function pushToast(type, title, message, duration = 3200) {
    if (typeof onToast === "function") {
      onToast({ type, title, message, duration });
    }
  }

  async function loadEntitlements(options = {}) {
    const { silent = false, notifyOnSuccess = false } = options;
    setIsLoading(true);
    setError("");

    const result = await getBillingEntitlements();
    if (!result.ok) {
      const message = result.error?.message || "Unable to load billing details right now.";
      setError(message);
      setEntitlements(null);
      setIsLoading(false);
      if (!silent) {
        pushToast("error", "Billing unavailable", message, 4200);
      }
      return;
    }

    const nextEntitlements = result.entitlements || null;
    setEntitlements(nextEntitlements);
    setIsLoading(false);

    if (typeof onEntitlementsChange === "function") {
      onEntitlementsChange(nextEntitlements);
    }

    if (notifyOnSuccess && nextEntitlements) {
      const planName = nextEntitlements.plan === "pro" ? "Pro" : "Free";
      pushToast("success", "Plan synced", `Current plan: ${planName}.`);
    }
  }

  useEffect(() => {
    loadEntitlements({ silent: true });
  }, []);

  const currentPlan = entitlements?.plan || "free";
  const features = entitlements?.features || {
    resumeLimit: 1,
    premiumTemplates: false,
    coverLetters: false,
    unlimitedRewrites: false
  };

  const freePlanPoints = useMemo(
    () => [
      featurePoint("1 resume draft", features.resumeLimit === 1),
      featurePoint("Standard templates", true),
      featurePoint("ATS analysis", true),
      featurePoint("Premium templates", features.premiumTemplates, { proOnly: true }),
      featurePoint("Cover letters", features.coverLetters, { proOnly: true })
    ],
    [features.coverLetters, features.premiumTemplates, features.resumeLimit]
  );

  const proPlanPoints = useMemo(
    () => [
      featurePoint("Unlimited resume drafts", currentPlan === "pro", { proOnly: true }),
      featurePoint("Premium templates", features.premiumTemplates, { proOnly: true }),
      featurePoint("Cover letters", features.coverLetters, { proOnly: true }),
      featurePoint("Unlimited rewrites", features.unlimitedRewrites, { proOnly: true }),
      featurePoint("Priority export workflow", currentPlan === "pro", { proOnly: true })
    ],
    [currentPlan, features.coverLetters, features.premiumTemplates, features.unlimitedRewrites]
  );

  async function handleCheckout() {
    setError("");
    setNotice("");
    setIsCheckoutLoading(true);

    const origin = window.location.origin;
    const result = await createBillingCheckout({
      email,
      successUrl: `${origin}/billing/success`,
      cancelUrl: `${origin}/billing/cancel`
    });

    setIsCheckoutLoading(false);

    if (!result.ok) {
      const message = result.error?.message || "Could not start checkout. Please try again.";
      setError(message);
      pushToast("error", "Checkout failed", message, 4200);
      return;
    }

    const checkout = result.checkout || {};
    setLastCheckoutMode(checkout.mode || "");

    if (checkout.mode === "stripe" && checkout.checkoutUrl) {
      setNotice("Redirecting you to secure Stripe checkout...");
      pushToast("info", "Redirecting", "Opening secure Stripe checkout.");
      window.location.href = checkout.checkoutUrl;
      return;
    }

    if (checkout.mode === "mock") {
      setNotice(
        "Mock checkout initialized. Use the button below to simulate a successful payment and unlock Pro features."
      );
      pushToast("info", "Mock checkout ready", "Run the simulated payment to unlock Pro.");
      return;
    }

    setNotice("Checkout initialized.");
    pushToast("success", "Checkout ready", "Checkout session initialized.");
  }

  async function handleMockUpgrade() {
    setError("");
    setNotice("");
    setIsMockUpgrading(true);

    const result = await simulateBillingSuccess();
    setIsMockUpgrading(false);

    if (!result.ok) {
      const message = result.error?.message || "Unable to complete mock upgrade.";
      setError(message);
      pushToast("error", "Upgrade failed", message, 4200);
      return;
    }

    await loadEntitlements({ silent: true });
    setNotice("Pro plan unlocked successfully.");
    pushToast("success", "Plan upgraded", "Pro plan unlocked successfully.");

    if (typeof onPlanUpgraded === "function") {
      onPlanUpgraded();
    }
  }

  const showSkeleton = isLoading && !entitlements;

  return (
    <div className="billing-screen-wrap">
      <section className="panel billing-hero-card">
        <div className="billing-hero-copy">
          <p className="billing-kicker">Subscription Hub</p>
          <h2>Billing and Plan Management</h2>
          <p className="helper-text">
            Upgrade to Pro for premium templates, unlimited resume drafts, and expanded AI tools.
          </p>
          <div className="billing-hero-meta" aria-hidden="true">
            <span>Secure checkout</span>
            <span>Cancel anytime</span>
            <span>Instant plan sync</span>
          </div>
        </div>
        <div className={`billing-plan-pill ${currentPlan === "pro" ? "pro" : "free"}`}>
          {showSkeleton ? (
            <span className="skeleton-line skeleton-pill" aria-hidden="true" />
          ) : currentPlan === "pro" ? (
            "Active Plan: Pro"
          ) : (
            "Active Plan: Free"
          )}
        </div>
      </section>

      <section className="panel billing-content-card">
        {showSkeleton ? (
          <BillingSkeleton />
        ) : (
          <>
            <div className="billing-grid">
              <article className={`billing-plan-card free-tier ${currentPlan === "free" ? "active" : ""}`}>
                <div className="billing-plan-head">
                  <div>
                    <h3>Free</h3>
                    <p className="billing-plan-subtitle">Great for trying core resume features.</p>
                  </div>
                  <p className="billing-price">$0</p>
                </div>
                <ul className="billing-feature-list">
                  {freePlanPoints.map((point) => {
                    const state = getFeatureState(point);
                    const srText =
                      state === "included"
                        ? "Included"
                        : state === "locked"
                          ? "Locked until Pro"
                          : "Unavailable on this plan";

                    return (
                      <li
                        key={`free-${point.label}`}
                        className={`billing-feature-item ${state}`}
                      >
                        <FeatureStateIcon enabled={point.enabled} proOnly={point.proOnly} />
                        <span className="billing-sr-only">{srText}</span>
                        <span>{point.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </article>

              <article className={`billing-plan-card pro-tier highlight ${currentPlan === "pro" ? "active" : ""}`}>
                <div className="billing-plan-head">
                  <div>
                    <h3>Pro</h3>
                    <p className="billing-plan-subtitle">Built for active job seekers and power users.</p>
                  </div>
                  <p className="billing-price">$9 / month</p>
                </div>
                <ul className="billing-feature-list">
                  {proPlanPoints.map((point) => {
                    const state = getFeatureState(point);
                    const srText =
                      state === "included"
                        ? "Included"
                        : state === "locked"
                          ? "Locked until Pro"
                          : "Unavailable on this plan";

                    return (
                      <li
                        key={`pro-${point.label}`}
                        className={`billing-feature-item ${state}`}
                      >
                        <FeatureStateIcon enabled={point.enabled} proOnly={point.proOnly} />
                        <span className="billing-sr-only">{srText}</span>
                        <span>{point.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            </div>

            <div className="billing-actions-wrap">
              <div className="billing-actions-head">
                <h3>Manage Subscription</h3>
                <p>Choose billing email, start checkout, and refresh your current plan state.</p>
              </div>

              <label className="billing-email-field">
                Billing Email
                <input
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <div className="billing-actions-row">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isCheckoutLoading || currentPlan === "pro"}
                >
                  {isCheckoutLoading ? "Starting Checkout..." : currentPlan === "pro" ? "Pro Active" : "Upgrade to Pro"}
                </button>

                {lastCheckoutMode === "mock" && currentPlan !== "pro" ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleMockUpgrade}
                    disabled={isMockUpgrading}
                  >
                    {isMockUpgrading ? "Applying Upgrade..." : "Simulate Payment Success"}
                  </button>
                ) : null}

                <button
                  type="button"
                  className="secondary"
                  onClick={() => loadEntitlements({ notifyOnSuccess: true })}
                  disabled={isLoading}
                >
                  {isLoading ? "Refreshing..." : "Refresh Plan Status"}
                </button>
              </div>

              {isCheckoutLoading || isMockUpgrading ? (
                <div className="billing-network-skeleton" aria-hidden="true">
                  <span className="skeleton-line skeleton-line-full" />
                  <span className="skeleton-line skeleton-line-med" />
                </div>
              ) : null}

              {notice ? <p className="billing-notice">{notice}</p> : null}
              {error ? <p className="error-text">{error}</p> : null}

              {entitlements ? (
                <p className="helper-text billing-status-line">
                  Status: {entitlements.status || "active"} | Last update: {new Date(entitlements.updatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
