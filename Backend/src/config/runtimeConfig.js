function assertPresent(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`${name} is required.`);
  }
}

function assertStrongSecret(name, minLength = 32) {
  assertPresent(name);
  const value = String(process.env[name] || "").trim();

  if (value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters long.`);
  }
}

function isFeatureEnabled(value, defaultEnabled = false) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return defaultEnabled;
  }

  return normalized !== "false" && normalized !== "0";
}

function isPdfPipelineEnabled() {
  return isFeatureEnabled(process.env.PDF_PIPELINE_ENABLED, false);
}

function isMongoPdfFallbackEnabled() {
  return isFeatureEnabled(process.env.PDF_STORAGE_MONGO_FALLBACK, true);
}

function validatePdfPipelineConfig() {
  if (!isPdfPipelineEnabled()) {
    return;
  }

  if (!isMongoPdfFallbackEnabled()) {
    assertPresent("OBJECT_STORAGE_BUCKET");
  }
}

function validateRuntimeConfig() {
  assertPresent("MONGODB_URI");
  assertStrongSecret("JWT_SECRET", 32);
  assertStrongSecret("PDF_SIGNING_SECRET", 32);
  validatePdfPipelineConfig();
}

module.exports = {
  validateRuntimeConfig,
  isPdfPipelineEnabled
};
