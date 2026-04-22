const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRuntimeConfig } = require("../src/config/runtimeConfig");

function withPatchedEnv(overrides, callback) {
  const originalEnv = new Map(Object.entries(process.env));

  try {
    Object.assign(process.env, overrides);
    callback();
  } finally {
    Object.keys(process.env).forEach((key) => {
      if (!originalEnv.has(key)) {
        delete process.env[key];
      }
    });

    originalEnv.forEach((value, key) => {
      process.env[key] = value;
    });
  }
}

function createBaseEnv() {
  return {
    MONGODB_URI: "mongodb://127.0.0.1:27017/careerforge_test",
    JWT_SECRET: "x".repeat(40),
    PDF_SIGNING_SECRET: "y".repeat(40)
  };
}

test("validateRuntimeConfig passes when required variables are present and PDF pipeline disabled", () => {
  withPatchedEnv(
    {
      ...createBaseEnv(),
      PDF_PIPELINE_ENABLED: "false",
      OBJECT_STORAGE_BUCKET: ""
    },
    () => {
      assert.doesNotThrow(() => validateRuntimeConfig());
    }
  );
});

test("validateRuntimeConfig allows Mongo fallback storage when PDF pipeline enabled", () => {
  withPatchedEnv(
    {
      ...createBaseEnv(),
      PDF_PIPELINE_ENABLED: "true",
      PDF_STORAGE_MONGO_FALLBACK: "true",
      OBJECT_STORAGE_BUCKET: ""
    },
    () => {
      assert.doesNotThrow(() => validateRuntimeConfig());
    }
  );
});

test("validateRuntimeConfig requires object storage bucket when Mongo fallback is disabled", () => {
  withPatchedEnv(
    {
      ...createBaseEnv(),
      PDF_PIPELINE_ENABLED: "true",
      PDF_STORAGE_MONGO_FALLBACK: "false",
      OBJECT_STORAGE_BUCKET: ""
    },
    () => {
      assert.throws(() => validateRuntimeConfig(), /OBJECT_STORAGE_BUCKET is required/i);

      process.env.OBJECT_STORAGE_BUCKET = "careerforge-test-pdfs";
      assert.doesNotThrow(() => validateRuntimeConfig());
    }
  );
});
