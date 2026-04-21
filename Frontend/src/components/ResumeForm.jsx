import React, { useEffect, useMemo, useRef, useState } from "react";
import { useResume } from "../context/resumeContext";
import {
  analyzeResumeMatch,
  getResumeAnalysisHistory,
  getResumeRewriteHistory,
  extractJdKeywords,
  rewriteResumeBulletsBatch
} from "../api/resumeApi";
import { DEFAULT_ENTITLEMENT_FEATURES } from "../constants/entitlements";

const sectionOrder = [
  "profile",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications"
];

const sectionLabels = {
  profile: "Profile",
  experience: "Experience",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications"
};

const atsCategoryLabels = {
  keywordRelevance: "Keyword Relevance",
  semanticAlignment: "Semantic Alignment",
  experienceQuality: "Experience Quality",
  resumeStructure: "Resume Structure",
  atsReadiness: "ATS Readiness"
};

const atsCoverageLabels = {
  summary: "Summary",
  experience: "Experience",
  skills: "Skills",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  profile: "Profile"
};

const suggestedSkills = [
  "React",
  "Node.js",
  "REST APIs",
  "MongoDB",
  "TypeScript",
  "Agile"
];

function parseOptionalYear(rawValue) {
  const normalized = String(rawValue || "").trim();
  if (!normalized) return null;

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 1950 || numeric > 2100) return null;

  return Math.trunc(numeric);
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

function TrashIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
    >
      <path d="M2.5 4.2H13.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path
        d="M6.2 2.9H9.8C10.2 2.9 10.5 3.2 10.5 3.6V4.2H5.5V3.6C5.5 3.2 5.8 2.9 6.2 2.9Z"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path
        d="M4.6 4.2L5 12.3C5.03 12.85 5.48 13.3 6.04 13.3H9.96C10.52 13.3 10.97 12.85 11 12.3L11.4 4.2"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path d="M6.8 6.3V11.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M9.2 6.3V11.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export default function ResumeForm({
  entitlements = DEFAULT_ENTITLEMENT_FEATURES,
  onOpenBilling
}) {
  const { state, dispatch } = useResume();
  const [activeSection, setActiveSection] = useState("profile");
  const [jobDescription, setJobDescription] = useState("");
  const [atsResult, setAtsResult] = useState(null);
  const [selectedMissingKeywords, setSelectedMissingKeywords] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [rewriteHistory, setRewriteHistory] = useState([]);
  const [atsLoading, setAtsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rewriteHistoryLoading, setRewriteHistoryLoading] = useState(false);
  const [magicKeyword, setMagicKeyword] = useState("");
  const [magicBatchResult, setMagicBatchResult] = useState(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [isMagicScanning, setIsMagicScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [jdKeywords, setJdKeywords] = useState([]);
  const [atsError, setAtsError] = useState("");
  const [isAnalysisHistoryOpen, setIsAnalysisHistoryOpen] = useState(false);
  const [isRewriteHistoryOpen, setIsRewriteHistoryOpen] = useState(false);
  const scanTimeoutsRef = useRef([]);
  const analysisHistoryFetchCompletedRef = useRef(false);
  const rewriteHistoryFetchCompletedRef = useRef(false);
  const analysisHistoryInitializedRef = useRef(false);
  const rewriteHistoryInitializedRef = useRef(false);
  const previousAnalysisHistoryCountRef = useRef(0);
  const previousRewriteHistoryCountRef = useRef(0);
  const isRewriteLocked = !Boolean(entitlements?.unlimitedRewrites);

  const experiences =
    Array.isArray(state.data.experience) && state.data.experience.length
      ? state.data.experience
      : [{ id: "exp-1", company: "", role: "", location: "", bullets: [""] }];
  const educationItems =
    Array.isArray(state.data.education) && state.data.education.length
      ? state.data.education
      : [{ id: "edu-1", institution: "", degree: "", field: "", startYear: null, endYear: null }];
  const projects =
    Array.isArray(state.data.projects) && state.data.projects.length
      ? state.data.projects
      : [{ id: "proj-1", name: "", stack: [], bullets: [""] }];
  const certifications =
    Array.isArray(state.data.certifications) && state.data.certifications.length
      ? state.data.certifications
      : [{ id: "cert-1", name: "", issuer: "", year: null }];

  const allExperienceBullets = useMemo(() => {
    return experiences.flatMap((entry, expIndex) => {
      const bullets = Array.isArray(entry.bullets) ? entry.bullets : [];

      return bullets
        .map((bullet, bulletIndex) => ({
          sectionType: "experience",
          entryIndex: expIndex,
          bulletIndex,
          role: entry.role || "",
          company: entry.company || "",
          bullet: String(bullet || "").trim()
        }))
        .filter((item) => item.bullet);
    });
  }, [experiences]);

  const allProjectBullets = useMemo(() => {
    return projects.flatMap((entry, projectIndex) => {
      const bullets = Array.isArray(entry.bullets) ? entry.bullets : [];

      return bullets
        .map((bullet, bulletIndex) => ({
          sectionType: "project",
          entryIndex: projectIndex,
          bulletIndex,
          projectName: entry.name || "",
          bullet: String(bullet || "").trim()
        }))
        .filter((item) => item.bullet);
    });
  }, [projects]);

  const allRewriteTargets = useMemo(
    () => [...allExperienceBullets, ...allProjectBullets],
    [allExperienceBullets, allProjectBullets]
  );

  const skillString = (state.data.skills[0]?.items || []).join(", ");

  const score = useMemo(() => {
    const checks = [
      Boolean(state.data.profile.fullName?.trim()),
      Boolean(state.data.profile.title?.trim()),
      Boolean(state.data.profile.email?.trim()),
      experiences.some(
        (item) => Boolean(item.company?.trim()) || Boolean(item.role?.trim())
      ),
      experiences.some((item) =>
        Array.isArray(item.bullets)
          ? item.bullets.some((bullet) => bullet.trim().length > 10)
          : false
      ),
      educationItems.some(
        (item) =>
          Boolean(item.institution?.trim()) ||
          Boolean(item.degree?.trim()) ||
          Boolean(item.field?.trim())
      ),
      projects.some((item) => Boolean(item.name?.trim())),
      Boolean((state.data.skills[0]?.items || []).length),
      certifications.some((item) => Boolean(item.name?.trim()))
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [state.data, experiences, educationItems, projects, certifications]);

  const activeIndex = sectionOrder.indexOf(activeSection);

  function jumpToSection(section) {
    setActiveSection(section);
  }

  function moveSection(offset) {
    const nextIndex = Math.min(
      sectionOrder.length - 1,
      Math.max(0, activeIndex + offset)
    );
    setActiveSection(sectionOrder[nextIndex]);
  }

  function addSuggestedSkill(skill) {
    const current = state.data.skills[0]?.items || [];
    if (current.includes(skill)) return;
    dispatch({ type: "UPDATE_SKILLS", payload: [...current, skill] });
  }

  async function fetchHistory(resumeId) {
    if (!resumeId) {
      setAnalysisHistory([]);
      analysisHistoryFetchCompletedRef.current = true;
      return;
    }

    setHistoryLoading(true);
    const result = await getResumeAnalysisHistory(resumeId);
    setHistoryLoading(false);

    if (result.ok) {
      setAnalysisHistory(result.history || []);
    }

    analysisHistoryFetchCompletedRef.current = true;
  }

  async function fetchRewriteHistory(resumeId) {
    if (!resumeId) {
      setRewriteHistory([]);
      rewriteHistoryFetchCompletedRef.current = true;
      return;
    }

    setRewriteHistoryLoading(true);
    const result = await getResumeRewriteHistory(resumeId);
    setRewriteHistoryLoading(false);

    if (result.ok) {
      setRewriteHistory(result.history || []);
    }

    rewriteHistoryFetchCompletedRef.current = true;
  }

  useEffect(() => {
    analysisHistoryFetchCompletedRef.current = false;
    rewriteHistoryFetchCompletedRef.current = false;
    analysisHistoryInitializedRef.current = false;
    rewriteHistoryInitializedRef.current = false;
    previousAnalysisHistoryCountRef.current = 0;
    previousRewriteHistoryCountRef.current = 0;
    setIsAnalysisHistoryOpen(false);
    setIsRewriteHistoryOpen(false);

    fetchHistory(state.resumeId);
    fetchRewriteHistory(state.resumeId);
  }, [state.resumeId]);

  useEffect(() => {
    if (historyLoading || !analysisHistoryFetchCompletedRef.current) {
      return;
    }

    const currentCount = analysisHistory.length;

    if (!analysisHistoryInitializedRef.current) {
      analysisHistoryInitializedRef.current = true;
      previousAnalysisHistoryCountRef.current = currentCount;
      return;
    }

    if (currentCount > previousAnalysisHistoryCountRef.current) {
      setIsAnalysisHistoryOpen(true);
    }

    previousAnalysisHistoryCountRef.current = currentCount;
  }, [analysisHistory, historyLoading]);

  useEffect(() => {
    if (rewriteHistoryLoading || !rewriteHistoryFetchCompletedRef.current) {
      return;
    }

    const currentCount = rewriteHistory.length;

    if (!rewriteHistoryInitializedRef.current) {
      rewriteHistoryInitializedRef.current = true;
      previousRewriteHistoryCountRef.current = currentCount;
      return;
    }

    if (currentCount > previousRewriteHistoryCountRef.current) {
      setIsRewriteHistoryOpen(true);
    }

    previousRewriteHistoryCountRef.current = currentCount;
  }, [rewriteHistory, rewriteHistoryLoading]);

  useEffect(() => {
    return () => {
      scanTimeoutsRef.current.forEach((timerId) => window.clearTimeout(timerId));
      scanTimeoutsRef.current = [];
      dispatch({
        type: "SET_MAGIC_SCAN_STATE",
        payload: {
          active: false,
          progress: 0
        }
      });
    };
  }, [dispatch]);

  function toggleMissingKeyword(keyword) {
    setSelectedMissingKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((item) => item !== keyword)
        : [...prev, keyword]
    );
  }

  function insertKeywordsToSummary() {
    if (!selectedMissingKeywords.length) return;

    const current = state.data.profile.summary || "";
    const lowerCurrent = current.toLowerCase();
    const newKeywords = selectedMissingKeywords.filter(
      (keyword) => !lowerCurrent.includes(keyword.toLowerCase())
    );

    if (!newKeywords.length) return;

    const addition = ` Core focus: ${newKeywords.join(", ")}.`;
    const nextSummary = `${current.trim()}${addition}`.trim();

    dispatch({
      type: "UPDATE_PROFILE_FIELD",
      field: "summary",
      value: nextSummary
    });
  }

  function insertKeywordsToSkills() {
    if (!selectedMissingKeywords.length) return;

    const currentSkills = state.data.skills[0]?.items || [];
    const nextSkills = [...new Set([...currentSkills, ...selectedMissingKeywords])];

    dispatch({ type: "UPDATE_SKILLS", payload: nextSkills });
  }

  async function runMagicRewrite() {
    if (isRewriteLocked) {
      setAtsError("Magic Rewrite is a Pro feature. Upgrade to unlock unlimited rewrites.");
      return;
    }

    if (!jobDescription.trim()) {
      setAtsError("Paste a job description before using the Magic Button.");
      return;
    }

    if (!allRewriteTargets.length) {
      setAtsError("Add at least one experience or project bullet before using Magic Rewrite.");
      return;
    }

    scanTimeoutsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    scanTimeoutsRef.current = [];

    setAtsError("");
    setMagicLoading(true);
    setIsMagicScanning(true);
    setScanProgress(5);
    dispatch({
      type: "SET_MAGIC_SCAN_STATE",
      payload: {
        active: true,
        progress: 5
      }
    });
    setMagicBatchResult(null);

    let rankedKeywords = jdKeywords;
    if (!rankedKeywords.length) {
      const keywordResult = await extractJdKeywords(jobDescription);
      if (keywordResult.ok) {
        rankedKeywords = keywordResult.keywords || [];
        setJdKeywords(rankedKeywords);
      }
    }

    const keywordOverride = String(magicKeyword || "").trim();
    const keywordHints = allRewriteTargets.map((_, index) => {
      if (keywordOverride) {
        return keywordOverride;
      }

      if (!rankedKeywords.length) {
        return "";
      }

      return rankedKeywords[index % rankedKeywords.length] || "";
    });

    const result = await rewriteResumeBulletsBatch({
      resumeId: state.resumeId,
      bullets: allRewriteTargets.map((item) => item.bullet),
      keywords: keywordHints,
      jobDescription
    });

    if (!result.ok) {
      setAtsError(result.error?.message || result.message || "Failed to rewrite bullet point.");
      setMagicLoading(false);
      setIsMagicScanning(false);
      setScanProgress(0);
      dispatch({
        type: "SET_MAGIC_SCAN_STATE",
        payload: {
          active: false,
          progress: 0
        }
      });
      return;
    }

    const rewrites = Array.isArray(result.rewrites) ? result.rewrites : [];
    if (!rewrites.length) {
      setAtsError("No rewritten bullets were generated.");
      setMagicLoading(false);
      setIsMagicScanning(false);
      setScanProgress(0);
      dispatch({
        type: "SET_MAGIC_SCAN_STATE",
        payload: {
          active: false,
          progress: 0
        }
      });
      return;
    }

    const rewriteByOriginalIndex = new Map();
    rewrites.forEach((rewrite, index) => {
      const sourceIndex = Number.isInteger(rewrite?.originalIndex)
        ? rewrite.originalIndex
        : index;
      rewriteByOriginalIndex.set(sourceIndex, rewrite);
    });

    const mergedRewrites = allRewriteTargets.map((source, index) => {
      const rewrite = rewriteByOriginalIndex.get(index);
      const removed = Boolean(rewrite?.removed);

      return {
        sectionType: source.sectionType,
        entryIndex: source.entryIndex,
        bulletIndex: source.bulletIndex,
        role: source.role,
        company: source.company,
        projectName: source.projectName,
        originalBullet: source.bullet,
        keyword:
          rewrite?.keywordUsed ||
          keywordHints[index] ||
          rankedKeywords[index % Math.max(1, rankedKeywords.length)] ||
          "",
        rewrittenBullet: removed
          ? ""
          : (rewrite?.rewrittenBullet || source.bullet),
        latencyMs: rewrite?.latencyMs || 0,
        quality: rewrite?.quality || {},
        relevance: rewrite?.relevance || {},
        removed,
        removalReason: rewrite?.removalReason || "",
        providerStatus: rewrite?.providerStatus || "llm"
      };
    });

    setMagicBatchResult({
      summary: result.summary || {},
      rewrites: mergedRewrites
    });

    const totalRewrites = mergedRewrites.length;
    const nextBulletsByExperience = experiences.map((entry) =>
      Array.isArray(entry.bullets) && entry.bullets.length
        ? [...entry.bullets]
        : [""]
    );
    const nextBulletsByProject = projects.map((entry) =>
      Array.isArray(entry.bullets) && entry.bullets.length
        ? [...entry.bullets]
        : [""]
    );

    mergedRewrites.forEach((item, index) => {
      const timerId = window.setTimeout(() => {
        if (item.sectionType === "project") {
          const nextProjectBullets =
            nextBulletsByProject[item.entryIndex] || [""];

          nextProjectBullets[item.bulletIndex] = item.removed
            ? ""
            : item.rewrittenBullet;
          nextBulletsByProject[item.entryIndex] = nextProjectBullets;

          if (!item.removed) {
            dispatch({
              type: "UPDATE_PROJECT_BULLET",
              index: item.entryIndex,
              bulletIndex: item.bulletIndex,
              value: item.rewrittenBullet
            });
          }
        } else {
          const nextExperienceBullets =
            nextBulletsByExperience[item.entryIndex] || [""];

          nextExperienceBullets[item.bulletIndex] = item.removed
            ? ""
            : item.rewrittenBullet;
          nextBulletsByExperience[item.entryIndex] = nextExperienceBullets;

          if (!item.removed) {
            dispatch({
              type: "UPDATE_EXPERIENCE_BULLET",
              index: item.entryIndex,
              bulletIndex: item.bulletIndex,
              value: item.rewrittenBullet
            });
          }
        }

        const nextProgress = Math.round(((index + 1) / totalRewrites) * 100);
        setScanProgress(nextProgress);
        dispatch({
          type: "SET_MAGIC_SCAN_STATE",
          payload: {
            active: true,
            progress: nextProgress
          }
        });

        if (index === totalRewrites - 1) {
          nextBulletsByExperience.forEach((bullets, expIndex) => {
            const cleanedBullets = bullets
              .map((bullet) => String(bullet || "").trim())
              .filter(Boolean);

            dispatch({
              type: "SET_EXPERIENCE_BULLETS",
              index: expIndex,
              bullets: cleanedBullets.length ? cleanedBullets : [""]
            });
          });

          nextBulletsByProject.forEach((bullets, projectIndex) => {
            const cleanedBullets = bullets
              .map((bullet) => String(bullet || "").trim())
              .filter(Boolean);

            dispatch({
              type: "SET_PROJECT_BULLETS",
              index: projectIndex,
              bullets: cleanedBullets.length ? cleanedBullets : [""]
            });
          });

          setIsMagicScanning(false);
          setMagicLoading(false);
          setScanProgress(0);
          dispatch({
            type: "SET_MAGIC_SCAN_STATE",
            payload: {
              active: false,
              progress: 0
            }
          });
          scanTimeoutsRef.current = [];

          if (state.resumeId) {
            fetchRewriteHistory(state.resumeId);
          }
        }
      }, index * 140);

      scanTimeoutsRef.current.push(timerId);
    });
  }

  async function runAtsOptimization() {
    if (!jobDescription.trim()) {
      setAtsError("Paste a job description to run ATS optimization.");
      return;
    }

    setAtsError("");
    setAtsLoading(true);

    const result = await analyzeResumeMatch({
      resumeId: state.resumeId,
      resumeData: state.data,
      jobDescription
    });

    if (!result.ok) {
      setAtsError(result.error?.message || result.message || "Could not analyze this job description.");
      setAtsResult(null);
      setAtsLoading(false);
      return;
    }

    setAtsResult(result.analysis);
    setSelectedMissingKeywords([]);
    const keywordResult = await extractJdKeywords(jobDescription);
    if (keywordResult.ok) {
      setJdKeywords(keywordResult.keywords || []);
    }
    if (state.resumeId) {
      fetchHistory(state.resumeId);
    }
    setAtsLoading(false);
  }

  return (
    <div className="panel form-panel">
      <div className="form-title-row">
        <div>
          <h2>Resume Builder</h2>
          <p className="helper-text">
            Complete each section. The ATS preview updates instantly.
          </p>
        </div>
        <div className="completion-ring">{score}%</div>
      </div>

      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${score}%` }} />
      </div>

      <div className="stepper-row">
        {sectionOrder.map((section) => (
          <button
            key={section}
            type="button"
            className={`step-pill ${activeSection === section ? "active" : ""}`}
            onClick={() => jumpToSection(section)}
          >
            {sectionLabels[section]}
          </button>
        ))}
      </div>

      <section className="ats-optimizer-panel">
        <h3>ATS Optimizer</h3>
        <p className="helper-text">
          Paste target job description text and compare it with your current resume.
        </p>
        <label>
          Job Description
          <textarea
            rows={5}
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </label>
        <button type="button" onClick={runAtsOptimization} disabled={atsLoading}>
          {atsLoading ? "Analyzing..." : "Run ATS Analysis"}
        </button>
        {atsError ? <p className="error-text">{atsError}</p> : null}

        {atsResult ? (
          <div className="ats-results">
            <div className="ats-score-card">
              <p className="ats-score-label">ATS Score</p>
              <p className="ats-score-value">{atsResult.score}%</p>
              <p className="helper-text">
                Raw keyword coverage: {atsResult.rawScore}% | Matched {atsResult.matchedKeywords.length} of {atsResult.totalKeywords} keywords.
              </p>
              {Array.isArray(atsResult.priorityKeywords) && atsResult.priorityKeywords.length ? (
                <p className="helper-text">
                  Priority JD terms: {atsResult.priorityKeywords.slice(0, 6).join(", ")}
                </p>
              ) : null}
            </div>

            {atsResult.categoryScores ? (
              <div>
                <h4>Score Breakdown</h4>
                <div className="ats-section-grid">
                  {Object.entries(atsResult.categoryScores).map(([key, value]) => (
                    <div key={`score-${key}`} className="ats-section-card">
                      <p>{atsCategoryLabels[key] || key}</p>
                      <strong>{value || 0}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {atsResult.sectionBreakdown ? (
              <div className="ats-section-grid">
                {Object.entries(atsResult.sectionBreakdown)
                  .filter(([sectionKey]) => sectionKey !== "profile")
                  .map(([sectionKey, sectionValue]) => {
                    const sectionWeight = Math.round(Number(sectionValue?.weight || 0) * 100);
                    const sectionTitle = atsCoverageLabels[sectionKey] || sectionKey;
                    return (
                      <div key={`coverage-${sectionKey}`} className="ats-section-card">
                        <p>{sectionTitle}{sectionWeight ? ` (${sectionWeight}%)` : ""}</p>
                        <strong>{sectionValue?.coverage || 0}%</strong>
                      </div>
                    );
                  })}
              </div>
            ) : null}

            <div className="ats-columns">
              <div>
                <h4>Matched Keywords</h4>
                <div className="keyword-chip-wrap">
                  {atsResult.matchedKeywords.length ? (
                    atsResult.matchedKeywords.slice(0, 20).map((keyword) => (
                      <span key={`matched-${keyword}`} className="keyword-chip matched">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <p className="helper-text">No keyword matches found yet.</p>
                  )}
                </div>
              </div>

              <div>
                <h4>Missing Keywords</h4>
                <div className="keyword-chip-wrap">
                  {atsResult.missingKeywords.length ? (
                    atsResult.missingKeywords.slice(0, 20).map((keyword) => (
                      <label
                        key={`missing-${keyword}`}
                        className={`keyword-chip missing selectable ${
                          selectedMissingKeywords.includes(keyword) ? "active" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMissingKeywords.includes(keyword)}
                          onChange={() => toggleMissingKeyword(keyword)}
                        />
                        <span>{keyword}</span>
                      </label>
                    ))
                  ) : (
                    <p className="helper-text">Great alignment. No major keyword gaps.</p>
                  )}
                </div>
                <div className="keyword-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={insertKeywordsToSummary}
                    disabled={!selectedMissingKeywords.length}
                  >
                    Insert Selected into Summary
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={insertKeywordsToSkills}
                    disabled={!selectedMissingKeywords.length}
                  >
                    Insert Selected into Skills
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4>Action Suggestions</h4>
              <ul className="ats-suggestion-list">
                {atsResult.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="history-collapsible">
              <button
                type="button"
                className="history-toggle"
                onClick={() => setIsAnalysisHistoryOpen((prev) => !prev)}
                aria-expanded={isAnalysisHistoryOpen}
                aria-controls="analysis-history-content"
              >
                <span className="history-toggle-title">
                  <span
                    className={`history-toggle-arrow ${isAnalysisHistoryOpen ? "open" : ""}`}
                    aria-hidden="true"
                  >
                    ▸
                  </span>
                  <span>Analysis History (Before/After)</span>
                </span>
                <span className="history-toggle-count">{analysisHistory.length}</span>
              </button>

              {isAnalysisHistoryOpen ? (
                <div id="analysis-history-content" className="history-toggle-content">
                  {historyLoading ? <p className="helper-text">Loading history...</p> : null}
                  {!historyLoading && !analysisHistory.length ? (
                    <p className="helper-text">No analysis history yet for this draft.</p>
                  ) : null}
                  {!historyLoading && analysisHistory.length ? (
                    <ul className="history-list">
                      {[...analysisHistory]
                        .reverse()
                        .slice(0, 8)
                        .map((item) => (
                          <li key={item.id}>
                            <div>
                              <strong>{item.score}%</strong>
                              <span className="helper-text"> {new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="helper-text">
                              Delta from previous: {item.deltaFromPreviousScore === null
                                ? "N/A"
                                : `${item.deltaFromPreviousScore > 0 ? "+" : ""}${item.deltaFromPreviousScore}%`}
                            </div>
                            <p className="helper-text">{item.jobDescriptionPreview}</p>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className={`ats-optimizer-panel magic-panel-glass ${isRewriteLocked ? "locked" : ""}`}>
        <h3>AI Writer Optimization (Magic Button)</h3>
        <p className="helper-text">
          Automatically rewrite all experience and project bullets with ATS keyword targeting and quality checks.
        </p>

        {isRewriteLocked ? (
          <div className="pro-lock-banner" role="status">
            <span className="pro-lock-icon-wrap" aria-hidden="true">
              <LockIcon className="pro-lock-icon" />
            </span>
            <span>Pro feature: unlock unlimited AI rewrite scans.</span>
            {typeof onOpenBilling === "function" ? (
              <button type="button" className="secondary pro-lock-upgrade" onClick={onOpenBilling}>
                Unlock in Billing
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="helper-text">
          Ready to rewrite: {allRewriteTargets.length} bullet{allRewriteTargets.length === 1 ? "" : "s"}
          {` (`}
          {allExperienceBullets.length} experience + {allProjectBullets.length} project
          {allProjectBullets.length === 1 ? "" : "s"}
          {`)`}.
        </p>

        <label>
          Preferred Keyword (optional)
          <input
            value={magicKeyword}
            placeholder="Leave empty for auto keyword targeting"
            onChange={(e) => setMagicKeyword(e.target.value)}
            disabled={isRewriteLocked || magicLoading}
          />
        </label>

        {jdKeywords.length ? (
          <div className="keyword-chip-wrap">
            {jdKeywords.slice(0, 10).map((keyword) => (
              <button
                key={`jdkw-${keyword}`}
                type="button"
                className="secondary keyword-button"
                onClick={() => setMagicKeyword(keyword)}
                disabled={isRewriteLocked || magicLoading}
              >
                {keyword}
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="magic-wand-button"
          onClick={runMagicRewrite}
          disabled={magicLoading || isRewriteLocked}
        >
          {magicLoading ? (
            `Scanning... ${scanProgress}%`
          ) : (
            <>
              <span className="magic-wand-icon" aria-hidden="true">✦</span>
              <span>Magic Scan + Auto Rewrite</span>
            </>
          )}
        </button>

        {isMagicScanning ? (
          <div className="magic-scan-wrap" role="status" aria-live="polite">
            <div className="magic-scan-head">
              <span>Scanning and auto-applying rewritten bullets...</span>
              <strong>{scanProgress}%</strong>
            </div>
            <div className="magic-scan-track" aria-hidden="true">
              <span style={{ width: `${scanProgress}%` }} />
            </div>
            <div className="magic-scan-laser" aria-hidden="true" />
          </div>
        ) : null}

        {magicBatchResult ? (
          <div className="magic-results">
            <h4>Batch Rewrite Output</h4>

            <div className="ats-section-grid">
              <div className="ats-section-card">
                <p>Total Rewrites</p>
                <strong>{magicBatchResult.summary?.total || magicBatchResult.rewrites.length}</strong>
              </div>
              <div className="ats-section-card">
                <p>Rewritten</p>
                <strong>{magicBatchResult.summary?.rewrittenCount ?? magicBatchResult.rewrites.length}</strong>
              </div>
              <div className="ats-section-card">
                <p>Removed</p>
                <strong>{magicBatchResult.summary?.removedCount ?? 0}</strong>
              </div>
              <div className="ats-section-card">
                <p>Average Quality</p>
                <strong>{magicBatchResult.summary?.averageQuality || 0}/100</strong>
              </div>
              <div className="ats-section-card">
                <p>Average Latency</p>
                <strong>{magicBatchResult.summary?.averageLatencyMs || 0} ms</strong>
              </div>
            </div>

            <ul className="magic-rewrite-list">
              {magicBatchResult.rewrites.map((item, index) => (
                <li key={`rewrite-${item.sectionType}-${item.entryIndex}-${item.bulletIndex}-${index}`} className="magic-rewrite-item">
                  <p className="helper-text">
                    <strong>
                      {item.sectionType === "project"
                        ? `Project ${item.entryIndex + 1}, Bullet ${item.bulletIndex + 1}`
                        : `Experience ${item.entryIndex + 1}, Bullet ${item.bulletIndex + 1}`}
                    </strong>
                    {item.sectionType === "experience" && (item.role || item.company)
                      ? ` | ${item.role || "Role"}${item.company ? ` @ ${item.company}` : ""}`
                      : ""}
                    {item.sectionType === "project" && item.projectName
                      ? ` | ${item.projectName}`
                      : ""}
                  </p>
                  <p className="helper-text"><strong>Keyword:</strong> {item.keyword || "n/a"}</p>
                  <p className="helper-text"><strong>Original:</strong> {item.originalBullet}</p>
                  {item.removed ? (
                    <p className="helper-text">
                      <strong>Status:</strong> Removed as not relevant to JD ({item.removalReason || "not-related"}).
                    </p>
                  ) : (
                    <p className="helper-text"><strong>Rewritten:</strong> {item.rewrittenBullet}</p>
                  )}
                  <div className="magic-rewrite-meta">
                    <span>Verdict: {item.quality?.verdict || "n/a"}</span>
                    <span>Quality: {item.quality?.qualityScore ?? 0}/100</span>
                    <span>Relevance: {item.relevance?.relevanceScore ?? 0}/100</span>
                    <span>Spelling Issues: {item.quality?.spellingIssueCount ?? 0}</span>
                    <span>Professional Tone: {item.quality?.professionalToneScore ?? 0}</span>
                    <span>Latency: {item.latencyMs} ms</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="history-collapsible">
          <button
            type="button"
            className="history-toggle"
            onClick={() => setIsRewriteHistoryOpen((prev) => !prev)}
            aria-expanded={isRewriteHistoryOpen}
            aria-controls="rewrite-history-content"
          >
            <span className="history-toggle-title">
              <span
                className={`history-toggle-arrow ${isRewriteHistoryOpen ? "open" : ""}`}
                aria-hidden="true"
              >
                ▸
              </span>
              <span>Rewrite History</span>
            </span>
            <span className="history-toggle-count">{rewriteHistory.length}</span>
          </button>

          {isRewriteHistoryOpen ? (
            <div id="rewrite-history-content" className="history-toggle-content">
              {rewriteHistoryLoading ? <p className="helper-text">Loading rewrite history...</p> : null}
              {!rewriteHistoryLoading && !rewriteHistory.length ? (
                <p className="helper-text">No rewrite history yet for this draft.</p>
              ) : null}
              {!rewriteHistoryLoading && rewriteHistory.length ? (
                <ul className="history-list">
                  {[...rewriteHistory]
                    .reverse()
                    .slice(0, 8)
                    .map((item) => (
                      <li key={item.id}>
                        <div>
                          <strong>{item.verdict || "n/a"}</strong>
                          <span className="helper-text"> {new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="helper-text">
                          Keyword: {item.keyword || "n/a"} | Quality: {item.qualityScore ?? 0}/100 | Latency: {item.latencyMs ?? 0} ms
                        </div>
                        <p className="helper-text">{item.rewrittenBullet}</p>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {activeSection === "profile" ? (
        <section>
          <h3>Profile</h3>
        <label>
          Full Name
          <input
            placeholder="Enter Your Name"
            value={state.data.profile.fullName}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_PROFILE_FIELD",
                field: "fullName",
                value: e.target.value
              })
            }
          />
        </label>
        <label>
          Headline
          <input
            placeholder="Full Stack Developer"
            value={state.data.profile.title}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_PROFILE_FIELD",
                field: "title",
                value: e.target.value
              })
            }
          />
        </label>
        <label>
          Email
          <input
            placeholder="you@example.com"
            value={state.data.profile.email}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_PROFILE_FIELD",
                field: "email",
                value: e.target.value
              })
            }
          />
        </label>
        <label>
          Location
          <input
            placeholder="Hyderabad, India"
            value={state.data.profile.location}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_PROFILE_FIELD",
                field: "location",
                value: e.target.value
              })
            }
          />
        </label>
        <label>
          Summary
          <textarea
            placeholder="Write a concise summary focused on outcomes, stack, and impact."
            rows={4}
            value={state.data.profile.summary}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_PROFILE_FIELD",
                field: "summary",
                value: e.target.value
              })
            }
          />
        </label>
        </section>
      ) : null}

      {activeSection === "experience" ? (
        <section>
          <h3>Experience</h3>
          {experiences.map((entry, entryIndex) => {
            const entryBullets =
              Array.isArray(entry.bullets) && entry.bullets.length
                ? entry.bullets
                : [""];

            return (
              <div key={entry.id || `exp-${entryIndex}`} className="repeatable-block">
                <div className="repeatable-header">
                  <h4>Experience {entryIndex + 1}</h4>
                  <button
                    className="secondary remove-entry-button"
                    type="button"
                    onClick={() =>
                      dispatch({ type: "REMOVE_EXPERIENCE", index: entryIndex })
                    }
                    disabled={experiences.length <= 1}
                  >
                    Remove
                  </button>
                </div>

                <label>
                  Company
                  <input
                    placeholder="Palo Alto Networks"
                    value={entry.company || ""}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_EXPERIENCE_FIELD",
                        index: entryIndex,
                        field: "company",
                        value: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Role
                  <input
                    placeholder="Cybersecurity Intern"
                    value={entry.role || ""}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_EXPERIENCE_FIELD",
                        index: entryIndex,
                        field: "role",
                        value: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Location
                  <input
                    placeholder="Hyderabad, India"
                    value={entry.location || ""}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_EXPERIENCE_FIELD",
                        index: entryIndex,
                        field: "location",
                        value: e.target.value
                      })
                    }
                  />
                </label>

                {entryBullets.map((bullet, bulletIndex) => (
                  <div key={`${entry.id || entryIndex}-bullet-${bulletIndex}`} className="bullet-field">
                    <div className="bullet-field-head">
                      <span>Bullet {bulletIndex + 1}</span>
                      <button
                        type="button"
                        className="secondary bullet-delete-icon"
                        aria-label={`Delete experience bullet ${bulletIndex + 1}`}
                        onClick={() =>
                          dispatch({
                            type: "REMOVE_EXPERIENCE_BULLET",
                            index: entryIndex,
                            bulletIndex
                          })
                        }
                        disabled={entryBullets.length <= 1}
                      >
                        <TrashIcon className="bullet-delete-icon-svg" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      aria-label={`Experience bullet ${bulletIndex + 1}`}
                      value={bullet}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_EXPERIENCE_BULLET",
                          index: entryIndex,
                          bulletIndex,
                          value: e.target.value
                        })
                      }
                    />
                  </div>
                ))}

                <button
                  className="secondary"
                  type="button"
                  onClick={() =>
                    dispatch({ type: "ADD_EXPERIENCE_BULLET", index: entryIndex })
                  }
                >
                  Add Bullet
                </button>
              </div>
            );
          })}

          <p className="helper-text">Tip: Start bullets with action verbs and include measurable impact.</p>
          <button
            className="secondary"
            type="button"
            onClick={() => dispatch({ type: "ADD_EXPERIENCE" })}
          >
            Add Experience
          </button>
        </section>
      ) : null}

      {activeSection === "education" ? (
        <section>
          <h3>Education</h3>
          {educationItems.map((entry, entryIndex) => (
            <div key={entry.id || `edu-${entryIndex}`} className="repeatable-block">
              <div className="repeatable-header">
                <h4>Education {entryIndex + 1}</h4>
                <button
                  className="secondary remove-entry-button"
                  type="button"
                  onClick={() =>
                    dispatch({ type: "REMOVE_EDUCATION", index: entryIndex })
                  }
                  disabled={educationItems.length <= 1}
                >
                  Remove
                </button>
              </div>

              <label>
                Institution
                <input
                  placeholder="College"
                  value={entry.institution || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_EDUCATION_FIELD",
                      index: entryIndex,
                      field: "institution",
                      value: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Degree
                <input
                  placeholder="B.Tech"
                  value={entry.degree || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_EDUCATION_FIELD",
                      index: entryIndex,
                      field: "degree",
                      value: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Field
                <input
                  placeholder="Computer Science"
                  value={entry.field || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_EDUCATION_FIELD",
                      index: entryIndex,
                      field: "field",
                      value: e.target.value
                    })
                  }
                />
              </label>

              <div className="inline-two-col">
                <label>
                  Start Year
                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    placeholder="2018"
                    value={entry.startYear ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_EDUCATION_FIELD",
                        index: entryIndex,
                        field: "startYear",
                        value: parseOptionalYear(e.target.value)
                      })
                    }
                  />
                </label>

                <label>
                  End Year
                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    placeholder="2022"
                    value={entry.endYear ?? ""}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_EDUCATION_FIELD",
                        index: entryIndex,
                        field: "endYear",
                        value: parseOptionalYear(e.target.value)
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            className="secondary"
            type="button"
            onClick={() => dispatch({ type: "ADD_EDUCATION" })}
          >
            Add Education
          </button>
        </section>
      ) : null}

      {activeSection === "projects" ? (
        <section>
          <h3>Project</h3>
          {projects.map((entry, entryIndex) => {
            const entryBullets =
              Array.isArray(entry.bullets) && entry.bullets.length
                ? entry.bullets
                : [""];

            return (
              <div key={entry.id || `proj-${entryIndex}`} className="repeatable-block">
                <div className="repeatable-header">
                  <h4>Project {entryIndex + 1}</h4>
                  <button
                    className="secondary remove-entry-button"
                    type="button"
                    onClick={() =>
                      dispatch({ type: "REMOVE_PROJECT", index: entryIndex })
                    }
                    disabled={projects.length <= 1}
                  >
                    Remove
                  </button>
                </div>

                <label>
                  Project Name
                  <input
                    placeholder="AI Resume Architect"
                    value={entry.name || ""}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PROJECT_FIELD",
                        index: entryIndex,
                        field: "name",
                        value: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Tech Stack (comma-separated)
                  <input
                    placeholder="React, Node.js, MongoDB"
                    value={(entry.stack || []).join(", ")}
                    onChange={(e) =>
                      dispatch({
                        type: "UPDATE_PROJECT_FIELD",
                        index: entryIndex,
                        field: "stack",
                        value: e.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      })
                    }
                  />
                </label>

                {entryBullets.map((bullet, bulletIndex) => (
                  <div key={`${entry.id || entryIndex}-bullet-${bulletIndex}`} className="bullet-field">
                    <div className="bullet-field-head">
                      <span>Project Bullet {bulletIndex + 1}</span>
                      <button
                        type="button"
                        className="secondary bullet-delete-icon"
                        aria-label={`Delete project bullet ${bulletIndex + 1}`}
                        onClick={() =>
                          dispatch({
                            type: "REMOVE_PROJECT_BULLET",
                            index: entryIndex,
                            bulletIndex
                          })
                        }
                        disabled={entryBullets.length <= 1}
                      >
                        <TrashIcon className="bullet-delete-icon-svg" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      aria-label={`Project bullet ${bulletIndex + 1}`}
                      value={bullet}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PROJECT_BULLET",
                          index: entryIndex,
                          bulletIndex,
                          value: e.target.value
                        })
                      }
                    />
                  </div>
                ))}

                <button
                  className="secondary"
                  type="button"
                  onClick={() => dispatch({ type: "ADD_PROJECT_BULLET", index: entryIndex })}
                >
                  Add Project Bullet
                </button>
              </div>
            );
          })}

          <button
            className="secondary"
            type="button"
            onClick={() => dispatch({ type: "ADD_PROJECT" })}
          >
            Add Project
          </button>
        </section>
      ) : null}

      {activeSection === "skills" ? (
        <section>
          <h3>Skills</h3>
        <label>
          Comma-separated skills
          <input
            placeholder="React, Node.js, REST APIs"
            value={skillString}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_SKILLS",
                payload: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              })
            }
          />
        </label>
          <div className="quick-skills-row">
            {suggestedSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                className="secondary"
                onClick={() => addSuggestedSkill(skill)}
              >
                + {skill}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {activeSection === "certifications" ? (
        <section>
          <h3>Certification</h3>
          {certifications.map((entry, entryIndex) => (
            <div key={entry.id || `cert-${entryIndex}`} className="repeatable-block">
              <div className="repeatable-header">
                <h4>Certification {entryIndex + 1}</h4>
                <button
                  className="secondary remove-entry-button"
                  type="button"
                  onClick={() =>
                    dispatch({ type: "REMOVE_CERTIFICATION", index: entryIndex })
                  }
                  disabled={certifications.length <= 1}
                >
                  Remove
                </button>
              </div>

              <label>
                Name
                <input
                  placeholder="AWS Cloud Practitioner"
                  value={entry.name || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_CERTIFICATION_FIELD",
                      index: entryIndex,
                      field: "name",
                      value: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Issuer
                <input
                  placeholder="Amazon Web Services"
                  value={entry.issuer || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_CERTIFICATION_FIELD",
                      index: entryIndex,
                      field: "issuer",
                      value: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Year
                <input
                  type="number"
                  min="1950"
                  max="2100"
                  placeholder="2024"
                  value={entry.year ?? ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_CERTIFICATION_FIELD",
                      index: entryIndex,
                      field: "year",
                      value: parseOptionalYear(e.target.value)
                    })
                  }
                />
              </label>
            </div>
          ))}

          <button
            className="secondary"
            type="button"
            onClick={() => dispatch({ type: "ADD_CERTIFICATION" })}
          >
            Add Certification
          </button>
        </section>
      ) : null}

      <div className="wizard-footer">
        <button
          type="button"
          className="secondary"
          disabled={activeIndex === 0}
          onClick={() => moveSection(-1)}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={activeIndex === sectionOrder.length - 1}
          onClick={() => moveSection(1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
