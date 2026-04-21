const Redis = require("ioredis");

const DEFAULT_QUEUE_KEY = "careerforge:pdf:jobs";

let producerClient = null;
let consumerClient = null;

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return fallback;
}

function resolveQueueConfig() {
  const redisUrl = String(process.env.REDIS_URL || "").trim();
  const queueKey = String(process.env.PDF_QUEUE_KEY || DEFAULT_QUEUE_KEY).trim() || DEFAULT_QUEUE_KEY;

  return {
    redisUrl,
    queueKey,
    keyPrefix: String(process.env.REDIS_KEY_PREFIX || "").trim() || undefined,
    enableReadyCheck: normalizeBoolean(process.env.REDIS_ENABLE_READY_CHECK, true),
    maxRetriesPerRequest: null,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 10_000)
  };
}

function ensureRedisConfigured() {
  const config = resolveQueueConfig();
  if (!config.redisUrl) {
    throw new Error("REDIS_URL is required for PDF queue.");
  }

  return config;
}

function createRedisClient({ role }) {
  const config = ensureRedisConfigured();

  const client = new Redis(config.redisUrl, {
    keyPrefix: config.keyPrefix,
    enableReadyCheck: config.enableReadyCheck,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    connectTimeout: config.connectTimeout
  });

  client.on("error", (error) => {
    console.error(`[pdf-queue:${role}] redis error`, error?.message || error);
  });

  return client;
}

async function getProducerClient() {
  if (!producerClient) {
    producerClient = createRedisClient({ role: "producer" });
  }

  return producerClient;
}

async function getConsumerClient() {
  if (!consumerClient) {
    consumerClient = createRedisClient({ role: "consumer" });
  }

  return consumerClient;
}

function normalizeJobId(jobId) {
  const normalized = String(jobId || "").trim();
  if (!normalized) {
    throw new Error("PDF_JOB_ID_REQUIRED");
  }

  return normalized;
}

async function enqueuePdfJob(jobId) {
  const normalizedJobId = normalizeJobId(jobId);
  const client = await getProducerClient();
  const { queueKey } = resolveQueueConfig();

  await client.lpush(queueKey, normalizedJobId);
}

async function enqueueManyPdfJobs(jobIds = []) {
  const normalized = Array.isArray(jobIds)
    ? jobIds
        .map((jobId) => String(jobId || "").trim())
        .filter(Boolean)
    : [];

  if (!normalized.length) {
    return;
  }

  const client = await getProducerClient();
  const { queueKey } = resolveQueueConfig();
  await client.lpush(queueKey, ...normalized);
}

async function reservePdfJob(options = {}) {
  const timeoutSecondsRaw = Number(options.timeoutSeconds || 5);
  const timeoutSeconds = Number.isFinite(timeoutSecondsRaw)
    ? Math.max(1, Math.min(60, Math.trunc(timeoutSecondsRaw)))
    : 5;

  const client = await getConsumerClient();
  const { queueKey } = resolveQueueConfig();
  const result = await client.brpop(queueKey, timeoutSeconds);

  if (!result) {
    return null;
  }

  return String(result[1] || "").trim() || null;
}

async function closePdfQueueClients() {
  const closeClient = async (client) => {
    if (!client) return;

    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  };

  await closeClient(producerClient);
  await closeClient(consumerClient);

  producerClient = null;
  consumerClient = null;
}

module.exports = {
  resolveQueueConfig,
  enqueuePdfJob,
  enqueueManyPdfJobs,
  reservePdfJob,
  closePdfQueueClients
};
