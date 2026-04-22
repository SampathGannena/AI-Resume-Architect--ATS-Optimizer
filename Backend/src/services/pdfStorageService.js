const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const PdfBinary = require("../models/PdfBinary");

let storageClient = null;

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return fallback;
}

function resolveStorageConfig() {
  return {
    provider: "s3",
    bucket: String(process.env.OBJECT_STORAGE_BUCKET || "").trim(),
    region: String(process.env.OBJECT_STORAGE_REGION || "us-east-1").trim() || "us-east-1",
    endpoint: String(process.env.OBJECT_STORAGE_ENDPOINT || "").trim() || undefined,
    forcePathStyle: normalizeBoolean(process.env.OBJECT_STORAGE_FORCE_PATH_STYLE, false),
    accessKeyId: String(process.env.OBJECT_STORAGE_ACCESS_KEY_ID || "").trim() || undefined,
    secretAccessKey: String(process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || "").trim() || undefined,
    objectPrefix: String(process.env.PDF_OBJECT_PREFIX || "careerforge/pdfs").trim() || "careerforge/pdfs",
    mongoFallbackEnabled: normalizeBoolean(process.env.PDF_STORAGE_MONGO_FALLBACK, true),
    mongoMirrorOnS3Success: normalizeBoolean(process.env.PDF_STORAGE_MONGO_MIRROR_ON_S3_SUCCESS, false)
  };
}

function isS3Configured(config = resolveStorageConfig()) {
  return Boolean(config.bucket);
}

function ensureStorageConfigured(config = resolveStorageConfig()) {
  if (!config.bucket) {
    throw new Error("OBJECT_STORAGE_BUCKET is required for PDF object storage.");
  }

  return config;
}

function createStorageClient() {
  const config = ensureStorageConfigured();

  const credentials = config.accessKeyId && config.secretAccessKey
    ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    : undefined;

  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials
  });
}

function getStorageClient() {
  if (!storageClient) {
    storageClient = createStorageClient();
  }

  return storageClient;
}

function buildPdfObjectKey({
  userId,
  resumeId,
  jobId,
  extension = "pdf"
}) {
  const config = resolveStorageConfig();
  const safeUserId = String(userId || "").trim() || "unknown-user";
  const safeResumeId = String(resumeId || "").trim() || "unknown-resume";
  const safeJobId = String(jobId || "").trim() || Date.now().toString();
  const safeExtension = String(extension || "pdf").trim().replace(/[^a-z0-9]/gi, "") || "pdf";

  return `${config.objectPrefix}/${safeUserId}/${safeResumeId}/${safeJobId}.${safeExtension}`;
}

function computeSha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeStorageKey(value) {
  const key = String(value || "").trim();
  if (!key) {
    throw new Error("OBJECT_STORAGE_KEY_REQUIRED");
  }

  return key;
}

function normalizeObjectMetadata(metadata) {
  return Object.fromEntries(
    Object.entries(metadata || {})
      .map(([field, value]) => [String(field || "").toLowerCase(), String(value || "")])
      .filter(([field, value]) => field && value)
  );
}

async function uploadPdfToS3({
  config,
  key,
  pdfBuffer,
  contentType,
  checksumSha256,
  metadata
}) {
  const client = getStorageClient();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: contentType,
      Metadata: {
        ...normalizeObjectMetadata(metadata),
        checksumsha256: checksumSha256
      }
    })
  );

  return {
    provider: config.provider,
    bucket: config.bucket,
    key,
    byteSize: pdfBuffer.length,
    checksumSha256,
    contentType
  };
}

async function upsertMongoPdfBlob({
  userId,
  resumeId,
  key,
  bucket,
  sourceProvider,
  mirroredFromS3,
  pdfBuffer,
  contentType,
  checksumSha256
}) {
  const normalizedKey = normalizeStorageKey(key);

  const document = await PdfBinary.findOneAndUpdate(
    {
      storageKey: normalizedKey
    },
    {
      userId,
      resumeId,
      storageKey: normalizedKey,
      storageBucket: bucket || null,
      contentType: contentType || "application/pdf",
      byteSize: pdfBuffer.length,
      checksumSha256,
      data: pdfBuffer,
      sourceProvider: sourceProvider || "mongo",
      mirroredFromS3: Boolean(mirroredFromS3)
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return {
    provider: "mongo",
    bucket: null,
    key: document.storageKey,
    byteSize: document.byteSize,
    checksumSha256: document.checksumSha256 || checksumSha256,
    contentType: document.contentType || "application/pdf"
  };
}

async function readMongoPdfBlobByKey(key) {
  const normalizedKey = normalizeStorageKey(key);
  const record = await PdfBinary.findOne({
    storageKey: normalizedKey
  }).select({
    data: 1
  });

  if (!record || !record.data) {
    throw new Error("MONGO_PDF_NOT_FOUND");
  }

  if (Buffer.isBuffer(record.data)) {
    return record.data;
  }

  if (record.data?.buffer) {
    return Buffer.from(record.data.buffer);
  }

  return Buffer.from(record.data);
}

async function uploadPdfBuffer({
  userId,
  resumeId,
  jobId,
  pdfBuffer,
  contentType = "application/pdf",
  metadata = {}
}) {
  if (!Buffer.isBuffer(pdfBuffer) || !pdfBuffer.length) {
    throw new Error("PDF_BUFFER_REQUIRED");
  }

  const config = resolveStorageConfig();
  const key = buildPdfObjectKey({ userId, resumeId, jobId, extension: "pdf" });
  const checksumSha256 = computeSha256(pdfBuffer);

  let lastS3Error = null;

  if (isS3Configured(config)) {
    try {
      const uploadedToS3 = await uploadPdfToS3({
        config,
        key,
        pdfBuffer,
        contentType,
        checksumSha256,
        metadata
      });

      if (config.mongoMirrorOnS3Success) {
        try {
          await upsertMongoPdfBlob({
            userId,
            resumeId,
            key,
            bucket: config.bucket,
            sourceProvider: "s3",
            mirroredFromS3: true,
            pdfBuffer,
            contentType,
            checksumSha256
          });
        } catch (mirrorError) {
          console.error("Mongo mirror write failed after S3 upload", mirrorError);
        }
      }

      return uploadedToS3;
    } catch (error) {
      lastS3Error = error;
    }
  } else {
    lastS3Error = new Error("OBJECT_STORAGE_BUCKET is not configured for S3 upload.");
  }

  if (!config.mongoFallbackEnabled) {
    throw lastS3Error || new Error("S3_UNAVAILABLE_AND_MONGO_FALLBACK_DISABLED");
  }

  if (lastS3Error) {
    console.error("S3 upload unavailable. Falling back to MongoDB PDF storage.", lastS3Error);
  }

  return upsertMongoPdfBlob({
    userId,
    resumeId,
    key,
    bucket: config.bucket || null,
    sourceProvider: "s3-fallback",
    mirroredFromS3: false,
    pdfBuffer,
    contentType,
    checksumSha256
  });
}

async function downloadPdfFromS3({ bucket, key }) {
  const config = ensureStorageConfigured();
  const resolvedBucket = String(bucket || "").trim() || config.bucket;
  const resolvedKey = normalizeStorageKey(key);

  const client = getStorageClient();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: resolvedBucket,
      Key: resolvedKey
    })
  );

  return streamToBuffer(result.Body);
}

async function streamToBuffer(streamLike) {
  if (!streamLike) {
    return Buffer.alloc(0);
  }

  if (Buffer.isBuffer(streamLike)) {
    return streamLike;
  }

  if (typeof streamLike.transformToByteArray === "function") {
    const byteArray = await streamLike.transformToByteArray();
    return Buffer.from(byteArray);
  }

  if (typeof streamLike.arrayBuffer === "function") {
    const arrayBuffer = await streamLike.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const chunks = [];
  for await (const chunk of streamLike) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function downloadPdfBuffer({ provider = "s3", bucket, key }) {
  const resolvedProvider = String(provider || "s3").trim().toLowerCase();
  const resolvedKey = normalizeStorageKey(key);
  const config = resolveStorageConfig();

  if (resolvedProvider === "mongo") {
    return readMongoPdfBlobByKey(resolvedKey);
  }

  try {
    return await downloadPdfFromS3({
      bucket,
      key: resolvedKey
    });
  } catch (s3Error) {
    if (!config.mongoFallbackEnabled) {
      throw s3Error;
    }

    try {
      console.error("S3 download unavailable. Attempting MongoDB fallback.", s3Error);
      return await readMongoPdfBlobByKey(resolvedKey);
    } catch (mongoError) {
      throw new Error(
        `S3 download failed and Mongo fallback did not have the PDF blob. S3: ${s3Error?.message || "unknown"}. Mongo: ${mongoError?.message || "unknown"}`
      );
    }
  }
}

module.exports = {
  resolveStorageConfig,
  uploadPdfBuffer,
  downloadPdfBuffer,
  buildPdfObjectKey
};
