import React, { useEffect, useMemo, useRef, useState } from "react";
import { useResume } from "../context/resumeContext";
import {
  ATS_TEMPLATES,
  getTemplateMeta
} from "../templates/templateMeta";
import {
  SAMPLE_RESUME_DATA,
  resolveTemplatePreviewData
} from "../templates/sampleResumeData";
import {
  DEFAULT_ENTITLEMENT_FEATURES,
  isPremiumTemplateId
} from "../constants/entitlements";

const ACTION_VERBS = [
  "built",
  "developed",
  "designed",
  "led",
  "improved",
  "optimized",
  "implemented",
  "integrated",
  "automated",
  "delivered",
  "launched",
  "managed"
];

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

const PREVIEW_DEFAULT_PAGE_HEIGHT_PX = 1040;

function getStoredTemplateId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("careerforge.templateId") || "";
}

function storeTemplateId(templateId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("careerforge.templateId", templateId);
  window.dispatchEvent(new Event("careerforge-template-changed"));
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

function normalizeTemplateCard(candidate) {
  if (!candidate || typeof candidate !== "object") return null;

  const id = String(candidate.id || "").trim();
  const name = String(candidate.name || "").trim();
  const layout = String(candidate.layout || "").trim().toLowerCase();

  if (!id || !name || !ALLOWED_TEMPLATE_LAYOUTS.has(layout)) {
    return null;
  }

  return {
    id,
    name,
    badge: String(candidate.badge || "Imported").trim() || "Imported",
    description:
      String(candidate.description || "Detected from uploaded PDF layout.").trim() ||
      "Detected from uploaded PDF layout.",
    layout,
    metaTemplateId: String(candidate.metaTemplateId || "classic").trim() || "classic",
    source: String(candidate.source || "custom").trim() || "custom",
    confidence: Number(candidate.confidence || 0)
  };
}

function getStoredCustomTemplates() {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const uniqueById = new Map();
    parsed.forEach((item) => {
      const normalized = normalizeTemplateCard(item);
      if (!normalized) return;
      if (uniqueById.has(normalized.id)) return;
      uniqueById.set(normalized.id, normalized);
    });

    return [...uniqueById.values()];
  } catch {
    return [];
  }
}

function normalizeSentence(text) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentence = clean[0].toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function normalizeBullet(text) {
  const sentence = normalizeSentence(text);
  if (!sentence) return "";
  const firstWord = sentence.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
  if (ACTION_VERBS.includes(firstWord)) return sentence;
  return `Delivered ${sentence[0].toLowerCase()}${sentence.slice(1)}`;
}

function clipText(text, maxLength = 140) {
  const normalized = (text || "").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function getInitials(fullName) {
  const words = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "YN";
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() || "").join("");
  return initials || "YN";
}

function contactLine(profile) {
  return [profile?.email, profile?.phone, profile?.location]
    .filter((item) => typeof item === "string" && item.trim())
    .join(" | ");
}

function joinDisplayParts(parts, separator = " | ") {
  return (Array.isArray(parts) ? parts : [])
    .map((part) => String(part ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(separator);
}

function formatEducationLine(entry) {
  if (!entry) return "";

  const degreeAndField = joinDisplayParts([entry.degree, entry.field], " in ");
  const core = joinDisplayParts([degreeAndField, entry.institution]);
  const year = entry.endYear || entry.startYear || "";

  return joinDisplayParts([core, year]);
}

function formatCertificationLine(item) {
  if (!item) return "";
  return joinDisplayParts([item.name, item.issuer, item.year]);
}

function splitSkills(items) {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function renderSkillsTwoColumns(items, className) {
  const [left, right] = splitSkills(items);

  return (
    <div className={className}>
      <ul>
        {left.map((item) => (
          <li key={`left-${item}`}>{item}</li>
        ))}
      </ul>
      <ul>
        {right.map((item) => (
          <li key={`right-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function readTextContent(node) {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((item) => readTextContent(item)).join(" ");
  }

  if (React.isValidElement(node)) {
    return readTextContent(node.props?.children);
  }

  return "";
}

function inferSectionKey(headingText) {
  const normalized = (headingText || "").toLowerCase().trim();
  if (!normalized) return null;

  if (
    normalized.includes("summary") ||
    normalized.includes("profile") ||
    normalized.includes("narrative")
  ) {
    return "summary";
  }

  if (
    normalized.includes("skills") ||
    normalized.includes("competencies") ||
    normalized.includes("keywords") ||
    normalized.includes("skill bank")
  ) {
    return "skills";
  }

  if (normalized.includes("highlights")) {
    return "highlights";
  }

  if (normalized.includes("experience") || normalized.includes("snapshot")) {
    return "experience";
  }

  if (normalized.includes("project")) {
    return "projects";
  }

  if (normalized.includes("education")) {
    return "education";
  }

  if (normalized.includes("certification")) {
    return "certifications";
  }

  if (normalized.includes("language")) {
    return "languages";
  }

  return null;
}

function applySectionOrderRecursively(node, sectionOrder) {
  if (!React.isValidElement(node)) {
    if (Array.isArray(node)) {
      return node.map((child) => applySectionOrderRecursively(child, sectionOrder));
    }

    return node;
  }

  const updatedChildren = React.Children.map(node.props?.children, (child) =>
    applySectionOrderRecursively(child, sectionOrder)
  );

  if (typeof node.type === "string" && node.type.toLowerCase() === "section") {
    const childArray = React.Children.toArray(updatedChildren);
    const headingNode = childArray.find(
      (child) =>
        React.isValidElement(child) &&
        typeof child.type === "string" &&
        /^h[1-6]$/i.test(child.type)
    );

    const sectionKey = inferSectionKey(readTextContent(headingNode?.props?.children));

    if (sectionKey) {
      const sectionIndex = sectionOrder.indexOf(sectionKey);
      const nextStyle =
        sectionIndex >= 0
          ? {
              ...(node.props?.style || {}),
              order: sectionIndex + 1
            }
          : node.props?.style;

      return React.cloneElement(node, {
        ...node.props,
        style: nextStyle,
        "data-section": sectionKey
      }, updatedChildren);
    }
  }

  return React.cloneElement(node, {
    ...node.props
  }, updatedChildren);
}

export default function ResumePreview({
  entitlements = DEFAULT_ENTITLEMENT_FEATURES,
  onOpenBilling
}) {
  const { state } = useResume();
  const magicScanState =
    state.magicScan && typeof state.magicScan === "object"
      ? state.magicScan
      : { active: false, progress: 0 };
  const previewScanActive = Boolean(magicScanState.active);
  const previewScanProgress = Number.isFinite(Number(magicScanState.progress))
    ? Math.max(0, Math.min(100, Number(magicScanState.progress)))
    : 0;
  const previewData = useMemo(
    () => resolveTemplatePreviewData(state.data),
    [state.data]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState(() => getStoredTemplateId());
  const [popupTemplateId, setPopupTemplateId] = useState("");
  const [customTemplates, setCustomTemplates] = useState(() => getStoredCustomTemplates());
  const previewPagesStackRef = useRef(null);
  const previewMeasureRef = useRef(null);
  const [previewPageHeightPx, setPreviewPageHeightPx] = useState(PREVIEW_DEFAULT_PAGE_HEIGHT_PX);
  const [previewPageCount, setPreviewPageCount] = useState(1);

  const templateCards = useMemo(() => {
    const builtInIds = new Set(ATS_TEMPLATES.map((item) => item.id));
    const safeCustom = customTemplates.filter((item) => !builtInIds.has(item.id));
    return [...safeCustom, ...ATS_TEMPLATES];
  }, [customTemplates]);

  const selectedTemplate = useMemo(
    () => templateCards.find((item) => item.id === selectedTemplateId) || null,
    [selectedTemplateId, templateCards]
  );

  const popupTemplate = useMemo(
    () => templateCards.find((item) => item.id === popupTemplateId) || null,
    [popupTemplateId, templateCards]
  );

  const selectedLayout = selectedTemplate?.layout || "classic";

  const popupLayout = popupTemplate?.layout || "classic";

  const selectedMeta = selectedTemplate
    ? getTemplateMeta(selectedTemplate.metaTemplateId || selectedTemplate.id)
    : null;
  const popupMeta = popupTemplate
    ? getTemplateMeta(popupTemplate.metaTemplateId || popupTemplate.id)
    : null;
  const selectedTemplateReferenceId = selectedTemplate
    ? selectedTemplate.metaTemplateId || selectedTemplate.id
    : "";
  const enableFullContent = Boolean(selectedTemplate);
  const previewPageIndexes = useMemo(
    () => Array.from({ length: previewPageCount }, (_, index) => index),
    [previewPageCount]
  );
  const hasPremiumTemplates = Boolean(entitlements?.premiumTemplates);
  const popupLocked = popupTemplate ? isTemplateLocked(popupTemplate.id) : false;
  const demoData = useMemo(
    () => resolveTemplatePreviewData(SAMPLE_RESUME_DATA),
    []
  );

  function isTemplateLocked(templateId) {
    return !hasPremiumTemplates && isPremiumTemplateId(templateId);
  }

  useEffect(() => {
    function syncTemplateState() {
      setSelectedTemplateId(getStoredTemplateId());
      setCustomTemplates(getStoredCustomTemplates());
    }

    window.addEventListener("careerforge-template-changed", syncTemplateState);
    window.addEventListener("storage", syncTemplateState);

    return () => {
      window.removeEventListener("careerforge-template-changed", syncTemplateState);
      window.removeEventListener("storage", syncTemplateState);
    };
  }, []);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    if (hasPremiumTemplates || !isPremiumTemplateId(selectedTemplate.id)) {
      return;
    }

    setSelectedTemplateId("");
    storeTemplateId("");
  }, [selectedTemplate, hasPremiumTemplates]);

  useEffect(() => {
    if (!selectedTemplate) {
      setPreviewPageCount(1);
      setPreviewPageHeightPx(PREVIEW_DEFAULT_PAGE_HEIGHT_PX);
      return;
    }

    let observer;

    function resolvePreviewPageHeight() {
      const stackNode = previewPagesStackRef.current;
      if (!stackNode) return PREVIEW_DEFAULT_PAGE_HEIGHT_PX;

      const rawPageHeight = window
        .getComputedStyle(stackNode)
        .getPropertyValue("--preview-page-height");
      const parsedPageHeight = Number.parseFloat(rawPageHeight);

      if (!Number.isFinite(parsedPageHeight) || parsedPageHeight <= 0) {
        return PREVIEW_DEFAULT_PAGE_HEIGHT_PX;
      }

      return parsedPageHeight;
    }

    function updatePreviewPageCount() {
      const node = previewMeasureRef.current;
      if (!node) return;

      const runtimePageHeight = resolvePreviewPageHeight();
      setPreviewPageHeightPx((previous) => (
        Math.abs(previous - runtimePageHeight) < 0.5 ? previous : runtimePageHeight
      ));

      const contentHeight = Math.max(node.scrollHeight || 0, node.offsetHeight || 0);
      const nextPageCount = Math.max(1, Math.ceil(contentHeight / runtimePageHeight));

      setPreviewPageCount((previous) => (
        previous === nextPageCount ? previous : nextPageCount
      ));
    }

    updatePreviewPageCount();

    if (typeof ResizeObserver !== "undefined" && previewMeasureRef.current) {
      observer = new ResizeObserver(updatePreviewPageCount);
      observer.observe(previewMeasureRef.current);
    }

    window.addEventListener("resize", updatePreviewPageCount);

    return () => {
      window.removeEventListener("resize", updatePreviewPageCount);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [selectedTemplate, selectedLayout, selectedTemplateReferenceId, previewData]);

  function applyRoleSectionOrder(templateNode, templateId) {
    if (!templateId) return templateNode;

    const sectionOrder = getTemplateMeta(templateId)?.sectionOrder || [];
    if (!sectionOrder.length) return templateNode;

    return applySectionOrderRecursively(templateNode, sectionOrder);
  }

  function listOrEmpty(items) {
    return Array.isArray(items) ? items : [];
  }

  function takePreviewItems(items, maxItems) {
    const normalized = listOrEmpty(items);
    if (enableFullContent) {
      return normalized;
    }
    return normalized.slice(0, maxItems);
  }

  function formatPreviewBullet(bullet, maxLength = 140) {
    const normalized = normalizeBullet(bullet);
    if (enableFullContent) {
      return normalized;
    }
    return clipText(normalized, maxLength);
  }

  function summarizeBullets(bullets, maxLength = 120) {
    const normalized = listOrEmpty(bullets)
      .map((item) => normalizeBullet(item))
      .filter(Boolean);

    if (!normalized.length) {
      return "";
    }

    if (enableFullContent) {
      return normalized.join(" ");
    }

    return clipText(normalized[0], maxLength);
  }

  function getPrimarySkills(data, max = 14) {
    const normalized = listOrEmpty(data.skills?.[0]?.items).filter(Boolean);
    if (enableFullContent) {
      return normalized;
    }
    return normalized.slice(0, max);
  }

  function getProfileSummary(profileData, skillsData) {
    const normalized = normalizeSentence(profileData?.summary);
    if (normalized) return normalized;

    return `Results-driven ${profileData?.title || "professional"} with hands-on experience in ${
      skillsData.slice(0, 5).join(", ") || "cross-functional delivery and measurable outcomes"
    }.`;
  }

  function renderLanguageRows(items) {
    return (
      <div className="tpl-language-grid">
        {listOrEmpty(items).map((language, index) => (
          <div key={`${language.name || "lang"}-${index}`} className="tpl-language-row">
            <div className="tpl-language-head">
              <strong>{language.name}</strong>
              <span>{language.level}</span>
            </div>
            <div className="tpl-language-track">
              <span style={{ width: `${Math.max(10, Math.min(100, language.score || 0))}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderClassicTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data);
    const projectItems = listOrEmpty(data.projects);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-classic">
        <header className="tpl-classic-header">
          <div className="tpl-classic-initials">{getInitials(profileData.fullName)}</div>
          <div className="tpl-classic-title">
            <h1>{profileData.fullName}</h1>
            <p>{contactLine(profileData)}</p>
          </div>
        </header>

        <section className="tpl-classic-section">
          <h2>Summary</h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-classic-section">
          <h2>Skills</h2>
          {renderSkillsTwoColumns(skillsData, "tpl-classic-skill-columns")}
        </section>

        <section className="tpl-classic-section">
          <h2>Experience</h2>
          {listOrEmpty(data.experience).map((entry, index) => (
            <article key={entry.id || `exp-${index}`} className="tpl-classic-exp-item">
              <div className="tpl-classic-exp-head">
                <strong>{entry.role} | {entry.company}</strong>
                <span>{entry.location}</span>
              </div>
              <ul>
                {takePreviewItems(entry.bullets, 4).map((bullet, bulletIndex) => (
                  <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {projectItems.length ? (
          <section className="tpl-classic-section">
            <h2>Projects</h2>
            {projectItems.map((project, index) => (
              <article key={project.id || `classic-project-${index}`} className="tpl-project-item">
                <div className="tpl-project-item-head">
                  <strong>{project.name}</strong>
                  {listOrEmpty(project.stack).length ? (
                    <span className="tpl-project-stack">
                      {takePreviewItems(project.stack, 4).join(", ")}
                    </span>
                  ) : null}
                </div>
                <ul>
                  {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                    <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ) : null}

        <section className="tpl-classic-section">
          <h2>Education and Training</h2>
          {listOrEmpty(data.education).map((entry, index) => (
            <p key={entry.id || `edu-${index}`} className="tpl-education-line">
              {formatEducationLine(entry)}
            </p>
          ))}
        </section>

        {certItems.length ? (
          <section className="tpl-classic-section">
            <h2>Certifications</h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "classic-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  function renderCorporateTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data, 12);
    const certItems = listOrEmpty(data.certifications);
    const projectItems = listOrEmpty(data.projects);

    return (
      <div className="tpl tpl-corporate">
        <header className="tpl-corporate-header">
          <div className="tpl-corporate-heading">
            <h1>{profileData.fullName}</h1>
            <p>{profileData.title || "Professional"}</p>
          </div>
          <div className="tpl-corporate-contact-grid">
            <span>{profileData.email}</span>
            <span>{profileData.phone}</span>
            <span>{profileData.location}</span>
          </div>
        </header>

        <section className="tpl-corporate-section">
          <h2>Professional Profile</h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-corporate-section">
          <h2>Core Skills</h2>
          <div className="tpl-chip-wrap">
            {skillsData.map((item) => (
              <span key={`corp-skill-${item}`}>{item}</span>
            ))}
          </div>
        </section>

        <section className="tpl-corporate-section">
          <h2>Professional Experience</h2>
          {listOrEmpty(data.experience).map((entry, index) => (
            <article key={entry.id || `corp-exp-${index}`} className="tpl-corporate-exp-item">
              <div className="tpl-corporate-exp-head">
                <strong>{entry.role}</strong>
                <span>{entry.company}</span>
                <small>{[entry.startDate, entry.endDate].filter(Boolean).join(" - ")}</small>
              </div>
              <ul>
                {takePreviewItems(entry.bullets, 3).map((bullet, bulletIndex) => (
                  <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {projectItems.length ? (
          <section className="tpl-corporate-section">
            <h2>Projects</h2>
            {projectItems.map((project, index) => (
              <article key={project.id || `corp-project-${index}`} className="tpl-project-item">
                <div className="tpl-project-item-head">
                  <strong>{project.name}</strong>
                  {listOrEmpty(project.stack).length ? (
                    <span className="tpl-project-stack">
                      {takePreviewItems(project.stack, 4).join(", ")}
                    </span>
                  ) : null}
                </div>
                <ul>
                  {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                    <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ) : null}

        <section className="tpl-corporate-section tpl-corporate-foot">
          <div>
            <h2>Education</h2>
            {listOrEmpty(data.education).map((entry, index) => (
              <p key={entry.id || `corp-edu-${index}`} className="tpl-education-line">
                {formatEducationLine(entry)}
              </p>
            ))}
          </div>

          <div>
            <h2>Certifications</h2>
            <ul className="tpl-corporate-certs">
              {certItems.map((item, index) => (
                <li key={`${item.name || "cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    );
  }

  function renderTimelineTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data, 10);
    const projectItems = listOrEmpty(data.projects);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-timeline">
        <header className="tpl-timeline-header">
          <h1>{profileData.fullName}</h1>
          <p>{profileData.title || "Professional"}</p>
          <small>{contactLine(profileData)}</small>
        </header>

        <section className="tpl-timeline-section">
          <h2>Career Summary</h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-timeline-section">
          <h2>Keyword Skills</h2>
          <div className="tpl-chip-wrap">
            {skillsData.map((item) => (
              <span key={`time-skill-${item}`}>{item}</span>
            ))}
          </div>
        </section>

        <section className="tpl-timeline-section">
          <h2>Chronological Experience</h2>
          <div className="tpl-timeline-list">
            {listOrEmpty(data.experience).map((entry, index) => (
              <article key={entry.id || `time-exp-${index}`} className="tpl-timeline-row">
                <div className="tpl-timeline-period">
                  {[entry.startDate, entry.endDate].filter(Boolean).join(" - ") || "Recent"}
                </div>
                <div className="tpl-timeline-content">
                  <p className="tpl-timeline-role">
                    <strong>{entry.role}</strong> | {entry.company}
                  </p>
                  <p className="tpl-timeline-location">{entry.location}</p>
                  <ul>
                    {takePreviewItems(entry.bullets, 3).map((bullet, bulletIndex) => (
                      <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {projectItems.length ? (
          <section className="tpl-timeline-section">
            <h2>Projects</h2>
            <div className="tpl-timeline-list">
              {projectItems.map((project, index) => (
                <article key={project.id || `timeline-project-${index}`} className="tpl-project-item">
                  <div className="tpl-project-item-head">
                    <strong>{project.name}</strong>
                    {listOrEmpty(project.stack).length ? (
                      <span className="tpl-project-stack">
                        {takePreviewItems(project.stack, 4).join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <ul>
                    {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                      <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="tpl-timeline-section">
          <h2>Education</h2>
          {listOrEmpty(data.education).map((entry, index) => (
            <p key={entry.id || `time-edu-${index}`} className="tpl-education-line">
              {formatEducationLine(entry)}
            </p>
          ))}
        </section>

        {certItems.length ? (
          <section className="tpl-timeline-section">
            <h2>Certifications</h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "timeline-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  function renderModernTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data);
    const projectItems = listOrEmpty(data.projects);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-modern">
        <header className="tpl-modern-header">
          <div className="tpl-modern-initials">{getInitials(profileData.fullName)}</div>
          <h1>{profileData.fullName}</h1>
          <p>{contactLine(profileData)}</p>
        </header>

        <section className="tpl-modern-section">
          <h2>Summary</h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-modern-section">
          <h2>Skills</h2>
          {renderSkillsTwoColumns(skillsData, "tpl-modern-skill-columns")}
        </section>

        <section className="tpl-modern-section">
          <h2>Experience</h2>
          {listOrEmpty(data.experience).map((entry, index) => (
            <article key={entry.id || `modern-exp-${index}`} className="tpl-modern-exp-item">
              <div className="tpl-modern-exp-left">
                <strong>{entry.company}</strong>
                <span>{entry.role}</span>
                <small>{entry.location}</small>
              </div>
              <ul className="tpl-modern-exp-right">
                {takePreviewItems(entry.bullets, 4).map((bullet, bulletIndex) => (
                  <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {projectItems.length ? (
          <section className="tpl-modern-section">
            <h2>Projects</h2>
            {projectItems.map((project, index) => (
              <article key={project.id || `modern-project-${index}`} className="tpl-project-item">
                <div className="tpl-project-item-head">
                  <strong>{project.name}</strong>
                  {listOrEmpty(project.stack).length ? (
                    <span className="tpl-project-stack">
                      {takePreviewItems(project.stack, 4).join(", ")}
                    </span>
                  ) : null}
                </div>
                <ul>
                  {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                    <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ) : null}

        <section className="tpl-modern-section">
          <h2>Education and Training</h2>
          {listOrEmpty(data.education).map((entry, index) => (
            <p key={entry.id || `modern-edu-${index}`} className="tpl-education-line">
              {formatEducationLine(entry)}
            </p>
          ))}
        </section>

        {certItems.length ? (
          <section className="tpl-modern-section">
            <h2>Certifications</h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "modern-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  function renderNordicTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data, 10);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-nordic">
        <header className="tpl-nordic-header">
          <h1>{profileData.fullName}</h1>
          <p>{profileData.title || "Professional"}</p>
          <small>{contactLine(profileData)}</small>
        </header>

        <div className="tpl-nordic-grid">
          <aside className="tpl-nordic-side">
            <section>
              <h2>Profile</h2>
              <p>{getProfileSummary(profileData, skillsData)}</p>
            </section>
            <section>
              <h2>Skills</h2>
              <div className="tpl-chip-wrap">
                {skillsData.map((item) => (
                  <span key={`nordic-skill-${item}`}>{item}</span>
                ))}
              </div>
            </section>
            <section>
              <h2>Languages</h2>
              {renderLanguageRows(data.languages)}
            </section>
            {certItems.length ? (
              <section>
                <h2>Certifications</h2>
                <ul>
                  {certItems.map((item, index) => (
                    <li key={`${item.name || "nordic-cert"}-${index}`}>
                      {formatCertificationLine(item)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>

          <main className="tpl-nordic-main">
            <section>
              <h2>Experience</h2>
              {listOrEmpty(data.experience).map((entry, index) => (
                <article key={entry.id || `nordic-exp-${index}`} className="tpl-nordic-exp-item">
                  <p>
                    <strong>{entry.role}</strong> | {entry.company}
                  </p>
                  <small>{[entry.location, entry.startDate, entry.endDate].filter(Boolean).join(" | ")}</small>
                  <ul>
                    {takePreviewItems(entry.bullets, 3).map((bullet, bulletIndex) => (
                      <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>

            <section>
              <h2>Projects</h2>
              {listOrEmpty(data.projects).map((project, index) => (
                <article key={project.id || `nordic-project-${index}`} className="tpl-nordic-project-item">
                  <p><strong>{project.name}</strong></p>
                  <ul>
                    {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                      <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>

            <section>
              <h2>Education</h2>
              {listOrEmpty(data.education).map((entry, index) => (
                <p key={entry.id || `nordic-edu-${index}`} className="tpl-education-line">
                  {formatEducationLine(entry)}
                </p>
              ))}
            </section>
          </main>
        </div>
      </div>
    );
  }

  function renderCreativeTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data, 12);
    const projectItems = listOrEmpty(data.projects);

    return (
      <div className="tpl tpl-creative">
        <header className="tpl-creative-header">
          <h1>{profileData.fullName}</h1>
          <p>{profileData.title || "Professional"}</p>
          <small>{contactLine(profileData)}</small>
        </header>

        <div className="tpl-creative-grid">
          <aside className="tpl-creative-side">
            <section>
              <h2>Profile Snapshot</h2>
              <p>{getProfileSummary(profileData, skillsData)}</p>
            </section>

            <section>
              <h2>Skill Bank</h2>
              <div className="tpl-chip-wrap">
                {skillsData.map((item) => (
                  <span key={`creative-skill-${item}`}>{item}</span>
                ))}
              </div>
            </section>

            <section>
              <h2>Certifications</h2>
              <ul>
                {listOrEmpty(data.certifications).map((item, index) => (
                  <li key={`${item.name || "creative-cert"}-${index}`}>
                    {formatCertificationLine(item)}
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <main className="tpl-creative-main">
            <section>
              <h2>Experience</h2>
              {listOrEmpty(data.experience).map((entry, index) => (
                <article key={entry.id || `creative-exp-${index}`} className="tpl-creative-exp-item">
                  <p>
                    <strong>{entry.role}</strong> | {entry.company}
                  </p>
                  <small>{entry.location}</small>
                  <ul>
                    {takePreviewItems(entry.bullets, 3).map((bullet, bulletIndex) => (
                      <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </section>

            {projectItems.length ? (
              <section>
                <h2>Projects</h2>
                {projectItems.map((project, index) => (
                  <article key={project.id || `creative-project-${index}`} className="tpl-project-item">
                    <div className="tpl-project-item-head">
                      <strong>{project.name}</strong>
                      {listOrEmpty(project.stack).length ? (
                        <span className="tpl-project-stack">
                          {takePreviewItems(project.stack, 4).join(", ")}
                        </span>
                      ) : null}
                    </div>
                    <ul>
                      {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                        <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </section>
            ) : null}

            <section>
              <h2>Education</h2>
              {listOrEmpty(data.education).map((entry, index) => (
                <p key={entry.id || `creative-edu-${index}`} className="tpl-education-line">
                  {formatEducationLine(entry)}
                </p>
              ))}
            </section>
          </main>
        </div>
      </div>
    );
  }

  function renderCompactTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data);
    const projectItems = listOrEmpty(data.projects);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-compact">
        <header className="tpl-compact-header">
          <h1>{(profileData.fullName || "Your Name").toUpperCase()}</h1>
          <p>{contactLine(profileData)}</p>
        </header>

        <section className="tpl-compact-section">
          <h2><span>Summary</span></h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-compact-section">
          <h2><span>Skills</span></h2>
          {renderSkillsTwoColumns(skillsData, "tpl-compact-skill-columns")}
        </section>

        <section className="tpl-compact-section">
          <h2><span>Experience</span></h2>
          {listOrEmpty(data.experience).map((entry, index) => (
            <article key={entry.id || `compact-exp-${index}`} className="tpl-compact-exp-item">
              <p className="tpl-compact-exp-head">
                <strong>{entry.role}</strong> | {entry.company} | {entry.location}
              </p>
              <ul>
                {takePreviewItems(entry.bullets, 4).map((bullet, bulletIndex) => (
                  <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {projectItems.length ? (
          <section className="tpl-compact-section">
            <h2><span>Projects</span></h2>
            {projectItems.map((project, index) => (
              <article key={project.id || `compact-project-${index}`} className="tpl-project-item">
                <p className="tpl-compact-exp-head">
                  <strong>{project.name}</strong>
                  {listOrEmpty(project.stack).length
                    ? ` | ${takePreviewItems(project.stack, 4).join(", ")}`
                    : ""}
                </p>
                <ul>
                  {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                    <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ) : null}

        <section className="tpl-compact-section">
          <h2><span>Education and Training</span></h2>
          {listOrEmpty(data.education).map((entry, index) => (
            <p key={entry.id || `compact-edu-${index}`} className="tpl-education-line centered">
              {formatEducationLine(entry)}
            </p>
          ))}
        </section>

        {certItems.length ? (
          <section className="tpl-compact-section">
            <h2><span>Certifications</span></h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "compact-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="tpl-compact-section">
          <h2><span>Languages</span></h2>
          {renderLanguageRows(data.languages)}
        </section>
      </div>
    );
  }

  function renderMatrixTemplate(data) {
    const profileData = data.profile || {};
    const fallbackSkills = getPrimarySkills(data, 12);
    const certItems = listOrEmpty(data.certifications);
    const skillGroups = takePreviewItems(
      listOrEmpty(data.skills)
      .filter((group) => listOrEmpty(group.items).length)
      ,
      4
    );

    return (
      <div className="tpl tpl-matrix">
        <header className="tpl-matrix-header">
          <h1>{profileData.fullName}</h1>
          <p>{contactLine(profileData)}</p>
        </header>

        <section className="tpl-matrix-section">
          <h2>Summary</h2>
          <p>{getProfileSummary(profileData, fallbackSkills)}</p>
        </section>

        <section className="tpl-matrix-section">
          <h2>Skills Matrix</h2>
          <div className="tpl-matrix-grid">
            {(skillGroups.length ? skillGroups : [{ category: "Core", items: fallbackSkills }]).map((group, index) => (
              <article key={`${group.category || "group"}-${index}`} className="tpl-matrix-row">
                <h3>{group.category || "Core"}</h3>
                <p>{takePreviewItems(group.items, 6).join(" | ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="tpl-matrix-section">
          <h2>Experience</h2>
          {listOrEmpty(data.experience).map((entry, index) => (
            <article key={entry.id || `matrix-exp-${index}`} className="tpl-matrix-exp-item">
              <p>
                <strong>{entry.role}</strong> | {entry.company} | {entry.location}
              </p>
              <ul>
                {takePreviewItems(entry.bullets, 2).map((bullet, bulletIndex) => (
                  <li key={`${entry.id || index}-${bulletIndex}`}>{formatPreviewBullet(bullet, 125)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="tpl-matrix-section tpl-matrix-foot">
          <div>
            <h2>Education</h2>
            {listOrEmpty(data.education).map((entry, index) => (
              <p key={entry.id || `matrix-edu-${index}`} className="tpl-education-line">
                {formatEducationLine(entry)}
              </p>
            ))}
          </div>
          <div>
            <h2>Projects</h2>
            {listOrEmpty(data.projects).map((project, index) => (
              <p key={project.id || `matrix-project-${index}`} className="tpl-education-line">
                {project.name} | {summarizeBullets(project.bullets, 80)}
              </p>
            ))}
          </div>
        </section>

        {certItems.length ? (
          <section className="tpl-matrix-section">
            <h2>Certifications</h2>
            {certItems.map((item, index) => (
              <p key={`${item.name || "matrix-cert"}-${index}`} className="tpl-education-line">
                {formatCertificationLine(item)}
              </p>
            ))}
          </section>
        ) : null}
      </div>
    );
  }

  function renderQuickscanTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data, 9);
    const projectItems = listOrEmpty(data.projects);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-quickscan">
        <header className="tpl-quickscan-header">
          <div>
            <h1>{profileData.fullName}</h1>
            <p>{profileData.title || "Professional"}</p>
          </div>
          <small>{contactLine(profileData)}</small>
        </header>

        <section className="tpl-quickscan-metrics">
          <article>
            <strong>{listOrEmpty(data.experience).length}</strong>
            <span>Roles</span>
          </article>
          <article>
            <strong>{listOrEmpty(data.projects).length}</strong>
            <span>Projects</span>
          </article>
          <article>
            <strong>{listOrEmpty(data.certifications).length}</strong>
            <span>Certs</span>
          </article>
        </section>

        <section className="tpl-quickscan-section">
          <h2>Summary</h2>
          <p>{enableFullContent ? getProfileSummary(profileData, skillsData) : clipText(getProfileSummary(profileData, skillsData), 220)}</p>
        </section>

        <section className="tpl-quickscan-section">
          <h2>Top ATS Keywords</h2>
          <div className="tpl-chip-wrap">
            {skillsData.map((item) => (
              <span key={`quickscan-skill-${item}`}>{item}</span>
            ))}
          </div>
        </section>

        <section className="tpl-quickscan-section">
          <h2>Recent Experience</h2>
          <div className="tpl-quickscan-cards">
            {listOrEmpty(data.experience).map((entry, index) => (
              <article key={entry.id || `quickscan-exp-${index}`}>
                <p>
                  <strong>{entry.role}</strong> | {entry.company}
                </p>
                <ul>
                  {takePreviewItems(entry.bullets, 2).map((bullet, bulletIndex) => (
                    <li key={`${entry.id || index}-${bulletIndex}`}>{formatPreviewBullet(bullet, 110)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {projectItems.length ? (
          <section className="tpl-quickscan-section">
            <h2>Project Highlights</h2>
            <div className="tpl-quickscan-cards">
              {projectItems.map((project, index) => (
                <article key={project.id || `quickscan-project-${index}`}>
                  <p>
                    <strong>{project.name}</strong>
                  </p>
                  <ul>
                    {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                      <li key={`${project.id || index}-${bulletIndex}`}>{formatPreviewBullet(bullet, 110)}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {certItems.length ? (
          <section className="tpl-quickscan-section">
            <h2>Certifications</h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "quickscan-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  function renderExecutiveTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data);
    const projectItems = listOrEmpty(data.projects);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-executive-live">
        <header className="tpl-executive-header">
          <h1>{profileData.fullName}</h1>
          <p>{contactLine(profileData)}</p>
        </header>

        <section className="tpl-executive-section">
          <h2>Summary</h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-executive-section">
          <h2>Skills</h2>
          {renderSkillsTwoColumns(skillsData, "tpl-executive-skill-columns")}
        </section>

        <section className="tpl-executive-section">
          <h2>Experience</h2>
          {listOrEmpty(data.experience).map((entry, index) => (
            <article key={entry.id || `executive-exp-${index}`} className="tpl-executive-exp-item">
              <p className="tpl-executive-exp-title">
                <strong>{entry.role}</strong>, {entry.company}, {entry.location}
              </p>
              <ul>
                {takePreviewItems(entry.bullets, 4).map((bullet, bulletIndex) => (
                  <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {projectItems.length ? (
          <section className="tpl-executive-section">
            <h2>Projects</h2>
            {projectItems.map((project, index) => (
              <article key={project.id || `executive-project-${index}`} className="tpl-project-item">
                <div className="tpl-project-item-head">
                  <strong>{project.name}</strong>
                  {listOrEmpty(project.stack).length ? (
                    <span className="tpl-project-stack">
                      {takePreviewItems(project.stack, 4).join(", ")}
                    </span>
                  ) : null}
                </div>
                <ul>
                  {takePreviewItems(project.bullets, 2).map((bullet, bulletIndex) => (
                    <li key={`${project.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ) : null}

        <section className="tpl-executive-section">
          <h2>Education and Training</h2>
          {listOrEmpty(data.education).map((entry, index) => (
            <p key={entry.id || `executive-edu-${index}`} className="tpl-education-line">
              {formatEducationLine(entry)}
            </p>
          ))}
        </section>

        {certItems.length ? (
          <section className="tpl-executive-section">
            <h2>Certifications</h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "executive-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="tpl-executive-section">
          <h2>Languages</h2>
          {renderLanguageRows(data.languages)}
        </section>
      </div>
    );
  }

  function renderBoardroomTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data, 10);
    const projectItems = listOrEmpty(data.projects);
    const certItems = listOrEmpty(data.certifications);
    const impactHighlights = takePreviewItems(
      listOrEmpty(data.experience)
        .flatMap((entry) => takePreviewItems(entry.bullets, 1))
        .map((item) => formatPreviewBullet(item, 130)),
      4
    );

    return (
      <div className="tpl tpl-boardroom">
        <header className="tpl-boardroom-header">
          <h1>{profileData.fullName}</h1>
          <p>{profileData.title || "Senior Professional"}</p>
          <small>{contactLine(profileData)}</small>
        </header>

        <section className="tpl-boardroom-section">
          <h2>Executive Summary</h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-boardroom-section">
          <h2>Boardroom Highlights</h2>
          <ol>
            {impactHighlights.map((item, index) => (
              <li key={`boardroom-highlight-${index}`}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="tpl-boardroom-section">
          <h2>Leadership Experience</h2>
          {listOrEmpty(data.experience).map((entry, index) => (
            <article key={entry.id || `boardroom-exp-${index}`} className="tpl-boardroom-exp-item">
              <p>
                <strong>{entry.role}</strong> | {entry.company} | {entry.location}
              </p>
              <ul>
                {takePreviewItems(entry.bullets, 3).map((bullet, bulletIndex) => (
                  <li key={`${entry.id || index}-${bulletIndex}`}>{normalizeBullet(bullet)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        {projectItems.length ? (
          <section className="tpl-boardroom-section">
            <h2>Strategic Projects</h2>
            <ul>
              {projectItems.map((project, index) => (
                <li key={project.id || `boardroom-project-${index}`}>
                  <strong>{project.name}</strong>: {summarizeBullets(project.bullets, 105)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {certItems.length ? (
          <section className="tpl-boardroom-section">
            <h2>Certifications</h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "boardroom-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="tpl-boardroom-section tpl-boardroom-foot">
          <div>
            <h2>Key Skills</h2>
            <div className="tpl-chip-wrap">
              {skillsData.map((item) => (
                <span key={`boardroom-skill-${item}`}>{item}</span>
              ))}
            </div>
          </div>
          <div>
            <h2>Education</h2>
            {listOrEmpty(data.education).map((entry, index) => (
              <p key={entry.id || `boardroom-edu-${index}`} className="tpl-education-line">
                {formatEducationLine(entry)}
              </p>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderStrategyTemplate(data) {
    const profileData = data.profile || {};
    const skillsData = getPrimarySkills(data, 12);
    const certItems = listOrEmpty(data.certifications);

    return (
      <div className="tpl tpl-strategy">
        <header className="tpl-strategy-header">
          <h1>{profileData.fullName}</h1>
          <p>{profileData.title || "Strategy and Operations"}</p>
          <small>{contactLine(profileData)}</small>
        </header>

        <section className="tpl-strategy-section">
          <h2>Strategy Narrative</h2>
          <p>{getProfileSummary(profileData, skillsData)}</p>
        </section>

        <section className="tpl-strategy-section">
          <h2>Key Competencies</h2>
          <div className="tpl-chip-wrap">
            {skillsData.map((item) => (
              <span key={`strategy-skill-${item}`}>{item}</span>
            ))}
          </div>
        </section>

        <section className="tpl-strategy-section">
          <h2>Career Snapshot</h2>
          <div className="tpl-strategy-rows">
            {listOrEmpty(data.experience).map((entry, index) => (
              <article key={entry.id || `strategy-exp-${index}`}>
                <p>
                  <strong>{entry.role}</strong> | {entry.company}
                </p>
                <small>{[entry.location, entry.startDate, entry.endDate].filter(Boolean).join(" | ")}</small>
                <p>{summarizeBullets(entry.bullets, 120)}</p>
              </article>
            ))}
          </div>
        </section>

        {certItems.length ? (
          <section className="tpl-strategy-section">
            <h2>Certifications</h2>
            <ul>
              {certItems.map((item, index) => (
                <li key={`${item.name || "strategy-cert"}-${index}`}>
                  {formatCertificationLine(item)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="tpl-strategy-section tpl-strategy-foot">
          <div>
            <h2>Project Wins</h2>
            <ul>
              {listOrEmpty(data.projects).map((project, index) => (
                <li key={project.id || `strategy-project-${index}`}>
                  <strong>{project.name}</strong>: {summarizeBullets(project.bullets, 95)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Education</h2>
            {listOrEmpty(data.education).map((entry, index) => (
              <p key={entry.id || `strategy-edu-${index}`} className="tpl-education-line">
                {formatEducationLine(entry)}
              </p>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderSelectedTemplate(layout, data, templateId) {
    let renderedTemplate;

    if (layout === "corporate") renderedTemplate = renderCorporateTemplate(data);
    else if (layout === "timeline") renderedTemplate = renderTimelineTemplate(data);
    else if (layout === "modern") renderedTemplate = renderModernTemplate(data);
    else if (layout === "nordic") renderedTemplate = renderNordicTemplate(data);
    else if (layout === "creative") renderedTemplate = renderCreativeTemplate(data);
    else if (layout === "compact") renderedTemplate = renderCompactTemplate(data);
    else if (layout === "matrix") renderedTemplate = renderMatrixTemplate(data);
    else if (layout === "quickscan") renderedTemplate = renderQuickscanTemplate(data);
    else if (layout === "executive") renderedTemplate = renderExecutiveTemplate(data);
    else if (layout === "boardroom") renderedTemplate = renderBoardroomTemplate(data);
    else if (layout === "strategy") renderedTemplate = renderStrategyTemplate(data);
    else renderedTemplate = renderClassicTemplate(data);

    return applyRoleSectionOrder(renderedTemplate, templateId);
  }

  function useTemplate(templateId) {
    if (isTemplateLocked(templateId)) {
      return;
    }

    setSelectedTemplateId(templateId);
    storeTemplateId(templateId);
    setPopupTemplateId("");
  }

  function resetTemplateSelection() {
    setSelectedTemplateId("");
    setPopupTemplateId("");
  }

  if (!selectedTemplate) {
    return (
      <div className="panel preview-panel preview-template-selector">
        <div className="template-gallery-header">
          <h3>Choose an ATS-Friendly Template</h3>
          <p className="helper-text">
            Pick one mini card to open it in editable preview mode.
          </p>
        </div>

        <div className="template-mini-grid">
          {templateCards.map((template) => {
            const templateMeta = getTemplateMeta(template.metaTemplateId || template.id);
            const templateLocked = isTemplateLocked(template.id);

            return (
              <button
                key={template.id}
                type="button"
                className={`template-mini-card layout-${template.layout} ${
                  templateLocked ? "locked" : ""
                }`}
                onClick={() => setPopupTemplateId(template.id)}
              >
                <span className="template-mini-top">
                  <span className="template-mini-title">{template.name}</span>
                  <span className="template-mini-badge-row">
                    <span className="template-mini-badge">{template.badge}</span>
                    {templateLocked ? (
                      <span className="template-mini-lock-pill" aria-label="Pro template locked">
                        <LockIcon className="template-lock-icon" />
                        <span>Pro</span>
                      </span>
                    ) : null}
                  </span>
                </span>

                <span className="template-mini-family">
                  {templateMeta.jobFamilyLabel || "General"} focus
                </span>

                <div className="template-mini-thumb-shell" aria-hidden="true">
                  <div className="template-mini-thumb-canvas">
                    <div className="template-mini-thumb-inner">
                      <div className={`paper template-paper-live theme-layout-${template.layout}`}>
                        {renderSelectedTemplate(
                          template.layout,
                          demoData,
                          template.metaTemplateId || template.id
                        )}
                      </div>
                    </div>
                  </div>
                  {templateLocked ? (
                    <span className="template-mini-lock-overlay" aria-hidden="true">
                      <LockIcon className="template-lock-icon" />
                      <span>Pro Template</span>
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {popupTemplate ? (
          <div
            className="template-popup-layer"
            onClick={() => setPopupTemplateId("")}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={`template-popup-card theme-${popupTemplate.id}`}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="template-popup-close"
                onClick={() => setPopupTemplateId("")}
                aria-label="Close template popup"
              >
                x
              </button>
              <div className="template-popup-main">
                <div className="template-demo-pane">
                  <p className="template-demo-caption">Live mini resume preview</p>
                  <div className="template-mini-live-shell">
                    <div className="template-mini-live-canvas">
                      <div className="template-mini-live-inner" aria-hidden="true">
                        <div className={`paper template-paper-live theme-layout-${popupLayout}`}>
                            {renderSelectedTemplate(
                              popupLayout,
                              demoData,
                              popupTemplate.metaTemplateId || popupTemplate.id
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="template-info-pane">
                  <p className="template-popup-label">Template Preview</p>
                  <div className="template-info-tags">
                    <span className="template-info-badge primary">{popupMeta.tags?.[0] || "Recommended"}</span>
                    <span className="template-info-badge">{popupMeta.tags?.[1] || "ATS"}</span>
                    <span className="template-info-badge">{popupMeta.jobFamilyLabel || "General"}</span>
                  </div>
                  <h4>{popupTemplate.name}</h4>
                  <p className="template-picked-count">{popupMeta.popularity || "Popular with CareerForge users"}</p>
                  <p className="template-order-line">Section order: {popupMeta.sectionOrderLabel || "Summary -> Skills -> Experience -> Education"}</p>
                  <p className="helper-text">{popupTemplate.description}</p>

                  {popupLocked ? (
                    <p className="template-pro-lock-note" role="status">
                      <LockIcon className="template-lock-icon" />
                      <span>This is a Pro-only template. Upgrade your plan to activate it.</span>
                    </p>
                  ) : null}

                  <ul className="template-benefit-list">
                    {(popupMeta.highlights || []).slice(0, 4).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <div className="template-popup-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setPopupTemplateId("")}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => useTemplate(popupTemplate.id)}
                      disabled={popupLocked}
                    >
                      {popupLocked ? (
                        <>
                          <LockIcon className="template-lock-icon" />
                          <span>Pro Required</span>
                        </>
                      ) : (
                        "Use This Template"
                      )}
                    </button>
                    {popupLocked && typeof onOpenBilling === "function" ? (
                      <button type="button" className="secondary" onClick={onOpenBilling}>
                        Unlock in Billing
                      </button>
                    ) : null}
                  </div>

                  <div className="template-insight-grid">
                    {(popupMeta.insights || []).slice(0, 2).map((item) => (
                      <article key={item.title}>
                        <h6>{item.title}</h6>
                        <p>{item.text}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="panel preview-panel">
      <div className="preview-resume-scroll">
        <div className="preview-pages-stack" ref={previewPagesStackRef}>
          {previewPageIndexes.map((pageIndex) => (
            <article key={`preview-page-${pageIndex}`} className="preview-page-shell">
              <div className={`paper template-paper-live preview-page-viewport theme-layout-${selectedLayout}`}>
                <div
                  className="preview-page-content"
                  style={{
                    top: `-${pageIndex * previewPageHeightPx}px`
                  }}
                >
                  {renderSelectedTemplate(
                    selectedLayout,
                    previewData,
                    selectedTemplateReferenceId
                  )}
                </div>
              </div>

              {previewPageCount > 1 ? (
                <p className="preview-page-indicator">
                  Page {pageIndex + 1} of {previewPageCount}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        {previewScanActive ? (
          <div className="preview-scan-overlay" role="status" aria-live="polite">
            <div className="preview-scan-banner">
              <strong>AI Writer is generating bullet rewrites...</strong>
              <div className="preview-scan-track" aria-hidden="true">
                <span style={{ width: `${previewScanProgress}%` }} />
              </div>
              <span>{previewScanProgress}% complete</span>
            </div>
            <div className="preview-scan-laser" aria-hidden="true" />
          </div>
        ) : null}

        <div className="preview-measure-layer" aria-hidden="true">
          <div
            ref={previewMeasureRef}
            className={`paper template-paper-live preview-measure-paper theme-layout-${selectedLayout}`}
          >
            {renderSelectedTemplate(
              selectedLayout,
              previewData,
              selectedTemplateReferenceId
            )}
          </div>
        </div>
      </div>

      <div className="preview-template-bottomcard">
        <div>
          <p className="template-active-label">Active Template</p>
          <strong>{selectedTemplate.name}</strong>
          <p className="template-active-meta">{selectedMeta?.jobFamilyLabel || "General"} role order</p>
        </div>
        <button
          type="button"
          className="secondary template-switch-button"
          onClick={resetTemplateSelection}
        >
          Change Template
        </button>
      </div>
    </div>
  );
}
