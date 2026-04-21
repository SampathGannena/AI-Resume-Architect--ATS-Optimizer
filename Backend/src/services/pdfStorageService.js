const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");

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
    objectPrefix: String(process.env.PDF_OBJECT_PREFIX || "careerforge/pdfs").trim() || "careerforge/pdfs"
  };
}

function ensureStorageConfigured() {
  const config = resolveStorageConfig();
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
  const config = ensureStorageConfigured();
  const safeUserId = String(userId || "").trim() || "unknown-user";
  const safeResumeId = String(resumeId || "").trim() || "unknown-resume";
  const safeJobId = String(jobId || "").trim() || Date.now().toString();
  const safeExtension = String(extension || "pdf").trim().replace(/[^a-z0-9]/gi, "") || "pdf";

  return `${config.objectPrefix}/${safeUserId}/${safeResumeId}/${safeJobId}.${safeExtension}`;
}

function computeSha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
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

  const config = ensureStorageConfigured();
  const key = buildPdfObjectKey({ userId, resumeId, jobId, extension: "pdf" });
  const checksumSha256 = computeSha256(pdfBuffer);

  const client = getStorageClient();
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: contentType,
      Metadata: {
        ...Object.fromEntries(
          Object.entries(metadata || {})
            .map(([field, value]) => [String(field || "").toLowerCase(), String(value || "")])
            .filter(([field, value]) => field && value)
        ),
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

async function downloadPdfBuffer({ bucket, key }) {
  const config = ensureStorageConfigured();
  const resolvedBucket = String(bucket || "").trim() || config.bucket;
  const resolvedKey = String(key || "").trim();

  if (!resolvedKey) {
    throw new Error("OBJECT_STORAGE_KEY_REQUIRED");
  }

  const client = getStorageClient();
  const result = await client.send(
    new GetObjectCommand({
      Bucket: resolvedBucket,
      Key: resolvedKey
    })
  );

  return streamToBuffer(result.Body);
}

module.exports = {
  resolveStorageConfig,
  uploadPdfBuffer,
  downloadPdfBuffer,
  buildPdfObjectKey
};
