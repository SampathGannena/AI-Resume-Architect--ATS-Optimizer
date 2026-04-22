const mongoose = require("mongoose");
const PdfJob = require("../models/PdfJob");

const DEFAULT_QUEUE_KEY = "careerforge:pdf:jobs";
const DEFAULT_POLL_INTERVAL_MS = 350;
const DEFAULT_STALE_PROCESSING_MS = 15 * 60 * 1000;
const DEFAULT_STALE_REQUEUE_BATCH_SIZE = 50;
const STALE_SWEEP_MIN_INTERVAL_MS = 10_000;

let lastStaleSweepAt = 0;

function normalizeNumber(value, { fallback, min, max }) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function resolveQueueConfig() {
  const queueKey = String(process.env.PDF_QUEUE_KEY || DEFAULT_QUEUE_KEY).trim() || DEFAULT_QUEUE_KEY;

  return {
    queueKey,
    pollIntervalMs: normalizeNumber(process.env.PDF_QUEUE_POLL_INTERVAL_MS, {
      fallback: DEFAULT_POLL_INTERVAL_MS,
      min: 50,
      max: 5_000
    }),
    staleProcessingMs: normalizeNumber(process.env.PDF_QUEUE_STALE_PROCESSING_MS, {
      fallback: DEFAULT_STALE_PROCESSING_MS,
      min: 30_000,
      max: 12 * 60 * 60 * 1000
    }),
    staleRequeueBatchSize: normalizeNumber(process.env.PDF_QUEUE_STALE_REQUEUE_BATCH_SIZE, {
      fallback: DEFAULT_STALE_REQUEUE_BATCH_SIZE,
      min: 1,
      max: 1_000
    })
  };
}

function normalizeJobId(jobId) {
  const normalized = String(jobId || "").trim();
  if (!normalized) {
    throw new Error("PDF_JOB_ID_REQUIRED");
  }

  if (!mongoose.isValidObjectId(normalized)) {
    throw new Error("PDF_JOB_ID_INVALID");
  }

  return normalized;
}

function normalizeJobIdList(jobIds = []) {
  if (!Array.isArray(jobIds)) {
    return [];
  }

  return jobIds
    .map((jobId) => String(jobId || "").trim())
    .filter(Boolean)
    .filter((jobId) => mongoose.isValidObjectId(jobId));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enqueuePdfJob(jobId) {
  const normalizedJobId = normalizeJobId(jobId);

  await PdfJob.updateOne(
    {
      _id: normalizedJobId,
      status: { $ne: "completed" }
    },
    {
      $set: {
        status: "queued",
        startedAt: null,
        failedAt: null
      }
    }
  );
}

async function enqueueManyPdfJobs(jobIds = []) {
  const normalized = normalizeJobIdList(jobIds);

  if (!normalized.length) {
    return;
  }

  await PdfJob.updateMany(
    {
      _id: { $in: normalized },
      status: { $in: ["queued", "processing", "failed"] }
    },
    {
      $set: {
        status: "queued",
        startedAt: null,
        failedAt: null
      }
    }
  );
}

async function maybeRequeueStaleProcessingJobs(config) {
  const now = Date.now();
  if (now - lastStaleSweepAt < STALE_SWEEP_MIN_INTERVAL_MS) {
    return 0;
  }
  lastStaleSweepAt = now;

  const staleBefore = new Date(now - config.staleProcessingMs);
  const staleJobs = await PdfJob.find({
    status: "processing",
    startedAt: { $lt: staleBefore },
    $expr: { $lt: ["$attempts", "$maxAttempts"] }
  })
    .sort({ startedAt: 1 })
    .limit(config.staleRequeueBatchSize)
    .select({ _id: 1 })
    .lean();

  const staleJobIds = staleJobs
    .map((job) => String(job?._id || "").trim())
    .filter(Boolean);

  if (!staleJobIds.length) {
    return 0;
  }

  await PdfJob.updateMany(
    { _id: { $in: staleJobIds } },
    {
      $set: {
        status: "queued",
        startedAt: null,
        failedAt: null,
        error: "REQUEUED_AFTER_STALE_PROCESSING"
      }
    }
  );

  return staleJobIds.length;
}

async function claimQueuedJob() {
  const claimedJob = await PdfJob.findOneAndUpdate(
    { status: "queued" },
    {
      $set: {
        status: "processing",
        startedAt: new Date()
      }
    },
    {
      sort: { createdAt: 1 },
      new: true
    }
  )
    .select({ _id: 1 })
    .lean();

  if (!claimedJob?._id) {
    return null;
  }

  return String(claimedJob._id);
}

async function reservePdfJob(options = {}) {
  const timeoutSecondsRaw = Number(options.timeoutSeconds || 5);
  const timeoutSeconds = Number.isFinite(timeoutSecondsRaw)
    ? Math.max(1, Math.min(60, Math.trunc(timeoutSecondsRaw)))
    : 5;

  const timeoutMs = timeoutSeconds * 1000;
  const config = resolveQueueConfig();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await maybeRequeueStaleProcessingJobs(config);

    const claimedJobId = await claimQueuedJob();
    if (claimedJobId) {
      return claimedJobId;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await delay(Math.min(config.pollIntervalMs, remainingMs));
  }

  return null;
}

async function closePdfQueueClients() {
  return null;
}

module.exports = {
  resolveQueueConfig,
  enqueuePdfJob,
  enqueueManyPdfJobs,
  reservePdfJob,
  closePdfQueueClients
};
