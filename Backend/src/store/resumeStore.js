const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const Resume = require("../models/Resume");
const {
  normalizeResumeInput,
  resumeSchema,
  defaultResume
} = require("../schema/resumeSchema");

function nowIso() {
  return new Date().toISOString();
}

function normalizeUserId(userId) {
  if (typeof userId !== "string") return null;
  const normalized = userId.trim();
  return mongoose.isValidObjectId(normalized) ? normalized : null;
}

function canAccessRecord(record, userId) {
  if (!record) return false;
  if (!userId) return true;

  const normalized = normalizeUserId(userId);
  if (!normalized) return false;

  return String(record.userId) === normalized;
}

function summarizeChange(previousData, nextData) {
  const trackedSections = [
    "profile",
    "experience",
    "education",
    "projects",
    "skills",
    "certifications"
  ];

  const changedSections = trackedSections.filter((section) => {
    const prev = JSON.stringify(previousData?.[section] ?? null);
    const next = JSON.stringify(nextData?.[section] ?? null);
    return prev !== next;
  });

  return changedSections.length
    ? `Updated sections: ${changedSections.join(", ")}`
    : "No section changes detected";
}

function toIso(value) {
  if (!value) return null;

  const asDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
}

function serializeResume(record) {
  if (!record) return null;

  const doc = typeof record.toObject === "function" ? record.toObject() : record;

  return {
    id: String(doc._id),
    userId: String(doc.userId),
    data: doc.data,
    currentVersion: doc.currentVersion || 1,
    versionHistory: (doc.versionHistory || []).map((entry) => ({
      ...entry,
      createdAt: toIso(entry.createdAt)
    })),
    analysisHistory: (doc.analysisHistory || []).map((entry) => ({
      ...entry,
      createdAt: toIso(entry.createdAt)
    })),
    rewriteHistory: (doc.rewriteHistory || []).map((entry) => ({
      ...entry,
      createdAt: toIso(entry.createdAt)
    })),
    metadata: {
      createdAt: toIso(doc.metadata?.createdAt) || toIso(doc.createdAt),
      updatedAt: toIso(doc.metadata?.updatedAt) || toIso(doc.updatedAt)
    }
  };
}

async function createResume(payload = defaultResume, options = {}) {
  const normalized = normalizeResumeInput(payload);
  const parsed = resumeSchema.safeParse(normalized);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten()
    };
  }

  const timestamp = new Date();
  const userId = normalizeUserId(options.userId);
  if (!userId) {
    return {
      ok: false,
      error: {
        formErrors: ["Invalid authenticated user context."],
        fieldErrors: {}
      }
    };
  }

  const initialVersion = {
    id: uuidv4(),
    version: 1,
    createdAt: timestamp,
    changeSummary: "Initial draft created",
    createdBy: "system",
    dataSnapshot: parsed.data
  };

  const record = await Resume.create({
    userId,
    data: parsed.data,
    currentVersion: 1,
    versionHistory: [initialVersion],
    analysisHistory: [],
    rewriteHistory: [],
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp
    }
  });

  return { ok: true, value: serializeResume(record) };
}

async function getResumeById(id, options = {}) {
  if (!mongoose.isValidObjectId(id)) return null;

  const userId = normalizeUserId(options.userId);
  if (!userId) return null;

  const record = await Resume.findOne({
    _id: id,
    userId
  }).lean();

  if (!record) return null;

  return serializeResume(record);
}

async function updateResume(id, payload, options = {}) {
  if (!mongoose.isValidObjectId(id)) {
    return { ok: false, notFound: true };
  }

  const userId = normalizeUserId(options.userId);
  if (!userId) {
    return { ok: false, notFound: true };
  }

  const existing = await Resume.findOne({ _id: id, userId });
  if (!existing) {
    return { ok: false, notFound: true };
  }

  const normalized = normalizeResumeInput(payload);
  const parsed = resumeSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.flatten()
    };
  }

  const previousDataSnapshot = existing.data;
  const nextVersion = (existing.currentVersion || 1) + 1;
  existing.data = parsed.data;
  existing.currentVersion = nextVersion;
  existing.versionHistory = [
    ...(existing.versionHistory || []),
    {
      id: uuidv4(),
      version: nextVersion,
      createdAt: new Date(),
      changeSummary: summarizeChange(previousDataSnapshot, parsed.data),
      createdBy: "user",
      dataSnapshot: parsed.data
    }
  ].slice(-50);
  existing.analysisHistory = existing.analysisHistory || [];
  existing.rewriteHistory = existing.rewriteHistory || [];
  existing.metadata = {
    ...(existing.metadata || {}),
    createdAt: existing.metadata?.createdAt || new Date(),
    updatedAt: new Date()
  };

  await existing.save();
  return { ok: true, value: serializeResume(existing) };
}

async function saveResumeAnalysis(id, analysis, jobDescription, options = {}) {
  if (!mongoose.isValidObjectId(id)) {
    return { ok: false, notFound: true };
  }

  const userId = normalizeUserId(options.userId);
  if (!userId) {
    return { ok: false, notFound: true };
  }

  const existing = await Resume.findOne({ _id: id, userId });
  if (!existing) {
    return { ok: false, notFound: true };
  }

  const history = Array.isArray(existing.analysisHistory)
    ? [...existing.analysisHistory]
    : [];
  const previous = history.length ? history[history.length - 1] : null;

  const entry = {
    id: uuidv4(),
    createdAt: new Date(),
    score: analysis.score,
    rawScore: analysis.rawScore,
    matchedCount: analysis.matchedKeywords.length,
    missingCount: analysis.missingKeywords.length,
    sectionBreakdown: analysis.sectionBreakdown,
    jobDescriptionPreview: (jobDescription || "").trim().slice(0, 180),
    deltaFromPreviousScore: previous ? analysis.score - previous.score : null
  };

  existing.analysisHistory = [...history, entry].slice(-30);
  existing.metadata = {
    ...(existing.metadata || {}),
    createdAt: existing.metadata?.createdAt || new Date(),
    updatedAt: new Date()
  };

  await existing.save();
  const serialized = serializeResume(existing);
  return { ok: true, value: serialized.analysisHistory.slice(-1)[0], history: serialized.analysisHistory };
}

async function saveResumeRewrite(id, rewrite, context = {}, options = {}) {
  if (!mongoose.isValidObjectId(id)) {
    return { ok: false, notFound: true };
  }

  const userId = normalizeUserId(options.userId);
  if (!userId) {
    return { ok: false, notFound: true };
  }

  const existing = await Resume.findOne({ _id: id, userId });
  if (!existing) {
    return { ok: false, notFound: true };
  }

  const history = Array.isArray(existing.rewriteHistory)
    ? [...existing.rewriteHistory]
    : [];
  const entry = {
    id: uuidv4(),
    createdAt: new Date(),
    sourceBullet: (context.sourceBullet || "").trim(),
    rewrittenBullet: rewrite?.rewrittenBullet || "",
    bulletIndex:
      Number.isInteger(context.bulletIndex) && context.bulletIndex >= 0
        ? context.bulletIndex
        : null,
    keyword: context.keyword || rewrite?.keywordUsed || null,
    jobDescriptionPreview: (context.jobDescription || "").trim().slice(0, 180),
    latencyMs: rewrite?.latencyMs || 0,
    qualityScore: rewrite?.quality?.qualityScore || 0,
    verdict: rewrite?.quality?.verdict || "unknown",
    keywordIncluded: Boolean(rewrite?.quality?.keywordIncluded)
  };

  existing.rewriteHistory = [...history, entry].slice(-80);
  existing.metadata = {
    ...(existing.metadata || {}),
    createdAt: existing.metadata?.createdAt || new Date(),
    updatedAt: new Date()
  };

  await existing.save();
  const serialized = serializeResume(existing);
  return { ok: true, value: serialized.rewriteHistory.slice(-1)[0], history: serialized.rewriteHistory };
}

async function getResumeAnalysisHistory(id, options = {}) {
  const existing = await getResumeById(id, options);
  if (!existing) {
    return { ok: false, notFound: true };
  }

  return {
    ok: true,
    history: existing.analysisHistory || []
  };
}

async function getResumeRewriteHistory(id, options = {}) {
  const existing = await getResumeById(id, options);
  if (!existing) {
    return { ok: false, notFound: true };
  }

  return {
    ok: true,
    history: existing.rewriteHistory || []
  };
}

async function getResumeVersionHistory(id, options = {}) {
  const existing = await getResumeById(id, options);
  if (!existing) {
    return { ok: false, notFound: true };
  }

  return {
    ok: true,
    currentVersion: existing.currentVersion || 1,
    history: existing.versionHistory || []
  };
}

async function countResumesByUserId(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return 0;
  return Resume.countDocuments({ userId: normalizedUserId });
}

async function getLatestResumeByUserId(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;

  const record = await Resume.findOne({ userId: normalizedUserId })
    .sort({ "metadata.updatedAt": -1 })
    .lean();

  if (!record) return null;
  return serializeResume(record);
}

function buildDashboardItemFromResume(resume) {
  if (!resume) return null;

  const analysisHistory = Array.isArray(resume.analysisHistory) ? resume.analysisHistory : [];
  const rewriteHistory = Array.isArray(resume.rewriteHistory) ? resume.rewriteHistory : [];
  const versionHistory = Array.isArray(resume.versionHistory) ? resume.versionHistory : [];

  const latestAnalysis = analysisHistory.length
    ? analysisHistory[analysisHistory.length - 1]
    : null;
  const latestRewrite = rewriteHistory.length
    ? rewriteHistory[rewriteHistory.length - 1]
    : null;

  const profile = resume.data?.profile || {};

  return {
    id: resume.id,
    profile: {
      fullName: profile.fullName || "",
      title: profile.title || ""
    },
    metadata: resume.metadata || {
      createdAt: null,
      updatedAt: null
    },
    currentVersion: resume.currentVersion || 1,
    versionCount: versionHistory.length,
    analysisCount: analysisHistory.length,
    rewriteCount: rewriteHistory.length,
    latestAnalysis: latestAnalysis
      ? {
          id: latestAnalysis.id,
          createdAt: latestAnalysis.createdAt,
          score: latestAnalysis.score,
          deltaFromPreviousScore: latestAnalysis.deltaFromPreviousScore
        }
      : null,
    latestRewrite: latestRewrite
      ? {
          id: latestRewrite.id,
          createdAt: latestRewrite.createdAt,
          verdict: latestRewrite.verdict,
          qualityScore: latestRewrite.qualityScore,
          keyword: latestRewrite.keyword
        }
      : null
  };
}

function toSafeEpoch(isoValue) {
  if (!isoValue) return 0;
  const asDate = new Date(isoValue);
  return Number.isNaN(asDate.getTime()) ? 0 : asDate.getTime();
}

async function listResumeDashboardItemsByUserId(userId, options = {}) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return [];

  const limitRaw = Number(options.limit || 20);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(50, Math.trunc(limitRaw)))
    : 20;

  const records = await Resume.find({ userId: normalizedUserId })
    .sort({ "metadata.updatedAt": -1 })
    .limit(limit)
    .lean();

  return records
    .map((record) => buildDashboardItemFromResume(serializeResume(record)))
    .filter(Boolean);
}

async function getUserDashboardSummary(userId, options = {}) {
  const limitRaw = Number(options.limit || 25);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(80, Math.trunc(limitRaw)))
    : 25;

  const resumes = await listResumeDashboardItemsByUserId(userId, { limit });

  const totals = resumes.reduce(
    (acc, resume) => {
      acc.resumeCount += 1;
      acc.versionCount += resume.versionCount || 0;
      acc.analysisCount += resume.analysisCount || 0;
      acc.rewriteCount += resume.rewriteCount || 0;
      return acc;
    },
    {
      resumeCount: 0,
      versionCount: 0,
      analysisCount: 0,
      rewriteCount: 0
    }
  );

  const latestUpdatedAt = resumes.length
    ? resumes
        .map((item) => item.metadata?.updatedAt)
        .sort((a, b) => toSafeEpoch(b) - toSafeEpoch(a))[0] || null
    : null;

  return {
    totals,
    latestUpdatedAt,
    recentResumes: resumes.slice(0, 5)
  };
}

module.exports = {
  createResume,
  getResumeById,
  updateResume,
  saveResumeAnalysis,
  saveResumeRewrite,
  getResumeAnalysisHistory,
  getResumeRewriteHistory,
  getResumeVersionHistory,
  countResumesByUserId,
  getLatestResumeByUserId,
  listResumeDashboardItemsByUserId,
  getUserDashboardSummary
};
