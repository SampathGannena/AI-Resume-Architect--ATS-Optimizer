import React, { useCallback, useEffect, useRef, useState } from "react";
import { ResumeProvider, useResume } from "./context/resumeContext";
import ResumeForm from "./components/ResumeForm";
import ResumePreview from "./components/ResumePreview";
import BillingPage from "./components/BillingPage";
import PdfExportPanel from "./components/PdfExportPanel";
import AuthScreen from "./components/AuthScreen";
import MarketingLandingPage from "./components/MarketingLandingPage";
import CareerForgeBrandIcon from "./components/CareerForgeBrandIcon";
import ToastViewport from "./components/ToastViewport";
import ResumeStartChoice from "./components/ResumeStartChoice";
import DashboardPage from "./components/DashboardPage";
import AppFooter from "./components/AppFooter";
import {
  clearAccessToken,
  createResume,
  getAccessToken,
  getBillingEntitlements,
  getCurrentUser,
  getResume,
  importResumeFromPdf,
  loginAccount,
  registerAccount,
  setAccessToken,
  updateResume
} from "./api/resumeApi";
import {
  DEFAULT_ENTITLEMENT_FEATURES,
  normalizeEntitlementFeatures
} from "./constants/entitlements";

const TEMPLATE_ID_STORAGE_KEY = "careerforge.templateId";
const CUSTOM_TEMPLATES_STORAGE_KEY = "careerforge.customTemplates";
const ALLOWED_TEMPLATE_LAYOUTS = new Set([
  "classic",
  "corporate",
  "timeline",
  "modern",
  "nordic",
  "creative",
  "compact",
  "matrix",
  "quickscan",
  "executive",
  "boardroom",
  "strategy"
]);

const bgTokens = [
  { text: "CV", left: "4%", size: "1.3rem", delay: "0s", duration: "20s" },
  { text: "AI", left: "12%", size: "1.1rem", delay: "-6s", duration: "17s" },
  { text: "JD", left: "19%", size: "1rem", delay: "-3s", duration: "19s" },
  { text: "{ }", left: "26%", size: "1.2rem", delay: "-8s", duration: "22s" },
  { text: "[ ]", left: "34%", size: "1rem", delay: "-1s", duration: "18s" },
  { text: "ATS", left: "41%", size: "1.1rem", delay: "-11s", duration: "21s" },
  { text: "API", left: "49%", size: "1rem", delay: "-9s", duration: "20s" },
  { text: "PDF", left: "56%", size: "1.2rem", delay: "-5s", duration: "23s" },
  { text: "UX", left: "63%", size: "1.1rem", delay: "-2s", duration: "18s" },
  { text: "ML", left: "71%", size: "1rem", delay: "-10s", duration: "20s" },
  { text: "SQL", left: "78%", size: "1.2rem", delay: "-4s", duration: "21s" },
  { text: "MERN", left: "86%", size: "1rem", delay: "-7s", duration: "19s" },
  { text: "< />", left: "93%", size: "1.2rem", delay: "-12s", duration: "24s" }
];

const SESSION_LOADING_STAGES = [
  {
    label: "Validating token",
    message: "Verifying your secure access token and session signature..."
  },
  {
    label: "Syncing profile",
    message: "Syncing account profile, permissions, and plan features..."
  },
  {
    label: "Preparing builder",
    message: "Loading templates and preparing your resume workspace..."
  }
];

// Lower ENTER to activate pill mode earlier; raise it to activate later.
const TOPBAR_PILL_SCROLL_ENTER_Y = 42;
const TOPBAR_PILL_SCROLL_EXIT_Y = 16;
const TOPBAR_FAST_SCROLL_VELOCITY_THRESHOLD = 1.05;
const TOPBAR_FAST_SCROLL_RESET_DELAY_MS = 220;

function AnimatedBackground() {
  return (
    <div className="floating-icons-layer" aria-hidden="true">
      {bgTokens.map((token, idx) => (
        <span
          key={`${token.text}-${idx}`}
          className="floating-token"
          style={{
            left: token.left,
            fontSize: token.size,
            animationDelay: token.delay,
            animationDuration: token.duration
          }}
        >
          {token.text}
        </span>
      ))}
    </div>
  );
}

function defaultEntitlementFeatures() {
  return { ...DEFAULT_ENTITLEMENT_FEATURES };
}

function notifyTemplateChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("careerforge-template-changed"));
}

function setTemplateId(templateId) {
  if (typeof window === "undefined") return;
  if (!templateId) return;
  window.localStorage.setItem(TEMPLATE_ID_STORAGE_KEY, templateId);
  notifyTemplateChange();
}

function loadCustomTemplates() {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomTemplates(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(items));
  notifyTemplateChange();
}

function persistImportedTemplate(templateDetection) {
  if (typeof window === "undefined" || !templateDetection) {
    return "";
  }

  const knownTemplateId = String(templateDetection.templateId || "").trim();

  const layoutCandidate = String(templateDetection.layout || "").trim().toLowerCase();
  const layout = ALLOWED_TEMPLATE_LAYOUTS.has(layoutCandidate) ? layoutCandidate : "classic";
  const customTemplateId = String(templateDetection.customTemplateId || "").trim() ||
    `imported-${Date.now()}`;

  const customTemplate = {
    id: customTemplateId,
    name: String(templateDetection.displayName || "Imported PDF Template").trim() || "Imported PDF Template",
    badge: "Imported",
    description:
      String(templateDetection.description || "Detected from uploaded PDF layout.").trim() ||
      "Detected from uploaded PDF layout.",
    layout,
    metaTemplateId:
      String(templateDetection.metaTemplateId || knownTemplateId || "classic").trim() || "classic",
    source: "pdf-import",
    signature: String(templateDetection.signature || "").trim(),
    confidence: Number(templateDetection.confidence || 0)
  };

  const existing = loadCustomTemplates();
  const withoutDuplicate = existing.filter((item) => item.id !== customTemplate.id);
  saveCustomTemplates([customTemplate, ...withoutDuplicate].slice(0, 10));
  setTemplateId(customTemplate.id);

  return customTemplate.id;
}

function BuilderScreen() {
  const { state, dispatch } = useResume();
  const [status, setStatus] = useState("Initializing...");
  const [activeView, setActiveView] = useState("builder");
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionLoaderStep, setSessionLoaderStep] = useState(0);
  const [sessionLoaderProgress, setSessionLoaderProgress] = useState(18);
  const [showResumeSourceChoice, setShowResumeSourceChoice] = useState(false);
  const [resumeSourceError, setResumeSourceError] = useState("");
  const [isCreateFromChoiceLoading, setIsCreateFromChoiceLoading] = useState(false);
  const [isPdfImportLoading, setIsPdfImportLoading] = useState(false);
  const [publicScreen, setPublicScreen] = useState("landing");
  const [currentPlan, setCurrentPlan] = useState("free");
  const [entitlementFeatures, setEntitlementFeatures] = useState(defaultEntitlementFeatures);
  const [isTopbarPillMode, setIsTopbarPillMode] = useState(false);
  const [isTopbarFastScroll, setIsTopbarFastScroll] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const hydrated = useRef(false);
  const saveTimeout = useRef(null);
  const toastTimers = useRef(new Map());
  const userMenuRef = useRef(null);
  const topbarPillModeRef = useRef(false);
  const topbarFastModeRef = useRef(false);

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((entry) => entry.id !== toastId));
    const timer = toastTimers.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(toastId);
    }
  }, []);

  const pushToast = useCallback(
    (payloadOrType, maybeTitle, maybeMessage, maybeDuration) => {
      const payload =
        payloadOrType && typeof payloadOrType === "object"
          ? payloadOrType
          : {
              type: payloadOrType,
              title: maybeTitle,
              message: maybeMessage,
              duration: maybeDuration
            };

      const {
        type = "info",
        title = "",
        message = "",
        duration = 3200
      } = payload || {};

      const cleanedMessage = String(message || "").trim();
      if (!cleanedMessage) {
        return;
      }

      const toastId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const lifetime = Number.isFinite(duration) ? Math.max(1500, duration) : 3200;

      setToasts((prev) => [...prev.slice(-3), { id: toastId, type, title, message: cleanedMessage }]);

      const timer = window.setTimeout(() => {
        dismissToast(toastId);
      }, lifetime);

      toastTimers.current.set(toastId, timer);
    },
    [dismissToast]
  );

  function isAuthErrorResult(result) {
    const code = String(result?.error?.code || "").toUpperCase();
    return result?.status === 401 || code.startsWith("AUTH_");
  }

  const resetSession = useCallback(
    (reason = "Your session expired. Please sign in again.") => {
      clearAccessToken();
      setAuthUser(null);
      setCurrentPlan("free");
      setEntitlementFeatures(defaultEntitlementFeatures());
      setAuthError("");
      setActiveView("builder");
      setShowResumeSourceChoice(false);
      setResumeSourceError("");
      setStatus("Sign in required");
      hydrated.current = false;
      dispatch({ type: "RESET_STATE" });
      pushToast("warning", "Session expired", reason, 4200);
    },
    [dispatch, pushToast]
  );

  const syncEntitlements = useCallback(
    async (options = {}) => {
      const { silent = false } = options;

      if (!authUser?.id) {
        setCurrentPlan("free");
        setEntitlementFeatures(defaultEntitlementFeatures());
        return;
      }

      const result = await getBillingEntitlements();

      if (result.ok) {
        setCurrentPlan(result.entitlements?.plan === "pro" ? "pro" : "free");
        setEntitlementFeatures(normalizeEntitlementFeatures(result.entitlements?.features));
        return;
      }

      if (isAuthErrorResult(result)) {
        resetSession(result.error?.message || "Your session is no longer valid.");
        return;
      }

      setCurrentPlan("free");
      setEntitlementFeatures(defaultEntitlementFeatures());

      if (!silent) {
        pushToast(
          "warning",
          "Plan info unavailable",
          "Using free feature access until plan status is refreshed.",
          3600
        );
      }
    },
    [authUser?.id, pushToast, resetSession]
  );

  function getResumeStorageKey(userId) {
    return `careerforge.resumeId.${userId}`;
  }

  const activateResume = useCallback((resume, userId, statusText) => {
    if (!resume?.id || !userId) {
      return;
    }

    dispatch({ type: "LOAD_RESUME", payload: resume });
    localStorage.setItem(getResumeStorageKey(userId), resume.id);
    setShowResumeSourceChoice(false);
    setResumeSourceError("");
    hydrated.current = true;
    setStatus(statusText);
  }, [dispatch]);

  function getLastSavedText() {
    if (!state.lastSavedAt) return "Not saved yet";
    return `Saved at ${new Date(state.lastSavedAt).toLocaleTimeString()}`;
  }

  const appBrandName = currentPlan === "pro" ? "CareerForge Pro" : "CareerForge";
  const userInitial = String(authUser?.email || "U").trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = appBrandName;
  }, [appBrandName]);

  useEffect(() => {
    if (!authUser || typeof window === "undefined") {
      topbarPillModeRef.current = false;
      topbarFastModeRef.current = false;
      setIsTopbarPillMode(false);
      setIsTopbarFastScroll(false);
      setIsUserMenuOpen(false);
      return;
    }

    const requestFrame =
      window.requestAnimationFrame ||
      ((callback) => window.setTimeout(callback, 16));
    const cancelFrame =
      window.cancelAnimationFrame ||
      ((handle) => window.clearTimeout(handle));

    let frameHandle = 0;
    let rapidResetHandle = 0;
    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let lastTimestamp =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();

    const enableFastScrollMode = () => {
      if (topbarFastModeRef.current) {
        return;
      }
      topbarFastModeRef.current = true;
      setIsTopbarFastScroll(true);
    };

    const disableFastScrollMode = () => {
      if (!topbarFastModeRef.current) {
        return;
      }
      topbarFastModeRef.current = false;
      setIsTopbarFastScroll(false);
    };

    const syncTopbarOnFrame = () => {
      const scrollOffset = window.scrollY || window.pageYOffset || 0;
      const now =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const deltaY = Math.abs(scrollOffset - lastScrollY);
      const deltaTime = Math.max(now - lastTimestamp, 16);
      const velocity = deltaY / deltaTime;
      const isRapidScroll = velocity >= TOPBAR_FAST_SCROLL_VELOCITY_THRESHOLD;

      if (isRapidScroll) {
        enableFastScrollMode();
        if (rapidResetHandle) {
          window.clearTimeout(rapidResetHandle);
        }
        rapidResetHandle = window.setTimeout(() => {
          disableFastScrollMode();
          rapidResetHandle = 0;
        }, TOPBAR_FAST_SCROLL_RESET_DELAY_MS);
      }

      const shouldUsePillMode = topbarPillModeRef.current
        ? scrollOffset > TOPBAR_PILL_SCROLL_EXIT_Y
        : scrollOffset > TOPBAR_PILL_SCROLL_ENTER_Y;

      if (shouldUsePillMode !== topbarPillModeRef.current) {
        topbarPillModeRef.current = shouldUsePillMode;
        setIsTopbarPillMode(shouldUsePillMode);
      }

      lastScrollY = scrollOffset;
      lastTimestamp = now;
      frameHandle = 0;
    };

    const onScroll = () => {
      if (frameHandle) {
        return;
      }
      frameHandle = requestFrame(syncTopbarOnFrame);
    };

    syncTopbarOnFrame();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameHandle) {
        cancelFrame(frameHandle);
      }
      if (rapidResetHandle) {
        window.clearTimeout(rapidResetHandle);
      }
      disableFastScrollMode();
    };
  }, [authUser]);

  useEffect(() => {
    if (!isUserMenuOpen || typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const topbarClassName = `topbar${isTopbarPillMode ? " topbar-pill-mode" : ""}${
    isTopbarFastScroll ? " topbar-scroll-fast" : ""
  }`;

  useEffect(() => {
    async function bootstrap() {
      if (!authUser?.id) {
        return;
      }

      const storageKey = getResumeStorageKey(authUser.id);
      const cachedId = localStorage.getItem(storageKey);
      if (cachedId) {
        const result = await getResume(cachedId);
        if (result.ok && result.resume) {
          activateResume(result.resume, authUser.id, "Draft loaded");
          return;
        }

        if (isAuthErrorResult(result)) {
          resetSession(result.error?.message || "Your session is no longer valid.");
          return;
        }

        localStorage.removeItem(storageKey);
      }

      hydrated.current = false;
      setResumeSourceError("");
      setShowResumeSourceChoice(true);
      setStatus("Choose how to start your resume");
    }

    bootstrap();
  }, [authUser?.id, activateResume, resetSession]);

  useEffect(() => {
    syncEntitlements({ silent: true });
  }, [syncEntitlements]);

  useEffect(() => {
    if (!authUser?.id || !hydrated.current || !state.resumeId) return;

    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    dispatch({ type: "SET_SAVING", payload: true });
    saveTimeout.current = setTimeout(async () => {
      const result = await updateResume(state.resumeId, state.data);
      if (result.ok) {
        dispatch({ type: "SET_LAST_SAVED", payload: result.resume.metadata.updatedAt });
        setStatus("All changes saved");
      } else {
        if (isAuthErrorResult(result)) {
          resetSession(result.error?.message || "Your session is no longer valid.");
          return;
        }

        setStatus("Autosave failed");
        pushToast("error", "Autosave failed", result.error?.message || "Could not save draft changes.", 4200);
      }
      dispatch({ type: "SET_SAVING", payload: false });
    }, 600);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [authUser?.id, state.data, state.resumeId, dispatch, pushToast, resetSession]);

  useEffect(() => {
    async function hydrateAuthSession() {
      const token = getAccessToken();
      if (!token) {
        setIsAuthLoading(false);
        setStatus("Sign in required");
        return;
      }

      const result = await getCurrentUser();
      if (result.ok && result.user) {
        setAuthUser(result.user);
        setStatus("Authenticated");
      } else {
        clearAccessToken();
        setAuthUser(null);
        setStatus("Sign in required");
      }

      setIsAuthLoading(false);
    }

    hydrateAuthSession();
  }, []);

  useEffect(() => {
    if (!authUser?.id) {
      hydrated.current = false;
      setCurrentPlan("free");
      setEntitlementFeatures(defaultEntitlementFeatures());
      setShowResumeSourceChoice(false);
      setResumeSourceError("");
      dispatch({ type: "RESET_STATE" });
      return;
    }

    hydrated.current = false;
    setShowResumeSourceChoice(false);
    setResumeSourceError("");
    dispatch({ type: "RESET_STATE" });
    setStatus("Initializing...");
  }, [authUser?.id, dispatch]);

  async function handleLogin(credentials) {
    setAuthError("");
    setIsAuthSubmitting(true);

    const result = await loginAccount(credentials);
    setIsAuthSubmitting(false);

    if (!result.ok || !result.token || !result.user) {
      const message = result.error?.message || "Unable to sign in with these credentials.";
      setAuthError(message);
      pushToast("error", "Sign in failed", message, 4200);
      return;
    }

    setAccessToken(result.token);
    setAuthUser(result.user);
    setPublicScreen("landing");
    setStatus("Authenticated");
    pushToast("success", "Signed in", "Session restored and ready.");
  }

  async function handleRegister(credentials) {
    setAuthError("");
    setIsAuthSubmitting(true);

    const result = await registerAccount(credentials);
    setIsAuthSubmitting(false);

    if (!result.ok || !result.token || !result.user) {
      const message = result.error?.message || "Unable to create your account.";
      setAuthError(message);
      pushToast("error", "Registration failed", message, 4200);
      return;
    }

    setAccessToken(result.token);
    setAuthUser(result.user);
    setPublicScreen("landing");
    setStatus("Authenticated");
    pushToast("success", "Account created", "Your secure account is now active.");
  }

  async function handleCreateFromChoice() {
    if (!authUser?.id) {
      return;
    }

    setResumeSourceError("");
    setIsCreateFromChoiceLoading(true);

    const created = await createResume();
    setIsCreateFromChoiceLoading(false);

    if (!created.ok || !created.resume) {
      if (isAuthErrorResult(created)) {
        resetSession(created.error?.message || "Your session is no longer valid.");
        return;
      }

      const message = created.error?.message || "Could not create a new resume draft.";
      setResumeSourceError(message);
      pushToast("error", "Draft init failed", message, 4200);
      return;
    }

    activateResume(created.resume, authUser.id, "New draft created");
    pushToast("success", "Draft ready", "Resume editor is ready.");
  }

  async function handlePdfImport(file) {
    if (!authUser?.id) {
      return;
    }

    const fileType = String(file?.type || "").toLowerCase();
    const isPdfByMime = fileType.includes("pdf");
    const isPdfByExtension = String(file?.name || "").toLowerCase().endsWith(".pdf");

    if (!file || (!isPdfByMime && !isPdfByExtension)) {
      const message = "Please select a valid PDF file.";
      setResumeSourceError(message);
      pushToast("warning", "Invalid file", message);
      return;
    }

    setResumeSourceError("");
    setIsPdfImportLoading(true);

    const imported = await importResumeFromPdf(file);
    setIsPdfImportLoading(false);

    if (!imported.ok || !imported.resume) {
      if (isAuthErrorResult(imported)) {
        resetSession(imported.error?.message || "Your session is no longer valid.");
        return;
      }

      const message = imported.error?.message || "Could not import this PDF resume.";
      setResumeSourceError(message);
      pushToast("error", "PDF import failed", message, 4200);
      return;
    }

    const importedStatus = imported.importMode === "updated_existing"
      ? "Imported PDF into your editable draft"
      : "Imported PDF draft ready";

    activateResume(imported.resume, authUser.id, importedStatus);
    const importedTemplateId = persistImportedTemplate(imported.templateDetection);
    if (importedTemplateId) {
      pushToast("info", "Template detected", "Preview switched to the imported PDF template style.", 3600);
    }
    pushToast("success", "Resume imported", "Your uploaded resume is now editable.");
  }

  function handleLogout() {
    clearAccessToken();
    setAuthUser(null);
    setIsUserMenuOpen(false);
    setCurrentPlan("free");
    setEntitlementFeatures(defaultEntitlementFeatures());
    setAuthError("");
    setActiveView("builder");
    setShowResumeSourceChoice(false);
    setResumeSourceError("");
    setPublicScreen("landing");
    setStatus("Signed out");
    pushToast("info", "Signed out", "Your session has ended.");
  }

  useEffect(() => {
    return () => {
      toastTimers.current.forEach((timer) => clearTimeout(timer));
      toastTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      return;
    }

    setSessionLoaderStep(0);
    setSessionLoaderProgress(18);

    const timer = window.setInterval(() => {
      setSessionLoaderStep((prev) => (prev + 1) % SESSION_LOADING_STAGES.length);
      setSessionLoaderProgress((prev) => {
        const cap = 92;
        const growth = Math.max(3, Math.round((cap - prev) * 0.2));
        return Math.min(cap, prev + growth);
      });
    }, 900);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAuthLoading]);

  if (isAuthLoading) {
    const activeLoadingStage = SESSION_LOADING_STAGES[sessionLoaderStep] || SESSION_LOADING_STAGES[0];

    return (
      <div className="app-shell">
        <AnimatedBackground />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        <main className="auth-screen-wrap">
          <section className="panel auth-card auth-loading-card" role="status" aria-live="polite" aria-busy="true">
            <div className="auth-loading-top">
              <div className="auth-loader-orb" aria-hidden="true">
                <span />
              </div>
              <div>
                <p className="auth-kicker">Secure Session</p>
                <h2>Checking Your Session</h2>
                <p className="helper-text">{activeLoadingStage.message}</p>
              </div>
            </div>

            <div className="auth-loading-progress" aria-hidden="true">
              <span style={{ width: `${sessionLoaderProgress}%` }} />
            </div>

            <p className="auth-loading-current-step" aria-live="polite">
              Current step: {activeLoadingStage.label}
            </p>

            <div className="auth-loading-steps" aria-hidden="true">
              {SESSION_LOADING_STAGES.map((stage, index) => (
                <span
                  key={stage.label}
                  className={sessionLoaderStep === index ? "active" : ""}
                >
                  {stage.label}
                </span>
              ))}
            </div>

            <div className="auth-loading-skeleton" aria-hidden="true">
              <span className="skeleton-line skeleton-line-full" />
              <span className="skeleton-line skeleton-line-med" />
              <span className="skeleton-line skeleton-line-short" />
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="app-shell">
        <AnimatedBackground />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        {publicScreen === "landing" ? (
          <MarketingLandingPage
            brandName={appBrandName}
            scannerResumeData={state.data}
            onGetStarted={() => {
              setAuthError("");
              setPublicScreen("auth");
            }}
            onOpenAuth={() => {
              setAuthError("");
              setPublicScreen("auth");
            }}
          />
        ) : (
          <div className="auth-gateway-wrap">
            <button
              type="button"
              className="public-back-link"
              onClick={() => {
                setAuthError("");
                setPublicScreen("landing");
              }}
            >
              Back to product highlights
            </button>
            <AuthScreen
              onLogin={handleLogin}
              onRegister={handleRegister}
              isSubmitting={isAuthSubmitting}
              errorMessage={authError}
              brandName={appBrandName}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell app-auth-shell">
      <AnimatedBackground />
      <header className={topbarClassName}>
        <div className="topbar-brand-wrap">
          <div className="topbar-brand-title" aria-label={`${appBrandName} brand mark`}>
            <span className="topbar-brand-icon" aria-hidden="true">
              <CareerForgeBrandIcon />
            </span>
            <h1>{appBrandName}</h1>
          </div>
          <div className="topbar-nav-tabs" role="tablist" aria-label="Main screens">
            <button
              type="button"
              className={`topbar-tab ${activeView === "builder" ? "active" : ""}`}
              onClick={() => {
                setActiveView("builder");
                setIsUserMenuOpen(false);
              }}
            >
              Resume Studio
            </button>
            <button
              type="button"
              className={`topbar-tab ${activeView === "dashboard" ? "active" : ""}`}
              onClick={() => {
                setActiveView("dashboard");
                setIsUserMenuOpen(false);
              }}
            >
              Dashboard
            </button>
          </div>
        </div>
        <div className="topbar-actions" ref={userMenuRef}>
          <button
            type="button"
            className={`topbar-user-trigger ${isUserMenuOpen ? "open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
            aria-label="Open account menu"
            onClick={() => setIsUserMenuOpen((previous) => !previous)}
          >
            <span className="topbar-user-avatar" aria-hidden="true">{userInitial}</span>
            <span className="topbar-user-chevron" aria-hidden="true" />
          </button>

          {isUserMenuOpen ? (
            <div className="topbar-user-menu" role="menu" aria-label="Account actions">
              <div className="topbar-user-menu-meta">
                <p className="topbar-user-menu-email">{authUser.email}</p>
                <p className="topbar-user-menu-plan">{currentPlan === "pro" ? "Pro Plan" : "Free Plan"}</p>
              </div>

              <div className="topbar-user-menu-stats" aria-live="polite">
                <p>
                  <span>Session</span>
                  <strong>{status}</strong>
                </p>
                <p>
                  <span>Autosave</span>
                  <strong>{state.isSaving ? "Saving..." : "Idle"}</strong>
                </p>
                <p>
                  <span>Last Save</span>
                  <strong>{getLastSavedText()}</strong>
                </p>
              </div>

              <div className="topbar-user-menu-actions">
                <button
                  type="button"
                  className={`topbar-tab topbar-billing-pill topbar-user-menu-button ${activeView === "billing" ? "active" : ""}`}
                  onClick={() => {
                    setActiveView("billing");
                    setIsUserMenuOpen(false);
                  }}
                >
                  Billing
                </button>
                <button
                  type="button"
                  className="secondary topbar-user-menu-button"
                  onClick={() => {
                    setActiveView("builder");
                    setResumeSourceError("");
                    setShowResumeSourceChoice(true);
                    setIsUserMenuOpen(false);
                  }}
                >
                  New or Upload
                </button>
                <button
                  type="button"
                  className="secondary topbar-user-menu-button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout();
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      <div className="app-auth-content">
        {activeView === "builder" ? (
          showResumeSourceChoice ? (
            <ResumeStartChoice
              onCreateResume={handleCreateFromChoice}
              onUploadResume={handlePdfImport}
              isCreating={isCreateFromChoiceLoading}
              isUploading={isPdfImportLoading}
              errorMessage={resumeSourceError}
            />
          ) : (
            <>
              <main className="split-layout">
                <ResumeForm
                  entitlements={entitlementFeatures}
                  onOpenBilling={() => setActiveView("billing")}
                />
                <ResumePreview
                  entitlements={entitlementFeatures}
                  onOpenBilling={() => setActiveView("billing")}
                />
              </main>
              <section className="week3-export-layout">
                <PdfExportPanel
                  resumeId={state.resumeId}
                  entitlements={entitlementFeatures}
                  onOpenBilling={() => setActiveView("billing")}
                  onToast={pushToast}
                />
              </section>
            </>
          )
        ) : null}

        {activeView === "dashboard" ? (
          <DashboardPage
            resumeId={state.resumeId}
            resumeData={state.data}
            entitlements={entitlementFeatures}
            onOpenBilling={() => setActiveView("billing")}
            onToast={pushToast}
          />
        ) : null}

        {activeView === "billing" ? (
          <main className="billing-layout">
            <BillingPage
              defaultEmail={state.data?.profile?.email || authUser.email || ""}
              onPlanUpgraded={async () => {
                await syncEntitlements({ silent: true });
                setActiveView("builder");
              }}
              onEntitlementsChange={(nextEntitlements) => {
                setCurrentPlan(nextEntitlements?.plan === "pro" ? "pro" : "free");
                setEntitlementFeatures(normalizeEntitlementFeatures(nextEntitlements?.features));
              }}
              onToast={pushToast}
            />
          </main>
        ) : null}
      </div>

      <AppFooter
        brandName={appBrandName}
        activeView={activeView}
        currentPlan={currentPlan}
        entitlements={entitlementFeatures}
        onNavigate={setActiveView}
        onStartNew={() => {
          setActiveView("builder");
          setResumeSourceError("");
          setShowResumeSourceChoice(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ResumeProvider>
      <BuilderScreen />
    </ResumeProvider>
  );
}
