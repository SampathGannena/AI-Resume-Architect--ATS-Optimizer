function sendPlanError(res, code, message, details) {
  return res.status(403).json({
    ok: false,
    error: {
      code,
      message,
      details: details || null,
      timestamp: new Date().toISOString()
    }
  });
}

function createResumeLimitGuard({ getEntitlements, countResumesByUserId }) {
  return async function resumeLimitGuard(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendPlanError(res, "AUTH_REQUIRED", "Authentication required.");
      }

      const entitlements = await getEntitlements(userId);
      const limit = entitlements?.features?.resumeLimit;

      if (limit === null || typeof limit === "undefined") {
        req.entitlements = entitlements;
        return next();
      }

      const currentCount = await countResumesByUserId(userId);
      if (currentCount >= limit) {
        return sendPlanError(
          res,
          "PLAN_LIMIT_REACHED",
          "Resume limit reached for current plan.",
          {
            plan: entitlements.plan,
            limit,
            currentCount
          }
        );
      }

      req.entitlements = entitlements;
      return next();
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "PLAN_GUARD_ERROR",
          message: "Unable to evaluate plan constraints.",
          details: { reason: error?.message || "Unknown error" },
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

function createPremiumTemplateGuard({ getEntitlements, premiumTemplateIds = [] }) {
  const premiumSet = new Set(premiumTemplateIds);

  return async function premiumTemplateGuard(req, res, next) {
    try {
      const requestedTemplateId = req.body?.templateId;
      if (!requestedTemplateId || !premiumSet.has(requestedTemplateId)) {
        return next();
      }

      const userId = req.user?.id;
      if (!userId) {
        return sendPlanError(res, "AUTH_REQUIRED", "Authentication required.");
      }

      const entitlements = await getEntitlements(userId);

      if (!entitlements?.features?.premiumTemplates) {
        return sendPlanError(
          res,
          "PREMIUM_TEMPLATE_LOCKED",
          "Selected template requires Pro plan.",
          {
            templateId: requestedTemplateId,
            plan: entitlements?.plan || "free"
          }
        );
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "PLAN_GUARD_ERROR",
          message: "Unable to evaluate plan constraints.",
          details: { reason: error?.message || "Unknown error" },
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

function createCoverLetterGuard({ getEntitlements }) {
  return async function coverLetterGuard(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendPlanError(res, "AUTH_REQUIRED", "Authentication required.");
      }

      const entitlements = await getEntitlements(userId);

      if (!entitlements?.features?.coverLetters) {
        return sendPlanError(
          res,
          "COVER_LETTER_LOCKED",
          "Cover letter generation requires Pro plan.",
          {
            plan: entitlements?.plan || "free"
          }
        );
      }

      req.entitlements = entitlements;
      return next();
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: {
          code: "PLAN_GUARD_ERROR",
          message: "Unable to evaluate plan constraints.",
          details: { reason: error?.message || "Unknown error" },
          timestamp: new Date().toISOString()
        }
      });
    }
  };
}

module.exports = {
  createResumeLimitGuard,
  createPremiumTemplateGuard,
  createCoverLetterGuard
};
