import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateCoverLetter,
  getCoverLetterProfiles,
  getDashboardResumes,
  getDashboardSummary,
  getResumeIterationTimeline
} from "../api/resumeApi";
import { jsPDF } from "jspdf";

function formatDateTime(value) {
  if (!value) return "n/a";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "n/a";
  }

  return date.toLocaleString();
}

function formatEventLabel(eventType) {
  if (eventType === "version") return "Version Update";
  if (eventType === "analysis") return "ATS Analysis";
  if (eventType === "rewrite") return "AI Rewrite";
  return "Event";
}

const TIMELINE_PAGE_SIZE = 10;
const COVER_LETTER_PREVIEW_STORAGE_KEY = "careerforge.dashboard.coverLetterPreviewByResume";

function sanitizeFileSegment(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "letter";
}

function splitCoverLetterParagraphs(content) {
  return String(content || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function parseCoverLetterSections(content, { hiringManagerName, senderName }) {
  const paragraphs = splitCoverLetterParagraphs(content);

  if (!paragraphs.length) {
    return {
      greeting: `Dear ${hiringManagerName || "Hiring Manager"},`,
      bodyParagraphs: [],
      closing: "Sincerely,",
      signature: senderName || "Candidate"
    };
  }

  const mutableParagraphs = [...paragraphs];

  const defaultGreeting = `Dear ${hiringManagerName || "Hiring Manager"},`;
  const hasGreeting = /^dear\b/i.test(mutableParagraphs[0]);
  const greeting = hasGreeting ? mutableParagraphs.shift() : defaultGreeting;

  let signature = "";
  const signatureCandidate = mutableParagraphs[mutableParagraphs.length - 1] || "";
  if (signatureCandidate && signatureCandidate.length <= 80 && !/[.!?]$/.test(signatureCandidate)) {
    signature = mutableParagraphs.pop();
  }

  let closing = "";
  const closingCandidate = mutableParagraphs[mutableParagraphs.length - 1] || "";
  if (/^(sincerely|regards|best regards|thanks|thank you)/i.test(closingCandidate)) {
    closing = mutableParagraphs.pop();
  }

  return {
    greeting,
    bodyParagraphs: mutableParagraphs,
    closing: closing || "Sincerely,",
    signature: signature || senderName || "Candidate"
  };
}

function DownloadIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 4V14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10L12 14L16 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 16.5V19C4.5 19.8284 5.17157 20.5 6 20.5H18C18.8284 20.5 19.5 19.8284 19.5 19V16.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CoverLetterIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 3.5H13.8L18.5 8.2V20.5H7C5.89543 20.5 5 19.6046 5 18.5V5.5C5 4.39543 5.89543 3.5 7 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3.8V8.5H18.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 11.3H14.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.8 14.7H14.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PreviewIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 12C4.5 8.6 7.8 6.5 12 6.5C16.2 6.5 19.5 8.6 21.5 12C19.5 15.4 16.2 17.5 12 17.5C7.8 17.5 4.5 15.4 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function prettifyFieldName(fieldName) {
  return String(fieldName || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeEventDetails(details) {
  if (!details || typeof details !== "object") {
    return "No additional details available for this event.";
  }

  const summary = Object.entries(details)
    .filter(([field, value]) => String(field || "").trim() && value !== null && value !== "")
    .slice(0, 4)
    .map(([field, value]) => {
      const label = prettifyFieldName(field);

      if (Array.isArray(value)) {
        return `${label}: ${value.slice(0, 3).join(", ")}`;
      }

      if (typeof value === "object") {
        return `${label}: ${JSON.stringify(value)}`;
      }

      return `${label}: ${String(value)}`;
    })
    .join(" • ");

  return summary || "No additional details available for this event.";
}

export default function DashboardPage({
  resumeId,
  resumeData,
  entitlements,
  onOpenBilling,
  onToast
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(resumeId || "");
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(TIMELINE_PAGE_SIZE);
  const [profiles, setProfiles] = useState([]);
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hiringManagerName, setHiringManagerName] = useState("");
  const [tone, setTone] = useState("professional");
  const [profileId, setProfileId] = useState("");
  const [maxWords, setMaxWords] = useState(280);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverMeta, setCoverMeta] = useState(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterPreviewByResume, setCoverLetterPreviewByResume] = useState({});
  const [coverLetterActionLoadingId, setCoverLetterActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const timelineListRef = useRef(null);
  const timelineAutoExtendRef = useRef(null);
  const coverLetterSectionRef = useRef(null);

  const canUseCoverLetters = Boolean(entitlements?.coverLetters);
  const activeCoverLetterKey = selectedResumeId || "adhoc";

  function pushToast(type, title, message, duration = 3200) {
    if (typeof onToast === "function") {
      onToast({ type, title, message, duration });
    }
  }

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    const profilesPromise = canUseCoverLetters
      ? getCoverLetterProfiles()
      : Promise.resolve({ ok: true, profiles: [] });

    const [summaryResult, resumesResult, profilesResult] = await Promise.all([
      getDashboardSummary(25),
      getDashboardResumes(25),
      profilesPromise
    ]);

    if (!summaryResult.ok || !resumesResult.ok || !profilesResult.ok) {
      const message =
        summaryResult.error?.message ||
        resumesResult.error?.message ||
        profilesResult.error?.message ||
        "Could not load dashboard data.";

      setError(message);
      setIsLoading(false);
      pushToast("error", "Dashboard load failed", message, 4200);
      return;
    }

    const nextResumes = Array.isArray(resumesResult.resumes) ? resumesResult.resumes : [];
    const nextProfiles = Array.isArray(profilesResult.profiles) ? profilesResult.profiles : [];

    setSummary(summaryResult.summary || null);
    setResumes(nextResumes);
    setProfiles(nextProfiles);

    if (resumeId) {
      setSelectedResumeId(resumeId);
    } else if (nextResumes.length && !selectedResumeId) {
      setSelectedResumeId(nextResumes[0].id);
    }

    if (!profileId && nextProfiles.length) {
      setProfileId(nextProfiles[0].id);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, [canUseCoverLetters]);

  useEffect(() => {
    if (resumeId) {
      setSelectedResumeId(resumeId);
    }
  }, [resumeId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(COVER_LETTER_PREVIEW_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setCoverLetterPreviewByResume(parsed);
      }
    } catch {
      setCoverLetterPreviewByResume({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      COVER_LETTER_PREVIEW_STORAGE_KEY,
      JSON.stringify(coverLetterPreviewByResume)
    );
  }, [coverLetterPreviewByResume]);

  useEffect(() => {
    const cachedPreview = coverLetterPreviewByResume[activeCoverLetterKey];
    setCoverLetter(cachedPreview?.content || "");
    setCoverMeta(cachedPreview?.meta || null);

    if (cachedPreview?.context) {
      setCompanyName(String(cachedPreview.context.companyName || ""));
      setHiringManagerName(String(cachedPreview.context.hiringManagerName || ""));
    }
  }, [activeCoverLetterKey, coverLetterPreviewByResume]);

  useEffect(() => {
    setVisibleTimelineCount(TIMELINE_PAGE_SIZE);
  }, [selectedResumeId]);

  useEffect(() => {
    async function loadTimeline() {
      if (!selectedResumeId) {
        setTimeline([]);
        return;
      }

      setTimelineLoading(true);
      const result = await getResumeIterationTimeline(selectedResumeId, 100);
      setTimelineLoading(false);

      if (!result.ok) {
        const message = result.error?.message || "Could not load iteration timeline.";
        pushToast("warning", "Timeline unavailable", message);
        setTimeline([]);
        return;
      }

      setTimeline(Array.isArray(result.timeline) ? result.timeline : []);
    }

    loadTimeline();
  }, [selectedResumeId]);

  const selectedResume = useMemo(
    () => resumes.find((item) => item.id === selectedResumeId) || null,
    [resumes, selectedResumeId]
  );

  const senderName =
    selectedResume?.profile?.fullName ||
    resumeData?.profile?.fullName ||
    "Candidate";

  const coverLetterSubject = useMemo(() => {
    const role = selectedResume?.profile?.title || resumeData?.profile?.title || "the role";
    if (companyName.trim()) {
      return `Application for ${role} at ${companyName.trim()}`;
    }

    return `Application for ${role}`;
  }, [companyName, resumeData?.profile?.title, selectedResume?.profile?.title]);

  const coverLetterSections = useMemo(
    () => parseCoverLetterSections(coverLetter, { hiringManagerName, senderName }),
    [coverLetter, hiringManagerName, senderName]
  );

  const hasMoreTimeline = timeline.length > visibleTimelineCount;

  const visibleTimeline = useMemo(
    () => timeline.slice(0, visibleTimelineCount),
    [timeline, visibleTimelineCount]
  );

  const extendTimeline = useCallback(() => {
    setVisibleTimelineCount((currentCount) => {
      if (currentCount >= timeline.length) {
        return currentCount;
      }

      return Math.min(currentCount + TIMELINE_PAGE_SIZE, timeline.length);
    });
  }, [timeline.length]);

  useEffect(() => {
    if (!isTimelineExpanded || !hasMoreTimeline || typeof IntersectionObserver === "undefined") {
      return;
    }

    const timelineListNode = timelineListRef.current;
    const timelineSentinelNode = timelineAutoExtendRef.current;

    if (!timelineListNode || !timelineSentinelNode) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          extendTimeline();
        }
      },
      {
        root: timelineListNode,
        rootMargin: "140px 0px 100px 0px",
        threshold: 0
      }
    );

    observer.observe(timelineSentinelNode);

    return () => {
      observer.disconnect();
    };
  }, [extendTimeline, hasMoreTimeline, isTimelineExpanded]);

  async function handleGenerateCoverLetter() {
    if (!jobDescription.trim()) {
      const message = "Paste a job description before generating a cover letter.";
      setError(message);
      pushToast("warning", "Job description required", message);
      return;
    }

    if (!canUseCoverLetters) {
      const message = "Cover letter generation is a Pro feature.";
      setError(message);
      pushToast("warning", "Upgrade required", message);
      return;
    }

    if (!selectedResumeId && !resumeData) {
      const message = "Select or create a resume draft first.";
      setError(message);
      pushToast("warning", "Resume required", message);
      return;
    }

    setError("");
    setCoverLetterLoading(true);

    const result = await generateCoverLetter({
      resumeId: selectedResumeId || undefined,
      resumeData: selectedResumeId ? undefined : resumeData,
      jobDescription,
      companyName,
      hiringManagerName,
      tone,
      profileId: profileId || undefined,
      maxWords
    });

    setCoverLetterLoading(false);

    if (!result.ok || !result.coverLetter) {
      const message = result.error?.message || "Could not generate cover letter.";
      setError(message);
      pushToast("error", "Cover letter failed", message, 4200);
      return;
    }

    const nextCoverContent = result.coverLetter.content || "";
    const nextCoverMeta = {
      profileName: result.coverLetter.profile?.name || "n/a",
      wordCount: result.coverLetter.wordCount || 0,
      generatedAt: result.coverLetter.generatedAt || null
    };
    const nextCoverContext = {
      companyName: companyName.trim(),
      hiringManagerName: hiringManagerName.trim(),
      senderName,
      subject: coverLetterSubject
    };

    setCoverLetter(nextCoverContent);
    setCoverMeta(nextCoverMeta);
    setCoverLetterPreviewByResume((previousState) => ({
      ...previousState,
      [activeCoverLetterKey]: {
        content: nextCoverContent,
        meta: nextCoverMeta,
        context: nextCoverContext
      }
    }));

    pushToast("success", "Cover letter ready", "Generated from your latest resume and JD.");
  }

  function exportCoverLetterPdfDocument({
    content,
    meta,
    companyNameValue,
    hiringManagerNameValue,
    senderNameValue,
    subject,
    fileNameSeed
  }) {
    const parsedSections = parseCoverLetterSections(content, {
      hiringManagerName: hiringManagerNameValue,
      senderName: senderNameValue
    });
    const generatedAt = meta?.generatedAt || new Date().toISOString();

    const document = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const margin = 54;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = margin;

    const writeParagraph = (text, options = {}) => {
      const {
        fontSize = 11,
        fontStyle = "normal",
        spacingAfter = 12
      } = options;

      const lines = document.splitTextToSize(String(text || ""), maxWidth);
      if (!lines.length) {
        yPosition += spacingAfter;
        return;
      }

      document.setFont("helvetica", fontStyle);
      document.setFontSize(fontSize);

      lines.forEach((line) => {
        if (yPosition > pageHeight - margin) {
          document.addPage();
          yPosition = margin;
          document.setFont("helvetica", fontStyle);
          document.setFontSize(fontSize);
        }

        document.text(line, margin, yPosition);
        yPosition += fontSize + 4;
      });

      yPosition += spacingAfter;
    };

    writeParagraph(formatDateTime(generatedAt), {
      fontSize: 10,
      fontStyle: "normal",
      spacingAfter: 14
    });

    writeParagraph("To", {
      fontSize: 10,
      fontStyle: "bold",
      spacingAfter: 6
    });

    writeParagraph(hiringManagerNameValue.trim() || "Hiring Manager", {
      fontSize: 11,
      spacingAfter: 4
    });

    if (companyNameValue.trim()) {
      writeParagraph(companyNameValue.trim(), {
        fontSize: 11,
        spacingAfter: 10
      });
    }

    writeParagraph(`Subject: ${subject}`, {
      fontSize: 11,
      fontStyle: "bold",
      spacingAfter: 14
    });

    writeParagraph(parsedSections.greeting, {
      fontSize: 11,
      spacingAfter: 10
    });

    parsedSections.bodyParagraphs.forEach((paragraph) => {
      writeParagraph(paragraph, {
        fontSize: 11,
        spacingAfter: 10
      });
    });

    writeParagraph(parsedSections.closing, {
      fontSize: 11,
      spacingAfter: 4
    });

    writeParagraph(parsedSections.signature, {
      fontSize: 11,
      fontStyle: "bold",
      spacingAfter: 0
    });

    const safeFileNameSeed = sanitizeFileSegment(fileNameSeed || companyNameValue || senderNameValue || "cover-letter");
    document.save(`cover-letter-${safeFileNameSeed}.pdf`);
  }

  function handlePreviewCoverLetterForResume(targetResume) {
    const targetResumeId = String(targetResume?.id || "").trim();
    if (!targetResumeId) {
      return;
    }

    const cachedPreview = coverLetterPreviewByResume[targetResumeId];
    const hasSavedContent = Boolean(String(cachedPreview?.content || "").trim());

    if (!hasSavedContent) {
      pushToast("warning", "Cover letter missing", "Generate a cover letter for this resume first.");
      return;
    }

    setSelectedResumeId(targetResumeId);
    setCoverLetter(cachedPreview.content);
    setCoverMeta(cachedPreview.meta || null);

    if (cachedPreview?.context) {
      setCompanyName(String(cachedPreview.context.companyName || ""));
      setHiringManagerName(String(cachedPreview.context.hiringManagerName || ""));
    }

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        coverLetterSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    pushToast("info", "Preview loaded", "Previewing the created cover letter for this resume.");
  }

  function handleDownloadCoverLetterForResume(targetResume) {
    const targetResumeId = String(targetResume?.id || "").trim();
    if (!targetResumeId) {
      return;
    }

    const cachedPreview = coverLetterPreviewByResume[targetResumeId];
    const hasSavedContent = Boolean(String(cachedPreview?.content || "").trim());

    if (!hasSavedContent) {
      pushToast("warning", "Cover letter missing", "Generate a cover letter for this resume first.");
      return;
    }

    const targetCompany = String(cachedPreview?.context?.companyName || "").trim();
    const targetHiringManager = String(cachedPreview?.context?.hiringManagerName || "").trim();
    const targetSenderName =
      String(cachedPreview?.context?.senderName || "").trim() ||
      String(targetResume?.profile?.fullName || "").trim() ||
      String(resumeData?.profile?.fullName || "").trim() ||
      "Candidate";
    const targetRole =
      String(targetResume?.profile?.title || "").trim() ||
      String(resumeData?.profile?.title || "").trim() ||
      "the role";
    const targetSubject =
      String(cachedPreview?.context?.subject || "").trim() ||
      (targetCompany ? `Application for ${targetRole} at ${targetCompany}` : `Application for ${targetRole}`);

    setCoverLetterActionLoadingId(targetResumeId);

    try {
      exportCoverLetterPdfDocument({
        content: cachedPreview.content,
        meta: cachedPreview.meta || null,
        companyNameValue: targetCompany,
        hiringManagerNameValue: targetHiringManager,
        senderNameValue: targetSenderName,
        subject: targetSubject,
        fileNameSeed: targetCompany || targetSenderName
      });

      pushToast("success", "Cover letter exported", "Downloaded cover letter PDF for this resume.");
    } finally {
      setCoverLetterActionLoadingId("");
    }
  }

  function handleDownloadCoverLetterPdf() {
    if (!coverLetter.trim()) {
      pushToast("warning", "No cover letter", "Generate a cover letter before downloading PDF.");
      return;
    }

    exportCoverLetterPdfDocument({
      content: coverLetter,
      meta: coverMeta,
      companyNameValue: companyName,
      hiringManagerNameValue: hiringManagerName,
      senderNameValue: senderName,
      subject: coverLetterSubject,
      fileNameSeed: companyName || senderName
    });

    pushToast("success", "Cover letter exported", "Downloaded cover letter as PDF.");
  }

  return (
    <main className="dashboard-week4-wrap">
      <section className="panel dashboard-week4-panel dashboard-week4-overview-panel">
        <div className="dashboard-week4-overview-head">
          <div>
            <p className="dashboard-week4-kicker">Live analytics and activity insights</p>
            <p className="dashboard-week4-subtle">
              Iteration analytics, timeline history, and cover letter generation.
            </p>
          </div>

          {!isLoading ? (
            <p className="dashboard-week4-last-updated">
              Last updated: {formatDateTime(summary?.latestUpdatedAt)}
            </p>
          ) : null}
        </div>

        {isLoading ? <p className="helper-text">Loading dashboard data...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading ? (
          <div className="dashboard-week4-metrics">
            <article>
              <p>Total Resumes</p>
              <strong>{summary?.totals?.resumeCount || 0}</strong>
              <span>Tracked drafts</span>
            </article>
            <article>
              <p>Total Versions</p>
              <strong>{summary?.totals?.versionCount || 0}</strong>
              <span>Saved checkpoints</span>
            </article>
            <article>
              <p>ATS Analyses</p>
              <strong>{summary?.totals?.analysisCount || 0}</strong>
              <span>Match evaluations</span>
            </article>
            <article>
              <p>AI Rewrites</p>
              <strong>{summary?.totals?.rewriteCount || 0}</strong>
              <span>Optimization passes</span>
            </article>
          </div>
        ) : null}
      </section>

      <section className="panel dashboard-week4-panel dashboard-week4-iterations-panel">
        <h3>Saved Resume Iterations</h3>
        <p className="dashboard-week4-subtle">
          Pick a resume to inspect version and ATS activity.
        </p>

        <div className="dashboard-week4-resume-list">
          {resumes.length ? resumes.map((item) => {
            const resumeName = item.profile?.fullName || "selected resume";
            const hasCreatedCoverLetter = Boolean(
              String(coverLetterPreviewByResume[item.id]?.content || "").trim()
            );

            return (
              <article
                key={item.id}
                className={`dashboard-week4-resume-row ${selectedResumeId === item.id ? "active" : ""}`}
              >
                <button
                  type="button"
                  className={`dashboard-week4-resume-pill ${selectedResumeId === item.id ? "active" : ""}`}
                  onClick={() => setSelectedResumeId(item.id)}
                >
                  <span>{item.profile?.fullName || "Untitled Resume"}</span>
                  <small>
                    v{item.currentVersion || 1} | analyses {item.analysisCount || 0} | rewrites {item.rewriteCount || 0}
                  </small>
                </button>

                <div className="dashboard-week4-resume-actions">
                  <button
                    type="button"
                    className="dashboard-week4-resume-action-btn secondary"
                    onClick={() => handleDownloadCoverLetterForResume(item)}
                    disabled={!hasCreatedCoverLetter || coverLetterActionLoadingId === item.id}
                    aria-label={`Download cover letter PDF for ${resumeName}`}
                    title={hasCreatedCoverLetter ? "Download cover letter PDF" : "No cover letter generated yet"}
                  >
                    <CoverLetterIcon className="dashboard-week4-icon" />
                  </button>

                  <button
                    type="button"
                    className="dashboard-week4-resume-action-btn secondary"
                    onClick={() => handlePreviewCoverLetterForResume(item)}
                    disabled={!hasCreatedCoverLetter}
                    aria-label={`Preview created cover letter for ${resumeName}`}
                    title={hasCreatedCoverLetter ? "Preview created cover letter" : "No cover letter generated yet"}
                  >
                    <PreviewIcon className="dashboard-week4-icon" />
                  </button>
                </div>
              </article>
            );
          }) : (
            <p className="helper-text">No resumes found yet.</p>
          )}
        </div>

        <div className="dashboard-week4-timeline-wrap">
          <button
            type="button"
            className="dashboard-week4-timeline-toggle"
            onClick={() => setIsTimelineExpanded((currentValue) => !currentValue)}
            aria-expanded={isTimelineExpanded}
          >
            <span className="dashboard-week4-timeline-toggle-title">
              <span
                className={`dashboard-week4-timeline-arrow ${isTimelineExpanded ? "open" : ""}`}
                aria-hidden="true"
              >
                ▸
              </span>
              <span>Iteration Timeline</span>
            </span>
            <span className="dashboard-week4-timeline-count">{timeline.length}</span>
          </button>

          {isTimelineExpanded ? (
            <>
              {timelineLoading ? <p className="helper-text">Loading timeline...</p> : null}

              {!timelineLoading && !timeline.length ? (
                <p className="dashboard-week4-timeline-empty helper-text">
                  No timeline events for this resume yet.
                </p>
              ) : null}

              {!timelineLoading && timeline.length ? (
                <ul className="dashboard-week4-timeline" ref={timelineListRef}>
                  {visibleTimeline.map((event, index) => (
                    <li key={`${event.eventType}-${event.eventId || event.createdAt || index}`}>
                      <div className="dashboard-week4-timeline-item-head">
                        <strong>{formatEventLabel(event.eventType)}</strong>
                        <span className="helper-text">{formatDateTime(event.createdAt)}</span>
                      </div>
                      <p className="dashboard-week4-timeline-details">
                        {summarizeEventDetails(event.details)}
                      </p>
                    </li>
                  ))}

                  {hasMoreTimeline ? (
                    <li className="dashboard-week4-timeline-sentinel" ref={timelineAutoExtendRef}>
                      <button
                        type="button"
                        className="dashboard-week4-timeline-loadmore secondary"
                        onClick={extendTimeline}
                      >
                        Show more events
                      </button>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      <section className="panel dashboard-week4-panel dashboard-week4-cover-letter-panel" ref={coverLetterSectionRef}>
        <h3>Cover Letter Generator</h3>
        <p className="dashboard-week4-subtle">
          Generate a personalized letter from the selected resume and job description.
        </p>

        {!canUseCoverLetters ? (
          <div className="dashboard-week4-lock">
            <p className="helper-text">Cover letters are available on Pro plan.</p>
            {typeof onOpenBilling === "function" ? (
              <button type="button" className="secondary" onClick={onOpenBilling}>
                Upgrade in Billing
              </button>
            ) : null}
          </div>
        ) : null}

        <label>
          Company Name
          <input
            value={companyName}
            placeholder="Company name"
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={coverLetterLoading || !canUseCoverLetters}
          />
        </label>

        <label>
          Hiring Manager (optional)
          <input
            value={hiringManagerName}
            placeholder="Hiring manager name"
            onChange={(event) => setHiringManagerName(event.target.value)}
            disabled={coverLetterLoading || !canUseCoverLetters}
          />
        </label>

        <div className="inline-two-col">
          <label>
            Tone
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              disabled={coverLetterLoading || !canUseCoverLetters}
            >
              <option value="professional">Professional</option>
              <option value="direct">Direct</option>
              <option value="assertive">Assertive</option>
            </select>
          </label>

          <label>
            Prompt Profile
            <select
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              disabled={coverLetterLoading || !canUseCoverLetters}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Max Words
          <input
            type="number"
            min={120}
            max={450}
            value={maxWords}
            onChange={(event) => {
              const next = Number(event.target.value);
              setMaxWords(Number.isFinite(next) ? next : 280);
            }}
            disabled={coverLetterLoading || !canUseCoverLetters}
          />
        </label>

        <label>
          Job Description
          <textarea
            rows={7}
            value={jobDescription}
            placeholder="Paste the target job description"
            onChange={(event) => setJobDescription(event.target.value)}
            disabled={coverLetterLoading || !canUseCoverLetters}
          />
        </label>

        <button
          type="button"
          className="dashboard-week4-generate-btn"
          onClick={handleGenerateCoverLetter}
          disabled={coverLetterLoading || !canUseCoverLetters}
        >
          {coverLetterLoading ? "Generating..." : "Generate Cover Letter"}
        </button>

        {coverMeta ? (
          <p className="dashboard-week4-cover-meta helper-text">
            Profile: {coverMeta.profileName} | Words: {coverMeta.wordCount} | Generated: {formatDateTime(coverMeta.generatedAt)}
          </p>
        ) : null}

        {coverLetter ? (
          <article className="dashboard-week4-letter-preview">
            <header className="dashboard-week4-letter-toolbar">
              <div>
                <p className="dashboard-week4-letter-title">Cover Letter Preview</p>
                <p className="dashboard-week4-letter-subtitle">Neat letter format with ready-to-share structure</p>
              </div>

              <button
                type="button"
                className="dashboard-week4-letter-download-btn secondary"
                onClick={handleDownloadCoverLetterPdf}
              >
                <DownloadIcon className="dashboard-week4-icon" />
                <span>PDF</span>
              </button>
            </header>

            <div className="dashboard-week4-letter-paper">
              <p className="dashboard-week4-letter-date">
                {formatDateTime(coverMeta?.generatedAt || new Date().toISOString())}
              </p>

              <p className="dashboard-week4-letter-label">To</p>
              <p className="dashboard-week4-letter-recipient">
                {hiringManagerName.trim() || "Hiring Manager"}
              </p>
              {companyName.trim() ? (
                <p className="dashboard-week4-letter-recipient">{companyName.trim()}</p>
              ) : null}

              <p className="dashboard-week4-letter-subject-line">
                <strong>Subject:</strong> {coverLetterSubject}
              </p>

              <p className="dashboard-week4-letter-paragraph">{coverLetterSections.greeting}</p>

              {coverLetterSections.bodyParagraphs.map((paragraph, index) => (
                <p key={`cover-letter-paragraph-${index}`} className="dashboard-week4-letter-paragraph">
                  {paragraph}
                </p>
              ))}

              <p className="dashboard-week4-letter-paragraph dashboard-week4-letter-closing">
                {coverLetterSections.closing}
              </p>
              <p className="dashboard-week4-letter-signature">{coverLetterSections.signature}</p>
            </div>
          </article>
        ) : null}

        {selectedResume ? (
          <p className="helper-text">
            Active resume: {selectedResume.profile?.fullName || "Untitled"} (v{selectedResume.currentVersion || 1})
          </p>
        ) : null}
      </section>
    </main>
  );
}
