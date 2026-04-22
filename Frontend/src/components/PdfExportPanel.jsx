import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createPdfJob,
  getLatestResumePdf,
  getPdfJob
} from "../api/resumeApi";
import { ATS_TEMPLATES } from "../templates/templateMeta";
import {
  DEFAULT_ENTITLEMENT_FEATURES,
  isPremiumTemplateId
} from "../constants/entitlements";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
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
const BUILT_IN_LAYOUT_BY_TEMPLATE = ATS_TEMPLATES.reduce((acc, template) => {
  acc[template.id] = template.layout;
  return acc;
}, {});

function normalizeLayoutCandidate(layoutCandidate, fallbackLayout = "classic") {
  const normalized = String(layoutCandidate || "").trim().toLowerCase();
  if (ALLOWED_TEMPLATE_LAYOUTS.has(normalized)) {
    return normalized;
  }

  return fallbackLayout;
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

function getSelectedTemplateConfig() {
  if (typeof window === "undefined") {
    return {
      templateId: "classic",
      templateLayout: "classic",
      templateMetaTemplateId: "classic"
    };
  }

  const selectedTemplateId = window.localStorage.getItem("careerforge.templateId") || "classic";
  const customTemplate = loadCustomTemplates().find((template) => template.id === selectedTemplateId);

  if (customTemplate) {
    const fallbackLayout = normalizeLayoutCandidate(
      BUILT_IN_LAYOUT_BY_TEMPLATE[String(customTemplate.metaTemplateId || "").trim().toLowerCase()],
      "classic"
    );

    return {
      templateId: selectedTemplateId,
      templateLayout: normalizeLayoutCandidate(customTemplate.layout, fallbackLayout),
      templateMetaTemplateId:
        String(customTemplate.metaTemplateId || "").trim() ||
        String(selectedTemplateId || "classic").trim() ||
        "classic"
    };
  }

  return {
    templateId: selectedTemplateId,
    templateLayout: normalizeLayoutCandidate(BUILT_IN_LAYOUT_BY_TEMPLATE[selectedTemplateId], "classic"),
    templateMetaTemplateId: selectedTemplateId
  };
}

function getSelectedTemplateId() {
  return getSelectedTemplateConfig().templateId;
}

function formatStatus(status) {
  if (!status) return "Idle";
  if (status === "queued") return "Queued";
  if (status === "processing") return "Rendering";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return status;
}

function progressFromStatus(status) {
  if (status === "queued") return 20;
  if (status === "processing") return 70;
  if (status === "completed") return 100;
  if (status === "failed") return 100;
  return 0;
}

function toAssetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  try {
    return new URL(path, API_BASE).toString();
  } catch {
    return path;
  }
}

function LockIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M5.2 7V5.4C5.2 3.93 6.43 2.7 7.9 2.7H8.1C9.57 2.7 10.8 3.93 10.8 5.4V7"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PdfExportPanel({
  resumeId,
  entitlements = DEFAULT_ENTITLEMENT_FEATURES,
  onOpenBilling,
  onToast
}) {
  const [templateId, setTemplateId] = useState(() => getSelectedTemplateId());
  const [job, setJob] = useState(null);
  const [latestAsset, setLatestAsset] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLatest, setIsFetchingLatest] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const pollRef = useRef(null);
  const previousStatusRef = useRef("");

  function pushToast(type, title, message, duration = 3200) {
    if (typeof onToast === "function") {
      onToast({ type, title, message, duration });
    }
  }

  useEffect(() => {
    const syncTemplate = () => {
      setTemplateId(getSelectedTemplateId());
    };

    window.addEventListener("storage", syncTemplate);
    window.addEventListener("careerforge-template-changed", syncTemplate);

    return () => {
      window.removeEventListener("storage", syncTemplate);
      window.removeEventListener("careerforge-template-changed", syncTemplate);
    };
  }, []);

  useEffect(() => {
    if (!resumeId) {
      setJob(null);
      setLatestAsset(null);
      setError("");
      setInfo("");
      previousStatusRef.current = "";
    }
  }, [resumeId]);

  useEffect(() => {
    const nextStatus = job?.status || "";
    const previousStatus = previousStatusRef.current;

    if (!nextStatus || nextStatus === previousStatus) {
      return;
    }

    if (nextStatus === "completed" && (previousStatus === "queued" || previousStatus === "processing")) {
      pushToast("success", "PDF ready", "Your export completed and is ready to open.");
      setInfo("PDF generation completed successfully.");
    }

    if (nextStatus === "failed" && (previousStatus === "queued" || previousStatus === "processing")) {
      pushToast("error", "Export failed", "The PDF job failed. Try regenerating in a few seconds.", 4200);
    }

    previousStatusRef.current = nextStatus;
  }, [job?.status]);

  useEffect(() => {
    if (!job?.id) {
      return;
    }

    const isTerminal = job.status === "completed" || job.status === "failed";
    if (isTerminal) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    pollRef.current = setInterval(async () => {
      const result = await getPdfJob(job.id);
      if (!result.ok || !result.job) {
        return;
      }

      setJob(result.job);

      if (result.job.status === "completed" || result.job.status === "failed") {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 1500);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [job?.id, job?.status]);

  const currentStatus = formatStatus(job?.status);
  const progressValue = progressFromStatus(job?.status);
  const isPremiumTemplateLocked =
    isPremiumTemplateId(templateId) && !Boolean(entitlements?.premiumTemplates);

  const downloadUrl = useMemo(() => {
    if (job?.downloadUrl) {
      return toAssetUrl(job.downloadUrl);
    }

    if (latestAsset?.downloadUrl) {
      return toAssetUrl(latestAsset.downloadUrl);
    }

    return "";
  }, [job?.downloadUrl, latestAsset?.downloadUrl]);

  async function handleStartPdfJob() {
    setError("");
    setInfo("");

    if (!resumeId) {
      const message = "Create or load a resume draft before exporting PDF.";
      setError(message);
      pushToast("warning", "Resume required", message);
      return;
    }

    if (isPremiumTemplateLocked) {
      const message = "Selected template is Pro-only. Upgrade to unlock premium PDF exports.";
      setError(message);
      pushToast("warning", "Template locked", message);
      return;
    }

    const selectedTemplate = getSelectedTemplateConfig();
    setTemplateId(selectedTemplate.templateId);
    setIsSubmitting(true);

    const result = await createPdfJob({
      resumeId,
      templateId: selectedTemplate.templateId,
      templateLayout: selectedTemplate.templateLayout,
      templateMetaTemplateId: selectedTemplate.templateMetaTemplateId
    });

    setIsSubmitting(false);

    if (!result.ok) {
      const code = result.error?.code;

      if (code === "PREMIUM_TEMPLATE_LOCKED") {
        const message = "This template is part of Pro. Upgrade plan to unlock premium export templates.";
        setError(message);
        pushToast("warning", "Template locked", "Upgrade to Pro to export this template.");
        return;
      }

      const message = result.error?.message || "Failed to create PDF job.";
      setError(message);
      pushToast("error", "PDF job failed", message, 4200);
      return;
    }

    setJob(result.job || null);
    previousStatusRef.current = result.job?.status || "";
    setLatestAsset(null);
    setInfo("PDF generation started. We are polling progress for you.");
    pushToast("info", "Export started", "PDF generation is in progress.");
  }

  async function handleLoadLatestPdf() {
    setError("");
    setInfo("");

    if (!resumeId) {
      const message = "No resume selected yet.";
      setError(message);
      pushToast("warning", "Resume required", message);
      return;
    }

    setIsFetchingLatest(true);
    const result = await getLatestResumePdf(resumeId);
    setIsFetchingLatest(false);

    if (!result.ok) {
      const message = result.error?.message || "Could not fetch latest PDF.";
      setError(message);
      pushToast("error", "Unable to load PDF", message, 4200);
      return;
    }

    setLatestAsset(result.asset || null);
    setInfo("Latest generated PDF is ready.");
    pushToast("success", "Latest PDF loaded", "A recent export is ready to open.");
  }

  const isPolling = job?.status === "queued" || job?.status === "processing";

  return (
    <section className="panel week3-export-panel">
      <div className="week3-export-head">
        <div>
          <h3>PDF Export</h3>
          <p className="helper-text">
            Export a clean, non-editable PDF and track render status in real-time.
          </p>
        </div>
        <span className={`week3-template-pill ${isPremiumTemplateLocked ? "locked" : ""}`}>
          {isPremiumTemplateLocked ? <LockIcon className="week3-lock-icon" /> : null}
          <span>Template: {templateId}</span>
        </span>
      </div>

      {isPremiumTemplateLocked ? (
        <p className="week3-lock-note" role="status">
          <LockIcon className="week3-lock-icon" />
          <span>This selected template requires Pro before export is available.</span>
        </p>
      ) : null}

      <div className="week3-export-actions">
        <button
          type="button"
          onClick={handleStartPdfJob}
          disabled={isSubmitting || !resumeId || isPremiumTemplateLocked}
        >
          {isSubmitting ? "Submitting Job..." : "Generate PDF"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={handleLoadLatestPdf}
          disabled={isFetchingLatest || !resumeId}
        >
          {isFetchingLatest ? "Loading Latest..." : "Get Latest PDF"}
        </button>
        {typeof onOpenBilling === "function" &&
        (isPremiumTemplateLocked || (error && error.toLowerCase().includes("upgrade"))) ? (
          <button type="button" className="secondary" onClick={onOpenBilling}>
            Unlock in Billing
          </button>
        ) : null}
      </div>

      {job ? (
        <div className="week3-progress-wrap">
          <div className="week3-progress-head">
            <strong>Status: {currentStatus}</strong>
            <span>Job ID: {job.id}</span>
          </div>
          <div className="week3-progress-track" aria-hidden="true">
            <div
              className={`week3-progress-fill ${job.status === "failed" ? "failed" : ""}`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
          <div className="week3-progress-meta">
            <span>Attempts: {job.attempts || 0}/{job.maxAttempts || 3}</span>
            <span>
              {job.startedAt ? `Started: ${new Date(job.startedAt).toLocaleTimeString()}` : "Waiting to start"}
            </span>
            <span>
              {job.completedAt ? `Completed: ${new Date(job.completedAt).toLocaleTimeString()}` : "In progress"}
            </span>
          </div>

          {isPolling ? (
            <div className="week3-polling-skeleton" aria-hidden="true">
              <span className="skeleton-line skeleton-line-full" />
              <span className="skeleton-line skeleton-line-med" />
            </div>
          ) : null}

          {job.error ? <p className="error-text">Render error: {job.error}</p> : null}
        </div>
      ) : isSubmitting ? (
        <div className="week3-job-skeleton" aria-hidden="true">
          <span className="skeleton-line skeleton-line-full" />
          <span className="skeleton-line skeleton-line-med" />
          <span className="skeleton-line skeleton-line-short" />
        </div>
      ) : (
        <p className="helper-text">No active export job.</p>
      )}

      {isFetchingLatest && !downloadUrl ? (
        <div className="week3-download-skeleton" aria-hidden="true">
          <span className="skeleton-button" />
          <span className="skeleton-line skeleton-line-med" />
        </div>
      ) : null}

      {downloadUrl ? (
        <div className="week3-download-row">
          <a className="week3-download-link" href={downloadUrl} target="_blank" rel="noreferrer">
            Open Generated PDF
          </a>
          <p className="helper-text">The signed URL is temporary for security.</p>
        </div>
      ) : null}

      {info ? <p className="week3-info-text">{info}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
