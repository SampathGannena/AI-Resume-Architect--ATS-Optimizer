export const DEFAULT_ENTITLEMENT_FEATURES = Object.freeze({
  resumeLimit: 1,
  premiumTemplates: false,
  coverLetters: false,
  unlimitedRewrites: false
});

export const PREMIUM_TEMPLATE_IDS = new Set([
  "creative-balance",
  "boardroom-impact",
  "strategy-lead",
  "compact-skills-matrix"
]);

export function normalizeEntitlementFeatures(features) {
  const source = features && typeof features === "object" ? features : {};
  const resumeLimit = Number(source.resumeLimit);

  return {
    resumeLimit: Number.isFinite(resumeLimit) && resumeLimit > 0 ? resumeLimit : 1,
    premiumTemplates: Boolean(source.premiumTemplates),
    coverLetters: Boolean(source.coverLetters),
    unlimitedRewrites: Boolean(source.unlimitedRewrites)
  };
}

export function isPremiumTemplateId(templateId) {
  return PREMIUM_TEMPLATE_IDS.has(String(templateId || "").trim().toLowerCase());
}
