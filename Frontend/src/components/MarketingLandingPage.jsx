import React, { useEffect, useMemo, useRef, useState } from "react";
import CareerForgeBrandIcon from "./CareerForgeBrandIcon";
import { resolveTemplatePreviewData } from "../templates/sampleResumeData";
import "./MarketingLandingPage.css";

const featureCards = [
  {
    title: "35+ Recruiter-Approved Templates",
    badge: "Template Library",
    description: "Pick from polished layouts engineered for ATS readability and hiring manager clarity."
  },
  {
    title: "Role-Tuned AI Resume Writer",
    badge: "AI Writer",
    description: "Generate measurable bullet points and tailored summaries from real job requirements."
  },
  {
    title: "Live ATS Quality Scanner",
    badge: "ATS Review",
    description: "Get instant checks for keywords, formatting, section hierarchy, and readability strength."
  },
  {
    title: "AI Cover Letter Generator",
    badge: "Conversion",
    description: "Create role-specific cover letters that align with your resume narrative in one click."
  },
  {
    title: "Portfolio Resume Website",
    badge: "Personal Brand",
    description: "Turn your resume into a shareable profile page that recruiters can open instantly."
  },
  {
    title: "Version Performance Tracking",
    badge: "Insights",
    description: "Track iterations, compare improvements, and keep every application stronger than the last."
  }
];

const processSteps = [
  {
    id: "Step 1",
    title: "Choose a proven template",
    description: "Start from recruiter-tested structures built for modern ATS parsing and visual clarity."
  },
  {
    id: "Step 2",
    title: "Paste your job description",
    description: "CareerForge Pro extracts must-have skills and rewrites your resume with role fit in mind."
  },
  {
    id: "Step 3",
    title: "Optimize and apply confidently",
    description: "Use ATS insights, finalize your content, and export a polished resume in minutes."
  }
];

const pricingPlans = [
  {
    name: "Free",
    price: "INR 0",
    period: "/month",
    copy: "Best for first resume drafts and basic ATS readiness.",
    cta: "Start Free",
    isPopular: false,
    features: [
      "1 resume workspace",
      "Basic ATS scan",
      "Template starter pack",
      "PDF export"
    ]
  },
  {
    name: "Pro",
    price: "INR 799",
    period: "/month",
    copy: "Built for fast, role-specific resume optimization and interview conversion.",
    cta: "Go Pro",
    isPopular: true,
    features: [
      "Unlimited ATS scans",
      "Advanced AI rewrite + cover letters",
      "Keyword gap detection",
      "Resume version tracking"
    ]
  }
];

const recruiterBrands = [
  "Google",
  "Microsoft",
  "Accenture",
  "Deloitte",
  "Infosys",
  "Tata",
  "Nike",
  "Apple"
];

const keywordChips = [
  "Leadership",
  "Cross-functional",
  "Impact Metrics",
  "Stakeholder Communication",
  "Process Optimization"
];

const jdDemos = [
  "Need a product analyst with SQL, experimentation, and stakeholder storytelling experience.",
  "Hiring a frontend engineer skilled in React, performance tuning, and accessibility-first UI design.",
  "Looking for a project manager who drives delivery velocity and measurable business outcomes."
];

const miniResumeDraftTemplates = [
  { id: "mini-a", label: "Modern", layout: "split" },
  { id: "mini-b", label: "Executive", layout: "executive" },
  { id: "mini-c", label: "Timeline", layout: "timeline" }
];

function renderMiniResumeLayout(draft) {
  if (draft.layout === "split") {
    return (
      <div className="cf-mini-layout-split">
        <aside className="cf-mini-layout-side" aria-hidden="true">
          {(draft.sideTags || []).map((tag, index) => (
            <span key={`${tag}-${index}`} className="cf-mini-chip">{tag}</span>
          ))}
        </aside>
        <div className="cf-mini-layout-main" aria-hidden="true">
          {(draft.lines || []).map((line, index) => (
            <span key={`${line}-${index}`} className="cf-mini-line">{line}</span>
          ))}
        </div>
      </div>
    );
  }

  if (draft.layout === "executive") {
    return (
      <div className="cf-mini-layout-executive" aria-hidden="true">
        <span className="cf-mini-layout-band">{draft.bandLabel}</span>
        <div className="cf-mini-layout-grid">
          {(draft.columns || []).map((column, columnIndex) => (
            <div key={`column-${columnIndex}`}>
              {column.map((line, lineIndex) => (
                <span key={`${line}-${lineIndex}`} className="cf-mini-line">{line}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cf-mini-layout-timeline" aria-hidden="true">
      {(draft.events || []).map((event, index) => (
      <article key={`${event.label}-${index}`}>
        <span className="cf-mini-timeline-label">{event.label}</span>
        <div>
          <span className="cf-mini-line">{event.line}</span>
          {event.subLine ? <span className="cf-mini-line">{event.subLine}</span> : null}
        </div>
      </article>
      ))}
    </div>
  );
}

const footerLinks = [
  { label: "About Us", href: "mailto:contact@careerforge.app" },
  { label: "Terms & Conditions", href: "mailto:contact@careerforge.app" },
  { label: "Privacy Policy", href: "mailto:contact@careerforge.app" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQs", href: "mailto:contact@careerforge.app" },
  { label: "Contact Us", href: "mailto:contact@careerforge.app" }
];

const ANNOUNCEMENT_STORAGE_KEY = "careerforge.landingAnnouncementDismissed";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function truncateText(value, maxLength = 120) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function sentenceFragments(value, maxLength = 60) {
  return String(value || "")
    .split(/[.!?]/)
    .map((item) => truncateText(item, maxLength))
    .filter((item) => hasText(item));
}

function hasResumeInput(resumeData) {
  if (!resumeData || typeof resumeData !== "object") {
    return false;
  }

  const profile = resumeData.profile || {};
  const hasProfile =
    hasText(profile.fullName) ||
    hasText(profile.title) ||
    hasText(profile.summary);

  const hasExperience = Array.isArray(resumeData.experience) &&
    resumeData.experience.some((entry) =>
      hasText(entry?.company) ||
      hasText(entry?.role) ||
      (Array.isArray(entry?.bullets) && entry.bullets.some((bullet) => hasText(bullet)))
    );

  return hasProfile || hasExperience;
}

export default function MarketingLandingPage({
  brandName = "CareerForge",
  scannerResumeData,
  onGetStarted,
  onOpenAuth
}) {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const recruiterRibbon = useMemo(() => [...recruiterBrands, ...recruiterBrands], []);
  const scannerPreview = useMemo(() => {
    const resolvedResume = resolveTemplatePreviewData(scannerResumeData || {});
    const profile = resolvedResume.profile || {};
    const sourceLabel = hasResumeInput(scannerResumeData) ? "Live Resume" : "Sample PDF Resume";

    const experienceHighlights = (Array.isArray(resolvedResume.experience) ? resolvedResume.experience : [])
      .map((entry) => {
        const role = String(entry?.role || "").trim();
        const company = String(entry?.company || "").trim();
        const firstBullet = Array.isArray(entry?.bullets)
          ? String(entry.bullets.find((bullet) => hasText(bullet)) || "").trim()
          : "";

        const roleCompany = [role, company].filter((item) => hasText(item)).join(" @ ");
        const combined = [roleCompany, firstBullet].filter((item) => hasText(item)).join(" - ");
        return truncateText(combined, 108);
      })
      .filter((item) => hasText(item))
      .slice(0, 2);

    const skills = (Array.isArray(resolvedResume.skills) ? resolvedResume.skills : [])
      .flatMap((group) => (Array.isArray(group?.items) ? group.items : []))
      .filter((item) => hasText(item))
      .slice(0, 6);

    return {
      sourceLabel,
      fullName: profile.fullName || "Candidate Name",
      title: profile.title || "Target Role",
      contactLine: [profile.location, profile.email]
        .filter((item) => hasText(item))
        .join(" | "),
      summary: truncateText(
        profile.summary ||
          "Resume imported and optimized with ATS keyword, readability, and structure scoring.",
        174
      ),
      experienceHighlights,
      skills
    };
  }, [scannerResumeData]);
  const [metrics, setMetrics] = useState({ ats: 0, speed: 0, response: 0 });
  const heroMiniResumeDrafts = useMemo(() => {
    const fallbackHighlight = "Improved ATS readiness using role-targeted edits.";
    const summaryLines = sentenceFragments(scannerPreview.summary, 58);
    const experienceLines = (scannerPreview.experienceHighlights.length
      ? scannerPreview.experienceHighlights
      : [fallbackHighlight, "Rewrote bullets with measurable outcomes."]
    ).map((item) => truncateText(item, 64));
    const skillTags = (scannerPreview.skills.length
      ? scannerPreview.skills
      : ["Keyword Match", "Formatting", "Clarity", "Impact"]
    ).slice(0, 4);

    const bestScore = Math.max(Math.round(metrics.ats * 0.72), 1);

    return miniResumeDraftTemplates.map((template, index) => {
      const score = Math.max(bestScore + index * 4, 1);

      if (template.layout === "split") {
        return {
          ...template,
          score,
          displayName: scannerPreview.fullName,
          displayRole: scannerPreview.title,
          sideTags: skillTags.slice(0, 3),
          lines: [
            summaryLines[0] || experienceLines[0],
            summaryLines[1] || experienceLines[1],
            experienceLines[0]
          ]
        };
      }

      if (template.layout === "executive") {
        return {
          ...template,
          score,
          displayName: scannerPreview.fullName,
          displayRole: "Impact Summary",
          bandLabel: truncateText(scannerPreview.title, 30),
          columns: [
            [experienceLines[0], summaryLines[0] || "ATS profile aligned to role"],
            [experienceLines[1], `Skills: ${skillTags.slice(0, 2).join(", ")}`]
          ]
        };
      }

      return {
        ...template,
        score,
        displayName: scannerPreview.fullName,
        displayRole: "Career Timeline",
        events: [
          {
            label: "Role",
            line: truncateText(`${scannerPreview.title} focus`, 40),
            subLine: experienceLines[0]
          },
          {
            label: "Impact",
            line: experienceLines[1],
            subLine: summaryLines[0] || "Scanner optimized clarity and relevance"
          }
        ]
      };
    });
  }, [metrics.ats, scannerPreview]);

  const [activeChip, setActiveChip] = useState(0);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingCount, setTypingCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [heroScannerReady, setHeroScannerReady] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY) !== "true";
  });

  useEffect(() => {
    let frameId = 0;
    const durationMs = 1800;
    const startTime = performance.now();

    const animateCounters = (timestamp) => {
      const progress = clamp((timestamp - startTime) / durationMs, 0, 1);
      setMetrics({
        ats: Math.round(98 * progress),
        speed: 4.3 * progress,
        response: 2.8 * progress
      });

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animateCounters);
      }
    };

    frameId = window.requestAnimationFrame(animateCounters);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveChip((previous) => (previous + 1) % keywordChips.length);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDelayMs = prefersReducedMotion ? 120 : 2850;
    const timeoutId = window.setTimeout(() => {
      setHeroScannerReady(true);
    }, revealDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const fullText = jdDemos[typingIndex];
    const typingDelay = isDeleting ? 24 : 46;
    const pauseAtEnd = 900;
    const pauseBeforeNext = 280;

    const timeoutDelay = !isDeleting && typingCount === fullText.length
      ? pauseAtEnd
      : isDeleting && typingCount === 0
        ? pauseBeforeNext
        : typingDelay;

    const timeoutId = window.setTimeout(() => {
      if (!isDeleting && typingCount < fullText.length) {
        setTypingCount((previous) => previous + 1);
        return;
      }

      if (!isDeleting && typingCount === fullText.length) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && typingCount > 0) {
        setTypingCount((previous) => previous - 1);
        return;
      }

      setIsDeleting(false);
      setTypingIndex((previous) => (previous + 1) % jdDemos.length);
    }, timeoutDelay);

    return () => window.clearTimeout(timeoutId);
  }, [isDeleting, typingCount, typingIndex]);

  useEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) {
      return undefined;
    }

    const revealElements = Array.from(rootElement.querySelectorAll("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    revealElements.forEach((element, index) => {
      element.style.setProperty("--reveal-delay", `${Math.min(index * 65, 420)}ms`);
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleHeroPointerMove = (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    const heroElement = heroRef.current;
    if (!heroElement) {
      return;
    }

    const rect = heroElement.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (event.clientY - rect.top) / rect.height - 0.5;

    heroElement.style.setProperty("--hero-mouse-x", relativeX.toFixed(3));
    heroElement.style.setProperty("--hero-mouse-y", relativeY.toFixed(3));
  };

  const handleHeroPointerLeave = () => {
    const heroElement = heroRef.current;
    if (!heroElement) {
      return;
    }

    heroElement.style.setProperty("--hero-mouse-x", "0");
    heroElement.style.setProperty("--hero-mouse-y", "0");
  };

  const handleTiltMove = (event) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 14;
    const rotateX = (0.5 - y) * 10;

    element.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
    element.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
  };

  const handleTiltLeave = (event) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  };

  const handleDismissAnnouncement = () => {
    setShowAnnouncement(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, "true");
    }
  };

  const typedDemoText = jdDemos[typingIndex].slice(0, typingCount);

  return (
    <main ref={rootRef} className="cf-landing" aria-label={`${brandName} marketing landing page`}>
      {showAnnouncement ? (
        <section className="cf-announcement" aria-label="Product updates">
          <p>
            <strong>NEW</strong> CareerForge Pro now includes ATS + JD intelligence.
          </p>
          <button type="button" className="cf-announcement-link" onClick={onGetStarted}>
            Discover all job tools
          </button>
          <button
            type="button"
            className="cf-announcement-close"
            aria-label="Hide announcement"
            onClick={handleDismissAnnouncement}
          >
            Hide
          </button>
        </section>
      ) : null}

      <header className="cf-nav-wrap">
        <div className="cf-container cf-nav">
          <div className="cf-logo-block" aria-label={`${brandName} logo`}>
            <span className="cf-logo-mark" aria-hidden="true">
              <CareerForgeBrandIcon />
            </span>
            <div>
              <p>{brandName}</p>
              <small>CareerForge Pro</small>
            </div>
          </div>

          <nav className="cf-nav-links" aria-label="Landing page sections">
            <a href="#features" className="cf-nav-link">Features</a>
            <a href="#how-it-works" className="cf-nav-link">How It Works</a>
            <a href="#pricing" className="cf-nav-link">Pricing</a>
          </nav>

          <div className="cf-nav-actions">
            <a href="mailto:contact@careerforge.app" className="cf-nav-link">Contact</a>
            <button type="button" className="cf-login-btn" onClick={onOpenAuth}>
              Login
            </button>
          </div>
        </div>
      </header>

      <section
        id="top"
        ref={heroRef}
        className="cf-hero"
        onPointerMove={handleHeroPointerMove}
        onPointerLeave={handleHeroPointerLeave}
      >
        <span className="cf-hero-blob blob-a" aria-hidden="true" />
        <span className="cf-hero-blob blob-b" aria-hidden="true" />

        <div className="cf-container cf-hero-grid">
          <div className="cf-hero-copy">
            <p className="cf-eyebrow">Deep ATS Intelligence For Modern Job Seekers</p>
            <h1>
              Build a
              <span className="cf-shimmer-text"> bold resume that beats ATS filters</span>
            </h1>
            <p>
              Turn your current resume into a role-targeted application system with smart templates,
              keyword intelligence, and live optimization recommendations.
            </p>

            <div className="cf-chip-row" aria-label="Cycling ATS keyword chips">
              {keywordChips.map((chip, index) => (
                <span key={chip} className={index === activeChip ? "is-active" : ""}>
                  {chip}
                </span>
              ))}
            </div>

            <div className="cf-hero-actions">
              <button type="button" className="cf-solid-btn" onClick={onGetStarted}>
                Create New Resume
              </button>
              <button type="button" className="cf-outline-btn" onClick={onGetStarted}>
                Optimize My Resume
              </button>
            </div>

            <ul className="cf-stat-grid" aria-label="Animated platform metrics">
              <li>
                <strong>{metrics.ats}%</strong>
                <span>ATS alignment score</span>
              </li>
              <li>
                <strong>{metrics.speed.toFixed(1)}x</strong>
                <span>Faster role-tailored rewrites</span>
              </li>
              <li>
                <strong>{metrics.response.toFixed(1)}x</strong>
                <span>Higher recruiter response potential</span>
              </li>
            </ul>
          </div>

          <aside className="cf-hero-visual" aria-label="Interactive ATS demo">
            <div className="cf-ats-pill">
              <span>Live ATS Score</span>
              <strong>{metrics.ats}%</strong>
            </div>

            <p className="cf-hero-resume-status" aria-live="polite">
              {heroScannerReady
                ? "Scanner selected the strongest draft and applied ATS edits"
                : "Analyzing mini resume drafts and selecting the best base version"}
            </p>

            <div className={`cf-hero-resume-stage ${heroScannerReady ? "is-scanner" : "is-cards"}`}>
              <div className="cf-mini-resume-stack" aria-hidden={heroScannerReady}>
                {heroMiniResumeDrafts.map((draft, index) => (
                  <article key={draft.id} className={`cf-mini-resume-card is-${index + 1}`}>
                    <header className="cf-mini-resume-header">
                      <div className="cf-mini-resume-headings">
                        <strong>{draft.displayName}</strong>
                        <p>{draft.displayRole}</p>
                      </div>

                      <div className="cf-mini-resume-meta">
                        <small>{draft.label}</small>
                        <span className="cf-mini-resume-score">{draft.score}%</span>
                      </div>
                    </header>

                    <div className="cf-mini-resume-layout">
                      {renderMiniResumeLayout(draft)}
                    </div>
                  </article>
                ))}
              </div>

              <div className="cf-resume-demo-panel" aria-hidden={!heroScannerReady}>
                <div className="cf-resume-demo-meta">
                  <span>Scanner Demo</span>
                  <strong>Edited Resume Output</strong>
                </div>

                <div className="cf-resume-card">
                  <div className="cf-resume-head">
                    <span>{scannerPreview.sourceLabel}</span>
                    <strong>{metrics.ats}% ATS</strong>
                  </div>

                  <div className="cf-scanner-resume-preview">
                    <header className="cf-scanner-preview-header">
                      <h4>{scannerPreview.fullName}</h4>
                      <p>{scannerPreview.title}</p>
                      <small>{scannerPreview.contactLine || "Optimized resume preview"}</small>
                    </header>

                    <p className="cf-scanner-preview-summary">{scannerPreview.summary}</p>

                    <section className="cf-scanner-preview-section">
                      <h5>Experience Highlights</h5>
                      <ul>
                        {(scannerPreview.experienceHighlights.length
                          ? scannerPreview.experienceHighlights
                          : ["ATS scanner generated measurable impact bullets from imported resume text."]
                        ).map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </section>

                    <section className="cf-scanner-preview-section">
                      <h5>Key Skills</h5>
                      <div className="cf-scanner-preview-skills">
                        {(scannerPreview.skills.length ? scannerPreview.skills : ["Customer Service", "Sales", "POS"]).map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="cf-resume-meters">
                    <article>
                      <span>Keyword Match</span>
                      <strong>{Math.max(Math.round(metrics.ats * 0.92), 1)}%</strong>
                    </article>
                    <article>
                      <span>Formatting</span>
                      <strong>{Math.max(Math.round(metrics.ats * 0.95), 1)}%</strong>
                    </article>
                    <article>
                      <span>Clarity Score</span>
                      <strong>{Math.max(Math.round(metrics.ats * 0.88), 1)}%</strong>
                    </article>
                  </div>
                </div>

                <div className="cf-resume-edit-delta" aria-hidden="true">
                  <p>Before scanner: {Math.max(Math.round(metrics.ats * 0.68), 1)}%</p>
                  <p>After scanner edits: {metrics.ats}%</p>
                </div>
              </div>
            </div>

            <div className="cf-jd-demo" aria-live="polite">
              <p>Typing JD demo</p>
              <div className="cf-jd-screen">
                <span className="cf-jd-prefix">JD</span>
                <span className="cf-jd-text">{typedDemoText || " "}</span>
                <span className="cf-jd-caret" aria-hidden="true" />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="cf-brand-strip" aria-label="Recruiter recognition">
        <div className="cf-container cf-brand-shell">
          <p>Talent teams that shortlist profiles built with {brandName}</p>
          <div className="cf-brand-marquee">
            <div className="cf-brand-track">
              {recruiterRibbon.map((brand, index) => (
                <span key={`${brand}-${index}`}>{brand}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="cf-section cf-features" aria-label="Feature highlights">
        <div className="cf-container">
          <div className="cf-section-head cf-reveal" data-reveal>
            <p className="cf-section-kicker">Feature Stack</p>
            <h2>Interactive tools that move your resume from draft to shortlisted</h2>
          </div>

          <div className="cf-feature-grid">
            {featureCards.map((feature, index) => (
              <article
                key={feature.title}
                className="cf-feature-card cf-tilt-card cf-reveal"
                data-reveal
                onPointerMove={handleTiltMove}
                onPointerLeave={handleTiltLeave}
              >
                <span className="cf-card-index">{String(index + 1).padStart(2, "0")}</span>
                <p className="cf-card-badge">{feature.badge}</p>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="cf-section cf-how" aria-label="How CareerForge works">
        <div className="cf-container">
          <div className="cf-section-head cf-reveal" data-reveal>
            <p className="cf-section-kicker">How It Works</p>
            <h2>Three steps to build a recruiter-ready application package</h2>
          </div>

          <div className="cf-step-grid">
            {processSteps.map((step) => (
              <article
                key={step.id}
                className="cf-step-card cf-tilt-card cf-reveal"
                data-reveal
                onPointerMove={handleTiltMove}
                onPointerLeave={handleTiltLeave}
              >
                <span className="cf-step-id">{step.id}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="cf-section cf-pricing" aria-label="Pricing plans">
        <div className="cf-container">
          <div className="cf-section-head cf-reveal" data-reveal>
            <p className="cf-section-kicker">Pricing</p>
            <h2>Start free, upgrade when you want full ATS automation</h2>
          </div>

          <div className="cf-pricing-grid">
            {pricingPlans.map((plan) => (
              <article
                key={plan.name}
                className={`cf-pricing-card cf-tilt-card cf-reveal ${plan.isPopular ? "is-popular" : ""}`}
                data-reveal
                onPointerMove={handleTiltMove}
                onPointerLeave={handleTiltLeave}
              >
                {plan.isPopular ? <span className="cf-popular-pill">Most Popular</span> : null}
                <h3>{plan.name}</h3>
                <p className="cf-price-line">
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </p>
                <p className="cf-plan-copy">{plan.copy}</p>

                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={plan.isPopular ? "cf-solid-btn" : "cf-outline-btn"}
                  onClick={onGetStarted}
                >
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cf-section cf-cta" aria-label="Primary call to action">
        <div className="cf-container">
          <div className="cf-cta-shell cf-reveal" data-reveal>
            <h2>Ready to launch your next interview-winning resume?</h2>
            <p>
              Build with recruiter-approved templates, optimize with AI, and apply faster with
              confidence.
            </p>

            <div className="cf-cta-actions">
              <button type="button" className="cf-solid-btn" onClick={onGetStarted}>
                Create New Resume
              </button>
              <button type="button" className="cf-outline-btn" onClick={onGetStarted}>
                Optimize My Resume
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="cf-footer" aria-label={`${brandName} legal links and notes`}>
        <div className="cf-container cf-footer-shell">
          <nav className="cf-footer-links" aria-label="Footer navigation">
            {footerLinks.map((item) => (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="cf-footer-notes">
            <p>1. Based on survey responses from users who reported improved interview outcomes.</p>
            <p>2. {brandName} is not affiliated with any recruiter brands shown on this page.</p>
          </div>

          <p className="cf-footer-copy">© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
