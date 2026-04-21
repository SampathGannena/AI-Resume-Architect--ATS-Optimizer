const fs = require("fs/promises");
const crypto = require("crypto");
const mongoose = require("mongoose");
const PdfJob = require("../models/PdfJob");
const PdfAsset = require("../models/PdfAsset");
const { isPdfPipelineEnabled } = require("../config/runtimeConfig");
const {
  enqueuePdfJob,
  enqueueManyPdfJobs,
  reservePdfJob
} = require("./pdfQueueService");
const {
  uploadPdfBuffer,
  downloadPdfBuffer
} = require("./pdfStorageService");

const TEMPLATE_LAYOUT_BY_ID = {
  classic: "classic",
  "corporate-clarity": "corporate",
  "timeline-focus": "timeline",
  modern: "modern",
  "modern-nordic": "nordic",
  "creative-balance": "creative",
  compact: "compact",
  "compact-skills-matrix": "matrix",
  "quickscan-compact": "quickscan",
  executive: "executive",
  "boardroom-impact": "boardroom",
  "strategy-lead": "strategy"
};
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
const TWO_COLUMN_LAYOUTS = new Set(["nordic", "creative", "matrix"]);
const TIMELINE_LAYOUTS = new Set(["timeline"]);
const COMPACT_LAYOUTS = new Set(["compact", "matrix", "quickscan"]);
const LEADERSHIP_LAYOUTS = new Set(["executive", "boardroom", "strategy"]);
const MODERN_LAYOUTS = new Set(["modern", "nordic", "creative"]);

let queueBootstrapped = false;
let workerLoopActive = false;
let workerLoopPromise = null;

function nowIso() {
  return new Date().toISOString();
}

function toIso(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeObjectId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return mongoose.isValidObjectId(normalized) ? normalized : null;
}

function getSigningSecret() {
  const secret = process.env.PDF_SIGNING_SECRET;
  if (!secret || String(secret).trim().length < 32) {
    return null;
  }

  return String(secret).trim();
}

function normalizeTemplateId(value) {
  const normalized = String(value || "classic").trim();
  return normalized || "classic";
}

function normalizeTemplateLayout(templateId, templateLayout) {
  const normalizedLayout = String(templateLayout || "").trim().toLowerCase();
  if (ALLOWED_TEMPLATE_LAYOUTS.has(normalizedLayout)) {
    return normalizedLayout;
  }

  const templateKey = String(templateId || "").trim().toLowerCase();
  return TEMPLATE_LAYOUT_BY_ID[templateKey] || "classic";
}

function coerceArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasText(value) {
  return String(value || "").trim().length > 0;
}

function joinPresent(parts, separator = " | ") {
  return coerceArray(parts)
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(separator);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  if (!/^https?:\/\//i.test(candidate)) return "";

  try {
    return new URL(candidate).toString();
  } catch {
    return "";
  }
}

function formatDateRange(item) {
  const start = String(item?.startDate || item?.startYear || "").trim();
  const end = String(item?.endDate || item?.endYear || "").trim();

  if (!start && !end) return "";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function renderBulletList(items = [], className = "") {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }

  const cssClass = String(className || "").trim();
  const classAttr = cssClass ? ` class="${cssClass}"` : "";
  const li = items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  if (!li) {
    return "";
  }

  return `<ul${classAttr}>${li}</ul>`;
}

function renderSection(title, content, extraClass = "") {
  if (!hasText(content)) {
    return "";
  }

  const classes = ["cf-section"];
  const normalizedExtraClass = String(extraClass || "").trim();
  if (normalizedExtraClass) {
    classes.push(normalizedExtraClass);
  }

  return `
    <section class="${classes.join(" ")}">
      <h2>${escapeHtml(title)}</h2>
      ${content}
    </section>
  `;
}

function collectSkillGroups(resumeData) {
  return coerceArray(resumeData?.skills)
    .map((group) => {
      const category = String(group?.category || "").trim() || "Core Skills";
      const items = coerceArray(group?.items)
        .map((item) => String(item || "").trim())
        .filter(Boolean);

      if (!items.length) {
        return null;
      }

      return {
        category,
        items
      };
    })
    .filter(Boolean);
}

function collectUniqueSkillItems(resumeData) {
  const unique = [];

  collectSkillGroups(resumeData).forEach((group) => {
    group.items.forEach((item) => {
      if (!unique.some((existing) => existing.toLowerCase() === item.toLowerCase())) {
        unique.push(item);
      }
    });
  });

  return unique;
}

function collectHighlights(resumeData, maxItems = 4) {
  const highlighted = [];

  coerceArray(resumeData?.experience).forEach((entry) => {
    coerceArray(entry?.bullets).forEach((bullet) => {
      const clean = String(bullet || "").trim();
      if (!clean) return;

      if (!highlighted.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
        highlighted.push(clean);
      }
    });
  });

  return highlighted.slice(0, Math.max(1, Number(maxItems) || 4));
}

function renderProfileLinks(links, { asList = false } = {}) {
  const validLinks = coerceArray(links)
    .map((link) => {
      if (typeof link === "string") {
        const url = safeUrl(link);
        if (!url) return null;
        return {
          label: url,
          url
        };
      }

      const label = String(link?.label || link?.url || "").trim();
      const url = safeUrl(link?.url);
      if (!url) return null;

      return {
        label: label || url,
        url
      };
    })
    .filter(Boolean);

  if (!validLinks.length) {
    return "";
  }

  if (asList) {
    const listItems = validLinks
      .map(
        (item) =>
          `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a></li>`
      )
      .join("");

    return `<ul class="cf-link-list">${listItems}</ul>`;
  }

  const inline = validLinks
    .map(
      (item) =>
        `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`
    )
    .join(" <span class=\"cf-link-sep\">|</span> ");

  return `<p class="cf-links-inline">${inline}</p>`;
}

function renderSummarySection(profile) {
  const summary = String(profile?.summary || "").trim();
  if (!summary) {
    return "";
  }

  return renderSection("Summary", `<p>${escapeHtml(summary)}</p>`, "cf-summary");
}

function renderSkillsChipsSection(resumeData) {
  const items = collectUniqueSkillItems(resumeData);
  if (!items.length) {
    return "";
  }

  const chips = items
    .map((item) => `<span class="cf-chip">${escapeHtml(item)}</span>`)
    .join("");

  return renderSection("Skills", `<div class="cf-chips">${chips}</div>`, "cf-skills");
}

function renderExperienceSection(resumeData, { timeline = false } = {}) {
  const entries = coerceArray(resumeData?.experience);
  if (!entries.length) {
    return "";
  }

  const html = entries
    .map((entry) => {
      const heading = joinPresent([entry?.role, entry?.company]);
      const dateRange = formatDateRange(entry);
      const meta = joinPresent([entry?.location, dateRange]);
      const bullets = renderBulletList(entry?.bullets, "cf-bullets");

      if (!heading && !meta && !bullets) {
        return "";
      }

      if (timeline) {
        return `
          <article class="cf-entry cf-entry-timeline">
            <div class="cf-entry-side">${escapeHtml(dateRange || "Career Step")}</div>
            <div class="cf-entry-main">
              <h3>${escapeHtml(heading || "Professional Experience")}</h3>
              ${meta ? `<p class="cf-meta">${escapeHtml(meta)}</p>` : ""}
              ${bullets}
            </div>
          </article>
        `;
      }

      return `
        <article class="cf-entry">
          <h3>${escapeHtml(heading || "Professional Experience")}</h3>
          ${meta ? `<p class="cf-meta">${escapeHtml(meta)}</p>` : ""}
          ${bullets}
        </article>
      `;
    })
    .filter(Boolean)
    .join("");

  return renderSection("Experience", html, "cf-experience");
}

function renderProjectsSection(resumeData) {
  const projects = coerceArray(resumeData?.projects);
  if (!projects.length) {
    return "";
  }

  const html = projects
    .map((project) => {
      const name = String(project?.name || "").trim();
      const stackItems = coerceArray(project?.stack)
        .map((item) => String(item || "").trim())
        .filter(Boolean);
      const stack = stackItems.length
        ? `<p class="cf-meta"><strong>Stack:</strong> ${escapeHtml(stackItems.join(", "))}</p>`
        : "";
      const bullets = renderBulletList(project?.bullets, "cf-bullets");
      const projectLink = safeUrl(project?.link);
      const link = projectLink
        ? `<p class="cf-meta"><a href="${escapeHtml(projectLink)}" target="_blank" rel="noreferrer">${escapeHtml(projectLink)}</a></p>`
        : "";

      if (!name && !stack && !bullets && !link) {
        return "";
      }

      return `
        <article class="cf-entry">
          <h3>${escapeHtml(name || "Project")}</h3>
          ${stack}
          ${bullets}
          ${link}
        </article>
      `;
    })
    .filter(Boolean)
    .join("");

  return renderSection("Projects", html, "cf-projects");
}

function renderEducationSection(resumeData) {
  const education = coerceArray(resumeData?.education);
  if (!education.length) {
    return "";
  }

  const html = education
    .map((entry) => {
      const heading = joinPresent([entry?.degree, entry?.institution]);
      const dateRange = formatDateRange(entry);
      const meta = joinPresent([entry?.field, dateRange]);
      const highlights = renderBulletList(entry?.highlights, "cf-bullets");

      if (!heading && !meta && !highlights) {
        return "";
      }

      return `
        <article class="cf-entry">
          <h3>${escapeHtml(heading || "Education")}</h3>
          ${meta ? `<p class="cf-meta">${escapeHtml(meta)}</p>` : ""}
          ${highlights}
        </article>
      `;
    })
    .filter(Boolean)
    .join("");

  return renderSection("Education", html, "cf-education");
}

function renderCertificationsSection(resumeData) {
  const certifications = coerceArray(resumeData?.certifications);
  if (!certifications.length) {
    return "";
  }

  const items = certifications
    .map((cert) => {
      const title = String(cert?.name || "").trim();
      const detail = joinPresent([cert?.issuer, cert?.year], " - ");
      if (!title && !detail) {
        return "";
      }

      if (title && detail) {
        return `<li>${escapeHtml(title)} <span class="cf-meta-inline">(${escapeHtml(detail)})</span></li>`;
      }

      return `<li>${escapeHtml(title || detail)}</li>`;
    })
    .filter(Boolean)
    .join("");

  if (!items) {
    return "";
  }

  return renderSection("Certifications", `<ul class="cf-plain-list">${items}</ul>`, "cf-certifications");
}

function renderHighlightsSection(resumeData) {
  const highlights = collectHighlights(resumeData);
  if (!highlights.length) {
    return "";
  }

  const cards = highlights
    .map((item) => `<div class="cf-highlight-card">${escapeHtml(item)}</div>`)
    .join("");

  return renderSection("Highlights", `<div class="cf-highlight-grid">${cards}</div>`, "cf-highlights");
}

function renderSidebarSection(title, content) {
  if (!hasText(content)) {
    return "";
  }

  return `
    <section class="cf-side-block">
      <h2>${escapeHtml(title)}</h2>
      ${content}
    </section>
  `;
}

function renderSidebarSkills(resumeData) {
  const groups = collectSkillGroups(resumeData);
  if (!groups.length) {
    return "";
  }

  const groupHtml = groups
    .map((group) => {
      const items = group.items
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      return `
        <div class="cf-skill-group">
          <h3>${escapeHtml(group.category)}</h3>
          <ul class="cf-plain-list">${items}</ul>
        </div>
      `;
    })
    .join("");

  return renderSidebarSection("Skills", groupHtml);
}

function renderSidebarContact(profile) {
  const contactItems = [profile?.email, profile?.phone, profile?.location]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (!contactItems.length) {
    return "";
  }

  const contact = contactItems.map((value) => escapeHtml(value)).join("<br />");

  return renderSidebarSection("Contact", `<p class="cf-contact-block">${contact}</p>`);
}

function renderSidebarLinks(profile) {
  const links = renderProfileLinks(profile?.links, { asList: true });
  return renderSidebarSection("Links", links);
}

function renderSidebarCertifications(resumeData) {
  const certifications = coerceArray(resumeData?.certifications);
  if (!certifications.length) {
    return "";
  }

  const items = certifications
    .map((cert) => {
      const title = String(cert?.name || "").trim();
      const detail = joinPresent([cert?.issuer, cert?.year], " - ");
      if (!title && !detail) {
        return "";
      }

      return `<li>${escapeHtml(title || detail)}${detail && title ? ` <span class=\"cf-meta-inline\">(${escapeHtml(detail)})</span>` : ""}</li>`;
    })
    .filter(Boolean)
    .join("");

  if (!items) {
    return "";
  }

  return renderSidebarSection("Certifications", `<ul class="cf-plain-list">${items}</ul>`);
}

function buildContentSections(resumeData, layout) {
  const profile = resumeData?.profile || {};
  const sections = {
    highlights: LEADERSHIP_LAYOUTS.has(layout) ? renderHighlightsSection(resumeData) : "",
    summary: renderSummarySection(profile),
    skills: renderSkillsChipsSection(resumeData),
    experience: renderExperienceSection(resumeData, {
      timeline: TIMELINE_LAYOUTS.has(layout)
    }),
    projects: renderProjectsSection(resumeData),
    education: renderEducationSection(resumeData),
    certifications: renderCertificationsSection(resumeData)
  };

  const sectionOrderByLayout = {
    classic: ["summary", "skills", "experience", "projects", "education", "certifications"],
    corporate: ["summary", "experience", "skills", "projects", "education", "certifications"],
    timeline: ["summary", "experience", "skills", "projects", "education", "certifications"],
    modern: ["summary", "experience", "projects", "skills", "education", "certifications"],
    nordic: ["summary", "experience", "projects", "education", "certifications"],
    creative: ["summary", "projects", "experience", "education", "certifications"],
    compact: ["summary", "skills", "experience", "projects", "education", "certifications"],
    matrix: ["summary", "experience", "projects", "education", "certifications"],
    quickscan: ["summary", "skills", "experience", "projects", "education", "certifications"],
    executive: ["highlights", "summary", "experience", "projects", "education", "skills", "certifications"],
    boardroom: ["highlights", "summary", "experience", "projects", "education", "skills", "certifications"],
    strategy: ["highlights", "summary", "experience", "projects", "education", "skills", "certifications"]
  };

  const sectionOrder = sectionOrderByLayout[layout] || sectionOrderByLayout.classic;
  return sectionOrder.map((key) => sections[key] || "").join("");
}

function buildHeader(profile, layout) {
  const headingClasses = ["cf-header"];
  if (MODERN_LAYOUTS.has(layout) || LEADERSHIP_LAYOUTS.has(layout)) {
    headingClasses.push("cf-header-centered");
  }
  if (COMPACT_LAYOUTS.has(layout)) {
    headingClasses.push("cf-header-tight");
  }

  const contactLine = joinPresent([profile?.email, profile?.phone, profile?.location]);
  const linksInline = renderProfileLinks(profile?.links);
  const title = String(profile?.title || "").trim();

  return `
    <header class="${headingClasses.join(" ")}">
      <h1>${escapeHtml(profile?.fullName || "Candidate Name")}</h1>
      ${title ? `<p class="cf-title">${escapeHtml(title)}</p>` : ""}
      ${contactLine ? `<p class="cf-contact-inline">${escapeHtml(contactLine)}</p>` : ""}
      ${linksInline}
    </header>
  `;
}

function getLayoutTheme(layout) {
  const themes = {
    classic: {
      accent: "#1f3b5b",
      accentSoft: "#e9eef5",
      bodyFont: '"Times New Roman", Georgia, serif',
      headingFont: '"Times New Roman", Georgia, serif'
    },
    corporate: {
      accent: "#16324f",
      accentSoft: "#e5edf5",
      bodyFont: "Georgia, serif",
      headingFont: "Georgia, serif"
    },
    timeline: {
      accent: "#234a75",
      accentSoft: "#e8f0f9",
      bodyFont: "Georgia, serif",
      headingFont: "Georgia, serif"
    },
    modern: {
      accent: "#1f4f4f",
      accentSoft: "#e7f2f2",
      bodyFont: '"Trebuchet MS", "Segoe UI", sans-serif',
      headingFont: '"Trebuchet MS", "Segoe UI", sans-serif'
    },
    nordic: {
      accent: "#24586a",
      accentSoft: "#e7f2f4",
      bodyFont: '"Trebuchet MS", "Segoe UI", sans-serif',
      headingFont: '"Trebuchet MS", "Segoe UI", sans-serif'
    },
    creative: {
      accent: "#7a3b2e",
      accentSoft: "#f7ece8",
      bodyFont: '"Trebuchet MS", "Segoe UI", sans-serif',
      headingFont: '"Trebuchet MS", "Segoe UI", sans-serif'
    },
    compact: {
      accent: "#202936",
      accentSoft: "#e8ebef",
      bodyFont: '"Courier New", "Lucida Console", monospace',
      headingFont: '"Courier New", "Lucida Console", monospace'
    },
    matrix: {
      accent: "#1f344d",
      accentSoft: "#e8edf4",
      bodyFont: '"Courier New", "Lucida Console", monospace',
      headingFont: '"Courier New", "Lucida Console", monospace'
    },
    quickscan: {
      accent: "#2d3645",
      accentSoft: "#ecf0f4",
      bodyFont: '"Courier New", "Lucida Console", monospace',
      headingFont: '"Courier New", "Lucida Console", monospace'
    },
    executive: {
      accent: "#1e2f47",
      accentSoft: "#e9edf2",
      bodyFont: '"Book Antiqua", Palatino, serif',
      headingFont: '"Book Antiqua", Palatino, serif'
    },
    boardroom: {
      accent: "#172f4d",
      accentSoft: "#e8eef5",
      bodyFont: '"Book Antiqua", Palatino, serif',
      headingFont: '"Book Antiqua", Palatino, serif'
    },
    strategy: {
      accent: "#22435d",
      accentSoft: "#e9f0f5",
      bodyFont: '"Book Antiqua", Palatino, serif',
      headingFont: '"Book Antiqua", Palatino, serif'
    }
  };

  return themes[layout] || themes.classic;
}

function buildResumeHtml(resumeData, templateId, templateLayout, templateMetaTemplateId) {
  const normalizedTemplateId = normalizeTemplateId(templateId);
  const resolvedLayout = normalizeTemplateLayout(normalizedTemplateId, templateLayout);
  const resolvedMetaTemplateId = normalizeTemplateId(templateMetaTemplateId || normalizedTemplateId);
  const profile = resumeData?.profile || {};
  const headerHtml = buildHeader(profile, resolvedLayout);
  const mainSectionsHtml = buildContentSections(resumeData, resolvedLayout);
  const theme = getLayoutTheme(resolvedLayout);

  const sidebarHtml = TWO_COLUMN_LAYOUTS.has(resolvedLayout)
    ? `
      <aside class="cf-sidebar">
        ${renderSidebarContact(profile)}
        ${renderSidebarSkills(resumeData)}
        ${renderSidebarCertifications(resumeData)}
        ${renderSidebarLinks(profile)}
      </aside>
    `
    : "";

  const contentHtml = TWO_COLUMN_LAYOUTS.has(resolvedLayout)
    ? `
      <div class="cf-two-column">
        ${sidebarHtml}
        <main class="cf-main">${mainSectionsHtml}</main>
      </div>
    `
    : `<main class="cf-main">${mainSectionsHtml}</main>`;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>CareerForge Resume PDF</title>
        <style>
          @page { margin: 14mm 12mm; }

          :root {
            --cf-accent: ${theme.accent};
            --cf-accent-soft: ${theme.accentSoft};
            --cf-text: #111111;
            --cf-muted: #4b5661;
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            color: var(--cf-text);
            font-family: ${theme.bodyFont};
            line-height: 1.42;
            font-size: 12px;
          }

          h1, h2, h3 {
            margin: 0;
            font-family: ${theme.headingFont};
          }

          p {
            margin: 0;
          }

          a {
            color: var(--cf-accent);
            text-decoration: none;
            border-bottom: 1px solid transparent;
          }

          .cf-resume {
            width: 100%;
            max-width: 185mm;
            margin: 0 auto;
          }

          .cf-header {
            border-bottom: 2px solid var(--cf-accent);
            padding-bottom: 10px;
            margin-bottom: 14px;
          }

          .cf-header h1 {
            font-size: 29px;
            letter-spacing: 0.3px;
          }

          .cf-header-centered {
            text-align: center;
          }

          .cf-header-tight {
            margin-bottom: 10px;
            padding-bottom: 8px;
          }

          .cf-title {
            margin-top: 4px;
            font-size: 14px;
            font-weight: 600;
          }

          .cf-contact-inline,
          .cf-links-inline {
            margin-top: 5px;
            font-size: 11px;
            color: var(--cf-muted);
          }

          .cf-link-sep {
            color: #9ba6b2;
          }

          .cf-main {
            min-width: 0;
          }

          .cf-section {
            margin-top: 12px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .cf-section h2,
          .cf-side-block h2 {
            margin-bottom: 7px;
            color: var(--cf-accent);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1.1px;
          }

          .cf-entry {
            margin-top: 8px;
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .cf-entry h3,
          .cf-skill-group h3 {
            font-size: 12px;
          }

          .cf-meta,
          .cf-meta-inline,
          .cf-contact-block {
            color: var(--cf-muted);
            font-size: 11px;
          }

          .cf-meta {
            margin-top: 3px;
          }

          .cf-bullets,
          .cf-plain-list,
          .cf-link-list {
            margin: 5px 0 0;
            padding-left: 18px;
          }

          .cf-bullets li,
          .cf-plain-list li,
          .cf-link-list li {
            margin: 2px 0;
          }

          .cf-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .cf-chip {
            border: 1px solid var(--cf-accent);
            border-radius: 999px;
            padding: 2px 8px;
            font-size: 10px;
            background: var(--cf-accent-soft);
            break-inside: avoid;
          }

          .cf-highlight-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
          }

          .cf-highlight-card {
            border: 1px solid #ccd7e3;
            border-left: 3px solid var(--cf-accent);
            background: var(--cf-accent-soft);
            border-radius: 5px;
            padding: 8px;
            font-size: 11px;
          }

          .cf-two-column {
            display: grid;
            grid-template-columns: 32% 1fr;
            gap: 14px;
          }

          .cf-sidebar {
            border-right: 1px solid #d6dde6;
            padding-right: 10px;
          }

          .cf-side-block {
            margin-top: 12px;
          }

          .cf-side-block:first-child {
            margin-top: 0;
          }

          .cf-skill-group + .cf-skill-group {
            margin-top: 8px;
          }

          .cf-resume.layout-timeline .cf-entry-timeline {
            display: grid;
            grid-template-columns: 34mm 1fr;
            gap: 10px;
            align-items: start;
            border-left: 2px solid #d6e1ed;
            padding-left: 8px;
          }

          .cf-resume.layout-timeline .cf-entry-side {
            color: var(--cf-accent);
            font-size: 10px;
            font-weight: 700;
            line-height: 1.3;
            padding-top: 2px;
          }

          .cf-resume.layout-compact,
          .cf-resume.layout-matrix,
          .cf-resume.layout-quickscan {
            font-size: 11px;
          }

          .cf-resume.layout-compact .cf-header h1,
          .cf-resume.layout-matrix .cf-header h1,
          .cf-resume.layout-quickscan .cf-header h1 {
            font-size: 24px;
            letter-spacing: 0;
          }

          .cf-resume.layout-compact .cf-section,
          .cf-resume.layout-matrix .cf-section,
          .cf-resume.layout-quickscan .cf-section {
            margin-top: 9px;
          }

          .cf-resume.layout-compact .cf-chip,
          .cf-resume.layout-matrix .cf-chip,
          .cf-resume.layout-quickscan .cf-chip {
            font-size: 9px;
            padding: 2px 6px;
          }

          .cf-resume.layout-boardroom .cf-header,
          .cf-resume.layout-strategy .cf-header,
          .cf-resume.layout-executive .cf-header {
            border-bottom-width: 3px;
          }

          .cf-resume.layout-boardroom .cf-highlight-card,
          .cf-resume.layout-strategy .cf-highlight-card,
          .cf-resume.layout-executive .cf-highlight-card {
            border-radius: 3px;
          }

          .cf-export-note {
            margin-top: 14px;
            font-size: 10px;
            color: #718190;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <article class="cf-resume layout-${escapeHtml(resolvedLayout)}" data-template-id="${escapeHtml(normalizedTemplateId)}" data-template-meta-id="${escapeHtml(resolvedMetaTemplateId)}">
          ${headerHtml}
          ${contentHtml}
          <p class="cf-export-note">Template: ${escapeHtml(normalizedTemplateId)} | Layout: ${escapeHtml(resolvedLayout)}</p>
        </article>
      </body>
    </html>
  `;
}

function loadPuppeteer() {
  try {
    return require("puppeteer");
  } catch {
    return null;
  }
}

async function renderPdfWithPuppeteer({
  resumeData,
  templateId,
  templateLayout,
  templateMetaTemplateId
}) {
  const puppeteer = loadPuppeteer();
  if (!puppeteer) {
    throw new Error("PUPPETEER_NOT_INSTALLED");
  }

  const html = buildResumeHtml(
    resumeData,
    templateId,
    templateLayout,
    templateMetaTemplateId
  );
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "16mm",
        right: "12mm",
        bottom: "16mm",
        left: "12mm"
      }
    });

    return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function signAssetToken(assetId, expiresInSeconds = 900) {
  const signingSecret = getSigningSecret();
  if (!signingSecret) {
    throw new Error("SIGNING_SECRET_NOT_CONFIGURED");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, Number(expiresInSeconds) || 900);
  const payload = `${assetId}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

function safeSignatureMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function verifyAssetToken(token) {
  const signingSecret = getSigningSecret();
  if (!signingSecret) {
    return { ok: false, reason: "SIGNING_SECRET_NOT_CONFIGURED" };
  }

  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { ok: false, reason: "INVALID_TOKEN" };
  }

  const [encoded, signature] = token.split(".");

  let payload;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "INVALID_TOKEN_ENCODING" };
  }

  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(payload)
    .digest("hex");

  if (!safeSignatureMatch(expected, signature)) {
    return { ok: false, reason: "INVALID_TOKEN_SIGNATURE" };
  }

  const [assetId, expiresAtRaw] = payload.split(".");
  const expiresAt = Number(expiresAtRaw);

  if (!assetId || !Number.isFinite(expiresAt)) {
    return { ok: false, reason: "INVALID_TOKEN_PAYLOAD" };
  }

  if (Math.floor(Date.now() / 1000) > expiresAt) {
    return { ok: false, reason: "TOKEN_EXPIRED" };
  }

  return {
    ok: true,
    assetId,
    expiresAt
  };
}

function buildDownloadUrl(assetId) {
  if (!assetId) return null;

  const token = signAssetToken(String(assetId), Number(process.env.PDF_SIGNED_URL_TTL_SEC || 900));
  return `/api/assets/${token}`;
}

function serializeJob(job) {
  if (!job) return null;

  const doc = typeof job.toObject === "function" ? job.toObject() : job;
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    resumeId: String(doc.resumeId),
    templateId: doc.templateId,
    templateLayout: doc.templateLayout || "classic",
    templateMetaTemplateId: doc.templateMetaTemplateId || null,
    status: doc.status,
    attempts: doc.attempts || 0,
    maxAttempts: doc.maxAttempts || 3,
    createdAt: toIso(doc.createdAt),
    startedAt: toIso(doc.startedAt),
    completedAt: toIso(doc.completedAt),
    failedAt: toIso(doc.failedAt),
    assetId: doc.assetId ? String(doc.assetId) : null,
    downloadUrl: doc.assetId ? buildDownloadUrl(doc.assetId) : null,
    error: doc.error || null
  };
}

function serializeAsset(asset) {
  if (!asset) return null;

  const doc = typeof asset.toObject === "function" ? asset.toObject() : asset;
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    resumeId: String(doc.resumeId),
    type: doc.type,
    createdAt: toIso(doc.createdAt),
    storageProvider: doc.storageProvider || "s3",
    storageBucket: doc.storageBucket || null,
    storageKey: doc.storageKey || null,
    contentType: doc.contentType || "application/pdf",
    byteSize: doc.byteSize || 0,
    checksumSha256: doc.checksumSha256 || null,
    renderMeta: doc.renderMeta || {},
    downloadUrl: buildDownloadUrl(doc._id)
  };
}

async function executePdfJob(jobId) {
  const job = await PdfJob.findById(jobId);
  if (!job) {
    return;
  }

  if (!["queued", "processing"].includes(job.status)) {
    return;
  }

  job.status = "processing";
  job.startedAt = job.startedAt || new Date();
  job.attempts = (job.attempts || 0) + 1;
  await job.save();

  try {
    const pdfBuffer = await renderPdfWithPuppeteer({
      resumeData: job.resumeData,
      templateId: job.templateId,
      templateLayout: job.templateLayout,
      templateMetaTemplateId: job.templateMetaTemplateId
    });

    const uploadedAsset = await uploadPdfBuffer({
      userId: job.userId,
      resumeId: job.resumeId,
      jobId: job._id,
      pdfBuffer,
      metadata: {
        templateid: job.templateId,
        templatelayout: job.templateLayout || "classic",
        templatemetatemplateid: job.templateMetaTemplateId || ""
      }
    });

    const assetRecord = await PdfAsset.create({
      userId: job.userId,
      resumeId: job.resumeId,
      type: "pdf",
      filePath: null,
      storageProvider: uploadedAsset.provider,
      storageBucket: uploadedAsset.bucket,
      storageKey: uploadedAsset.key,
      contentType: uploadedAsset.contentType || "application/pdf",
      byteSize: uploadedAsset.byteSize || 0,
      checksumSha256: uploadedAsset.checksumSha256 || null,
      renderMeta: {
        templateId: job.templateId,
        templateLayout: job.templateLayout || "classic",
        templateMetaTemplateId: job.templateMetaTemplateId || null,
        generator: "puppeteer"
      }
    });

    job.status = "completed";
    job.completedAt = new Date();
    job.assetId = assetRecord._id;
    job.error = null;
    await job.save();
  } catch (error) {
    if (job.attempts < job.maxAttempts) {
      job.status = "queued";
      job.error = error?.message || "PDF_RENDER_RETRY";
      await job.save();
      await enqueuePdfJob(String(job._id));
      return;
    }

    job.status = "failed";
    job.failedAt = new Date();
    job.error = error?.message || "PDF_RENDER_FAILED";
    await job.save();
  }
}

async function bootstrapPendingPdfJobsToRedisQueue() {
  if (queueBootstrapped) {
    return;
  }

  const pendingJobs = await PdfJob.find({
    status: { $in: ["queued", "processing"] }
  })
    .sort({ createdAt: 1 })
    .select({ _id: 1 })
    .lean();

  const pendingJobIds = pendingJobs
    .map((job) => String(job?._id || "").trim())
    .filter(Boolean);

  if (pendingJobIds.length) {
    await enqueueManyPdfJobs(pendingJobIds);
  }

  queueBootstrapped = true;
}

async function runWorkerLoop({ pollTimeoutSeconds = 5 } = {}) {
  if (workerLoopActive) {
    return;
  }

  workerLoopActive = true;

  try {
    while (workerLoopActive) {
      const reservedJobId = await reservePdfJob({
        timeoutSeconds: pollTimeoutSeconds
      });

      if (!reservedJobId) {
        continue;
      }

      try {
        await executePdfJob(reservedJobId);
      } catch (error) {
        console.error("PDF worker failed while processing job", error);

        try {
          await enqueuePdfJob(reservedJobId);
        } catch (requeueError) {
          console.error("PDF worker failed to requeue job", requeueError);
        }
      }
    }
  } finally {
    workerLoopActive = false;
  }
}

async function startPdfQueueWorker(options = {}) {
  if (!isPdfPipelineEnabled()) {
    return null;
  }

  await bootstrapPendingPdfJobsToRedisQueue();

  if (workerLoopPromise) {
    return workerLoopPromise;
  }

  const pollTimeoutSeconds = Number(options.pollTimeoutSeconds || process.env.PDF_WORKER_POLL_TIMEOUT_SEC || 5);
  workerLoopPromise = runWorkerLoop({ pollTimeoutSeconds })
    .catch((error) => {
      console.error("PDF queue worker terminated unexpectedly", error);
      throw error;
    })
    .finally(() => {
      workerLoopPromise = null;
    });

  return workerLoopPromise;
}

async function createPdfJob({
  userId,
  resumeId,
  resumeData,
  templateId = "classic",
  templateLayout,
  templateMetaTemplateId
}) {
  const normalizedUserId = normalizeObjectId(userId);
  const normalizedResumeId = normalizeObjectId(resumeId);
  if (!normalizedUserId || !normalizedResumeId) {
    throw new Error("INVALID_PDF_JOB_CONTEXT");
  }

  const normalizedTemplateId = normalizeTemplateId(templateId);
  const normalizedTemplateLayout = normalizeTemplateLayout(
    normalizedTemplateId,
    templateLayout
  );
  const normalizedMetaTemplateId = normalizeTemplateId(
    templateMetaTemplateId || normalizedTemplateId
  );
  const pipelineEnabled = isPdfPipelineEnabled();

  const job = await PdfJob.create({
    userId: normalizedUserId,
    resumeId: normalizedResumeId,
    resumeData,
    templateId: normalizedTemplateId,
    templateLayout: normalizedTemplateLayout,
    templateMetaTemplateId: normalizedMetaTemplateId,
    status: pipelineEnabled ? "queued" : "processing",
    attempts: 0,
    maxAttempts: pipelineEnabled ? 3 : 1,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    assetId: null,
    error: null
  });

  if (pipelineEnabled) {
    await enqueuePdfJob(String(job._id));
    return serializeJob(job);
  }

  await executePdfJob(String(job._id));
  const latestJob = await PdfJob.findById(job._id);

  return serializeJob(latestJob || job);
}

async function getPdfJob(jobId, userId) {
  const normalizedJobId = normalizeObjectId(jobId);
  const normalizedUserId = normalizeObjectId(userId);

  if (!normalizedJobId || !normalizedUserId) return null;

  const job = await PdfJob.findOne({
    _id: normalizedJobId,
    userId: normalizedUserId
  }).lean();

  return serializeJob(job);
}

async function getLatestPdfForResume(resumeId, userId) {
  const normalizedResumeId = normalizeObjectId(resumeId);
  const normalizedUserId = normalizeObjectId(userId);

  if (!normalizedResumeId || !normalizedUserId) return null;

  const asset = await PdfAsset.findOne({
    resumeId: normalizedResumeId,
    userId: normalizedUserId
  })
    .sort({ createdAt: -1 })
    .lean();

  return serializeAsset(asset);
}

async function resolveSignedAsset(token) {
  const verified = verifyAssetToken(token);
  if (!verified.ok) {
    return verified;
  }

  if (!mongoose.isValidObjectId(verified.assetId)) {
    return {
      ok: false,
      reason: "ASSET_NOT_FOUND"
    };
  }

  const asset = await PdfAsset.findById(verified.assetId).lean();
  if (!asset) {
    return {
      ok: false,
      reason: "ASSET_NOT_FOUND"
    };
  }

  try {
    if (asset.storageKey) {
      const fileBuffer = await downloadPdfBuffer({
        bucket: asset.storageBucket,
        key: asset.storageKey
      });

      return {
        ok: true,
        asset: serializeAsset(asset),
        fileBuffer
      };
    }

    if (asset.filePath) {
      const fileBuffer = await fs.readFile(asset.filePath);
      return {
        ok: true,
        asset: serializeAsset(asset),
        fileBuffer
      };
    }

    return {
      ok: false,
      reason: "ASSET_FILE_MISSING"
    };
  } catch {
    return {
      ok: false,
      reason: "ASSET_FILE_MISSING"
    };
  }
}

module.exports = {
  startPdfQueueWorker,
  createPdfJob,
  getPdfJob,
  getLatestPdfForResume,
  resolveSignedAsset
};
