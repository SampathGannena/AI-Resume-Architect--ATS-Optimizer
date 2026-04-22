const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const {
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
} = require("../store/resumeStore");
const {
  analyzeResumeAgainstJobDescription,
  extractRankedKeywordsFromJobDescription
} = require("../services/atsAnalyzer");
const {
  rewriteBulletWithMetrics,
  rewriteBatchWithMetrics,
  evaluateRewriteQuality
} = require("../services/aiWriterService");
const {
  createCheckoutSession,
  processMockCheckoutSuccess,
  parseWebhookEvent,
  applyWebhookEvent,
  getUserEntitlements
} = require("../services/billingService");
const {
  createPdfJob,
  getPdfJob,
  getLatestPdfForResume,
  resolveSignedAsset
} = require("../services/pdfJobService");
const { defaultResume } = require("../schema/resumeSchema");
const {
  createAiRateLimiter,
  createTimeoutGuard
} = require("../middleware/aiGuards");
const {
  createResumeLimitGuard,
  createPremiumTemplateGuard,
  createCoverLetterGuard
} = require("../middleware/planGuards");
const { parseResumeFromPdfBuffer } = require("../services/pdfResumeImportService");
const {
  listCoverLetterProfiles,
  generateCoverLetter
} = require("../services/coverLetterService");
const { createIpRateLimiter } = require("../middleware/rateGuards");

const router = express.Router();
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.RESUME_PDF_MAX_MB || 5) * 1024 * 1024
  }
});
const aiRateLimiter = createAiRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.AI_RATE_LIMIT_MAX || 100)
});
const aiTimeoutGuard = createTimeoutGuard({
  timeoutMs: Number(process.env.AI_TIMEOUT_MS || 12_000)
});
const dashboardRateLimiter = createIpRateLimiter({
  windowMs: Number(process.env.DASHBOARD_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.DASHBOARD_RATE_LIMIT_MAX || 120),
  code: "DASHBOARD_RATE_LIMITED",
  message: "Too many dashboard requests. Please retry shortly.",
  keyPrefix: "dashboard"
});
const billingRateLimiter = createIpRateLimiter({
  windowMs: Number(process.env.BILLING_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.BILLING_RATE_LIMIT_MAX || 80),
  code: "BILLING_RATE_LIMITED",
  message: "Too many billing requests. Please retry shortly.",
  keyPrefix: "billing"
});
const resumeLimitGuard = createResumeLimitGuard({
  getEntitlements: getUserEntitlements,
  countResumesByUserId
});
const premiumTemplateGuard = createPremiumTemplateGuard({
  getEntitlements: getUserEntitlements,
  premiumTemplateIds: [
    "creative-balance",
    "boardroom-impact",
    "strategy-lead",
    "compact-skills-matrix"
  ]
});
const coverLetterGuard = createCoverLetterGuard({
  getEntitlements: getUserEntitlements
});

function getRequestUserId(req) {
  return req.user?.id || null;
}

function responseAlreadyFinalized(res) {
  return Boolean(res.headersSent || res.writableEnded || res.destroyed);
}

function sendOk(res, payload = {}, status = 200) {
  if (responseAlreadyFinalized(res)) {
    return null;
  }

  return res.status(status).json({
    ok: true,
    ...payload
  });
}

function sendError(res, status, code, message, details) {
  if (responseAlreadyFinalized(res)) {
    return null;
  }

  return res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      details: details || null,
      requestId: res.getHeader("X-Request-Id") || null,
      timestamp: new Date().toISOString()
    }
  });
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (responseAlreadyFinalized(res)) {
        return;
      }

      return sendError(
        res,
        500,
        "UNHANDLED_ROUTE_ERROR",
        "An unexpected server error occurred.",
        {
          reason: error?.message || "Unknown server error"
        }
      );
    }
  };
}

function handleResumePdfUpload(req, res, next) {
  const uploadMiddleware = pdfUpload.single("resumePdf");
  uploadMiddleware(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      const maxMb = Number(process.env.RESUME_PDF_MAX_MB || 5);
      return sendError(
        res,
        400,
        "PDF_FILE_TOO_LARGE",
        `PDF file is too large. Maximum allowed size is ${maxMb} MB.`
      );
    }

    return sendError(
      res,
      400,
      "PDF_UPLOAD_FAILED",
      "The uploaded file could not be processed.",
      {
        reason: error?.message || "Unknown upload error"
      }
    );
  });
}

router.get("/health", (_, res) => {
  sendOk(res, {
    service: "CareerForge Pro API",
    phase: "week-3-production-slice"
  });
});

router.post("/resumes", requireAuth, resumeLimitGuard, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const payload = req.body && Object.keys(req.body).length ? req.body : defaultResume;
  const created = await createResume(payload, { userId });

  if (!created.ok) {
    return sendError(res, 400, "RESUME_VALIDATION_FAILED", "Resume validation failed", {
      validation: created.error
    });
  }

  return sendOk(res, {
    entitlements: req.entitlements || await getUserEntitlements(userId),
    resume: created.value
  }, 201);
}));

router.post("/resumes/import-pdf", requireAuth, handleResumePdfUpload, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);

  if (!req.file || !req.file.buffer) {
    return sendError(res, 400, "PDF_FILE_REQUIRED", "Please upload a resume PDF file.");
  }

  const mimeType = String(req.file.mimetype || "").toLowerCase();
  const hasPdfMime = mimeType.includes("pdf");
  const hasPdfExtension = String(req.file.originalname || "").toLowerCase().endsWith(".pdf");

  if (!hasPdfMime && !hasPdfExtension) {
    return sendError(res, 400, "INVALID_FILE_TYPE", "Only PDF files are supported for resume import.");
  }

  let importedResumeData;
  let templateDetection = null;
  try {
    const parsedImport = await parseResumeFromPdfBuffer(req.file.buffer);
    importedResumeData = parsedImport?.resumeData;
    templateDetection = parsedImport?.templateDetection || null;
  } catch (error) {
    return sendError(
      res,
      400,
      "PDF_PARSE_FAILED",
      "The uploaded PDF could not be parsed. Please upload a clearer text-based resume PDF.",
      {
        reason: error?.message || "Unknown PDF parse error"
      }
    );
  }
  if (!importedResumeData) {
    return sendError(
      res,
      400,
      "PDF_PARSE_FAILED",
      "The uploaded PDF could not be parsed into resume fields. Please try a clearer PDF."
    );
  }

  const entitlements = await getUserEntitlements(userId);
  const limit = entitlements?.features?.resumeLimit;
  const currentCount = await countResumesByUserId(userId);

  if (limit === null || typeof limit === "undefined" || currentCount < limit) {
    const created = await createResume(importedResumeData, { userId });
    if (!created.ok) {
      return sendError(res, 400, "RESUME_IMPORT_VALIDATION_FAILED", "Imported resume data could not be validated.", {
        validation: created.error
      });
    }

    return sendOk(res, {
      importMode: "created",
      resume: created.value,
      entitlements,
      templateDetection
    }, 201);
  }

  const latestResume = await getLatestResumeByUserId(userId);
  if (!latestResume?.id) {
    return sendError(
      res,
      403,
      "PLAN_LIMIT_REACHED",
      "Resume limit reached for current plan. Upgrade to create another draft."
    );
  }

  const updated = await updateResume(latestResume.id, importedResumeData, { userId });
  if (updated.notFound) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  if (!updated.ok) {
    return sendError(res, 400, "RESUME_IMPORT_VALIDATION_FAILED", "Imported resume data could not be validated.", {
      validation: updated.error
    });
  }

  return sendOk(res, {
    importMode: "updated_existing",
    resume: updated.value,
    entitlements,
    templateDetection
  });
}));

router.get("/resumes/:id", requireAuth, asyncRoute(async (req, res) => {
  const resume = await getResumeById(req.params.id, { userId: getRequestUserId(req) });
  if (!resume) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  return sendOk(res, { resume });
}));

router.put("/resumes/:id", requireAuth, asyncRoute(async (req, res) => {
  const updated = await updateResume(req.params.id, req.body || {}, {
    userId: getRequestUserId(req)
  });

  if (updated.notFound) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  if (!updated.ok) {
    return sendError(res, 400, "RESUME_VALIDATION_FAILED", "Resume validation failed", {
      validation: updated.error
    });
  }

  return sendOk(res, { resume: updated.value });
}));

router.get("/resumes/:id/analysis-history", requireAuth, asyncRoute(async (req, res) => {
  const result = await getResumeAnalysisHistory(req.params.id, {
    userId: getRequestUserId(req)
  });
  if (result.notFound) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  return sendOk(res, { history: result.history });
}));

router.get("/resumes/:id/rewrite-history", requireAuth, asyncRoute(async (req, res) => {
  const result = await getResumeRewriteHistory(req.params.id, {
    userId: getRequestUserId(req)
  });
  if (result.notFound) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  return sendOk(res, { history: result.history });
}));

router.get("/resumes/:id/version-history", requireAuth, asyncRoute(async (req, res) => {
  const result = await getResumeVersionHistory(req.params.id, {
    userId: getRequestUserId(req)
  });
  if (result.notFound) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  return sendOk(res, {
    currentVersion: result.currentVersion,
    history: result.history
  });
}));

router.get("/dashboard/summary", requireAuth, dashboardRateLimiter, asyncRoute(async (req, res) => {
  const summary = await getUserDashboardSummary(getRequestUserId(req), {
    limit: req.query?.limit
  });

  return sendOk(res, {
    summary
  });
}));

router.get("/dashboard/resumes", requireAuth, dashboardRateLimiter, asyncRoute(async (req, res) => {
  const resumes = await listResumeDashboardItemsByUserId(getRequestUserId(req), {
    limit: req.query?.limit
  });

  return sendOk(res, {
    resumes
  });
}));

router.get("/dashboard/resumes/:id/iterations", requireAuth, dashboardRateLimiter, asyncRoute(async (req, res) => {
  const resume = await getResumeById(req.params.id, {
    userId: getRequestUserId(req)
  });

  if (!resume) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  const timelineLimitRaw = Number(req.query?.limit || 80);
  const timelineLimit = Number.isFinite(timelineLimitRaw)
    ? Math.max(10, Math.min(200, Math.trunc(timelineLimitRaw)))
    : 80;

  const versionEvents = (resume.versionHistory || []).map((entry) => ({
    eventType: "version",
    createdAt: entry.createdAt,
    eventId: entry.id,
    details: {
      version: entry.version,
      changeSummary: entry.changeSummary,
      createdBy: entry.createdBy
    }
  }));

  const analysisEvents = (resume.analysisHistory || []).map((entry) => ({
    eventType: "analysis",
    createdAt: entry.createdAt,
    eventId: entry.id,
    details: {
      score: entry.score,
      rawScore: entry.rawScore,
      matchedCount: entry.matchedCount,
      missingCount: entry.missingCount,
      deltaFromPreviousScore: entry.deltaFromPreviousScore
    }
  }));

  const rewriteEvents = (resume.rewriteHistory || []).map((entry) => ({
    eventType: "rewrite",
    createdAt: entry.createdAt,
    eventId: entry.id,
    details: {
      bulletIndex: entry.bulletIndex,
      keyword: entry.keyword,
      verdict: entry.verdict,
      qualityScore: entry.qualityScore,
      latencyMs: entry.latencyMs
    }
  }));

  const timeline = [...versionEvents, ...analysisEvents, ...rewriteEvents]
    .sort((a, b) => {
      const left = new Date(a.createdAt || 0).getTime();
      const right = new Date(b.createdAt || 0).getTime();
      return right - left;
    })
    .slice(0, timelineLimit);

  return sendOk(res, {
    resumeId: resume.id,
    currentVersion: resume.currentVersion || 1,
    timeline
  });
}));

router.post("/resumes/analyze", requireAuth, aiRateLimiter, aiTimeoutGuard, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const { resumeId, resumeData, jobDescription } = req.body || {};

  if (!jobDescription || !jobDescription.trim()) {
    return sendError(res, 400, "JOB_DESCRIPTION_REQUIRED", "Job description is required");
  }

  let selectedResumeData = resumeData;

  if (!selectedResumeData && resumeId) {
    const resumeRecord = await getResumeById(resumeId, { userId });
    if (!resumeRecord) {
      return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
    }
    selectedResumeData = resumeRecord.data;
  }

  if (!selectedResumeData) {
    return sendError(
      res,
      400,
      "RESUME_CONTEXT_REQUIRED",
      "Either resumeId or resumeData is required"
    );
  }

  const analysis = analyzeResumeAgainstJobDescription(
    selectedResumeData,
    jobDescription
  );

  let historyEntry = null;
  let history = null;

  if (resumeId) {
    const saved = await saveResumeAnalysis(resumeId, analysis, jobDescription, { userId });

    if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
      return;
    }

    if (saved.ok) {
      historyEntry = saved.value;
      history = saved.history;
    }
  }

  if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
    return;
  }

  return sendOk(res, {
    analysis,
    historyEntry,
    history
  });
}));

router.post("/jd/keywords", requireAuth, aiRateLimiter, aiTimeoutGuard, (req, res) => {
  const { jobDescription } = req.body || {};

  if (!jobDescription || !jobDescription.trim()) {
    return sendError(res, 400, "JOB_DESCRIPTION_REQUIRED", "Job description is required");
  }

  const keywords = extractRankedKeywordsFromJobDescription(jobDescription, 20);
  return sendOk(res, { keywords });
});

router.post("/ai/rewrite-bullet", requireAuth, aiRateLimiter, aiTimeoutGuard, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const { bulletPoint, keyword, jobDescription, resumeId, bulletIndex } = req.body || {};

  if (!bulletPoint || !bulletPoint.trim()) {
    return sendError(res, 400, "BULLET_REQUIRED", "Bullet point is required");
  }

  if (!jobDescription || !jobDescription.trim()) {
    return sendError(res, 400, "JOB_DESCRIPTION_REQUIRED", "Job description is required");
  }

  if (resumeId && !await getResumeById(resumeId, { userId })) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  const rewrite = await rewriteBulletWithMetrics({
    bulletPoint,
    keyword,
    jobDescription
  });

  if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
    return;
  }

  let rewriteHistoryEntry = null;
  let rewriteHistory = null;

  if (resumeId) {
    const saved = await saveResumeRewrite(resumeId, rewrite, {
      sourceBullet: bulletPoint,
      bulletIndex,
      keyword,
      jobDescription
    }, {
      userId
    });

    if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
      return;
    }

    if (saved.ok) {
      rewriteHistoryEntry = saved.value;
      rewriteHistory = saved.history;
    }
  }

  if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
    return;
  }

  return sendOk(res, {
    rewrite,
    rewriteHistoryEntry,
    rewriteHistory
  });
}));

router.post("/ai/rewrite-batch", requireAuth, aiRateLimiter, aiTimeoutGuard, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const { bullets, keywords, jobDescription, resumeId } = req.body || {};

  if (!Array.isArray(bullets) || !bullets.length) {
    return sendError(
      res,
      400,
      "BULLETS_REQUIRED",
      "A non-empty bullets array is required"
    );
  }

  if (!jobDescription || !jobDescription.trim()) {
    return sendError(res, 400, "JOB_DESCRIPTION_REQUIRED", "Job description is required");
  }

  if (resumeId && !await getResumeById(resumeId, { userId })) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  const result = await rewriteBatchWithMetrics({
    bullets,
    keywords,
    jobDescription
  });

  if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
    return;
  }

  if (resumeId) {
    const rewriteEntries = Array.isArray(result.rewrites) ? result.rewrites : [];

    for (const rewrite of rewriteEntries) {
      if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
        return;
      }

      if (rewrite?.removed) {
        continue;
      }

      const sourceIndex = Number.isInteger(rewrite?.originalIndex)
        ? rewrite.originalIndex
        : rewriteEntries.indexOf(rewrite);

      await saveResumeRewrite(resumeId, rewrite, {
        sourceBullet: rewrite?.sourceBullet || bullets[sourceIndex] || "",
        bulletIndex: sourceIndex,
        keyword:
          rewrite?.keywordUsed ||
          (Array.isArray(keywords) ? keywords[sourceIndex] || keywords[0] : undefined),
        jobDescription
      }, {
        userId
      });
    }
  }

  if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
    return;
  }

  return sendOk(res, result);
}));

router.post("/ai/quality-evaluate", requireAuth, aiRateLimiter, aiTimeoutGuard, (req, res) => {
  const { rewrittenBullet, keyword, originalBullet } = req.body || {};

  if (!rewrittenBullet || !rewrittenBullet.trim()) {
    return sendError(
      res,
      400,
      "REWRITTEN_BULLET_REQUIRED",
      "rewrittenBullet is required"
    );
  }

  if (!keyword || !keyword.trim()) {
    return sendError(res, 400, "KEYWORD_REQUIRED", "keyword is required");
  }

  const quality = evaluateRewriteQuality({
    rewrittenBullet,
    keyword,
    originalBullet: originalBullet || ""
  });

  return sendOk(res, { quality });
});

router.get("/cover-letter/profiles", requireAuth, (req, res) => {
  return sendOk(res, {
    profiles: listCoverLetterProfiles()
  });
});

router.post(
  "/cover-letter/generate",
  requireAuth,
  coverLetterGuard,
  aiRateLimiter,
  aiTimeoutGuard,
  asyncRoute(async (req, res) => {
    const userId = getRequestUserId(req);
    const {
      resumeId,
      resumeData,
      jobDescription,
      companyName,
      hiringManagerName,
      tone,
      profileId,
      maxWords
    } = req.body || {};

    if (!jobDescription || !String(jobDescription).trim()) {
      return sendError(
        res,
        400,
        "JOB_DESCRIPTION_REQUIRED",
        "Job description is required for cover letter generation"
      );
    }

    let selectedResumeData = resumeData;

    if (!selectedResumeData && resumeId) {
      const resumeRecord = await getResumeById(resumeId, { userId });
      if (!resumeRecord) {
        return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
      }

      selectedResumeData = resumeRecord.data;
    }

    if (!selectedResumeData) {
      return sendError(
        res,
        400,
        "RESUME_CONTEXT_REQUIRED",
        "Either resumeId or resumeData is required"
      );
    }

    const coverLetter = generateCoverLetter({
      resumeData: selectedResumeData,
      jobDescription,
      companyName,
      hiringManagerName,
      tone,
      profileId,
      maxWords
    });

    if (req.aiTimeoutReached || responseAlreadyFinalized(res)) {
      return;
    }

    return sendOk(res, {
      coverLetter
    });
  })
);

router.post("/pdf/jobs", requireAuth, premiumTemplateGuard, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const { resumeId, templateId, templateLayout, templateMetaTemplateId } = req.body || {};

  if (!resumeId || !String(resumeId).trim()) {
    return sendError(res, 400, "RESUME_ID_REQUIRED", "resumeId is required");
  }

  const resume = await getResumeById(resumeId, { userId });
  if (!resume) {
    return sendError(res, 404, "RESUME_NOT_FOUND", "Resume not found");
  }

  const job = await createPdfJob({
    userId,
    resumeId,
    resumeData: resume.data,
    templateId: templateId || "classic",
    templateLayout,
    templateMetaTemplateId
  });

  return sendOk(res, {
    job
  }, 202);
}));

router.get("/pdf/jobs/:jobId", requireAuth, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const job = await getPdfJob(req.params.jobId, userId);

  if (!job) {
    return sendError(res, 404, "PDF_JOB_NOT_FOUND", "PDF job not found");
  }

  return sendOk(res, { job });
}));

router.get("/resumes/:id/pdf/latest", requireAuth, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const asset = await getLatestPdfForResume(req.params.id, userId);

  if (!asset) {
    return sendError(res, 404, "PDF_NOT_FOUND", "No generated PDF found for this resume");
  }

  return sendOk(res, {
    asset
  });
}));

router.get("/assets/:token", asyncRoute(async (req, res) => {
  const result = await resolveSignedAsset(req.params.token);

  if (!result.ok) {
    const status = result.reason && result.reason.includes("TOKEN") ? 401 : 404;
    return sendError(res, status, "SIGNED_ASSET_INVALID", "Signed asset URL is invalid", {
      reason: result.reason
    });
  }

  const filename = `careerforge-resume-${result.asset.resumeId}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);
  res.setHeader("Cache-Control", "private, max-age=60");
  return res.status(200).send(result.fileBuffer);
}));

router.get("/billing/entitlements", requireAuth, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const entitlements = await getUserEntitlements(userId);

  return sendOk(res, {
    entitlements
  });
}));

router.post("/billing/checkout", requireAuth, billingRateLimiter, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const origin = req.headers.origin || "http://localhost:5173";

  const checkout = await createCheckoutSession({
    userId,
    email: req.body?.email,
    successUrl: req.body?.successUrl || `${origin}/billing/success`,
    cancelUrl: req.body?.cancelUrl || `${origin}/billing/cancel`,
    origin
  });

  return sendOk(res, {
    checkout,
    entitlements: await getUserEntitlements(userId)
  });
}));

router.post("/billing/mock-success", requireAuth, billingRateLimiter, asyncRoute(async (req, res) => {
  const userId = getRequestUserId(req);
  const result = await processMockCheckoutSuccess({ userId });

  return sendOk(res, {
    subscription: result.subscription,
    entitlements: await getUserEntitlements(userId)
  });
}));

router.post("/billing/webhook", billingRateLimiter, asyncRoute(async (req, res) => {
  const parsed = parseWebhookEvent(req);
  const applied = await applyWebhookEvent(parsed.event);

  if (!applied.ok) {
    return sendError(
      res,
      400,
      "WEBHOOK_PROCESSING_FAILED",
      "Failed to process billing webhook event",
      {
        eventType: parsed.event?.type || "unknown"
      }
    );
  }

  return sendOk(res, {
    source: parsed.source,
    eventType: applied.eventType,
    duplicate: Boolean(applied.duplicate),
    userId: applied.userId,
    payloadDigest: applied.payloadDigest
  });
}));

module.exports = router;
