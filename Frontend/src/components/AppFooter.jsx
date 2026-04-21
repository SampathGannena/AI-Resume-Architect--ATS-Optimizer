import React from "react";

const VIEW_LABELS = {
  builder: "Resume Studio",
  dashboard: "Dashboard",
  billing: "Billing"
};

const FOOTER_SOCIAL_LINKS = [
  { label: "X", href: "#" },
  { label: "f", href: "#" },
  { label: "in", href: "#" }
];

function normalizePlan(currentPlan) {
  return String(currentPlan || "free").trim().toLowerCase() === "pro" ? "pro" : "free";
}

function normalizeEntitlements(entitlements) {
  const source = entitlements && typeof entitlements === "object" ? entitlements : {};
  const normalizedLimit = Number(source.resumeLimit);

  return {
    resumeLimit:
      Number.isFinite(normalizedLimit) && normalizedLimit > 0
        ? Math.trunc(normalizedLimit)
        : 1,
    premiumTemplates: Boolean(source.premiumTemplates),
    coverLetters: Boolean(source.coverLetters),
    unlimitedRewrites: Boolean(source.unlimitedRewrites)
  };
}

function createFeatureItem(label, { enabled, onClick, active = false, ready = "Enabled" } = {}) {
  const isEnabled = Boolean(enabled);
  const tone = active ? "active" : isEnabled ? "enabled" : "locked";

  return {
    label,
    onClick,
    state: active ? "Active" : isEnabled ? ready : "Pro",
    tone,
    active
  };
}

function buildFooterColumns({
  activeView,
  isProPlan,
  resumeLimitLabel,
  entitlements,
  onNavigate,
  onStartNew
}) {
  return [
    {
      title: "Workspace",
      links: [
        createFeatureItem("Resume Studio", {
          enabled: true,
          active: activeView === "builder",
          onClick: () => onNavigate?.("builder"),
          ready: "Open"
        }),
        createFeatureItem("Dashboard", {
          enabled: true,
          active: activeView === "dashboard",
          onClick: () => onNavigate?.("dashboard"),
          ready: "Open"
        }),
        createFeatureItem("Billing", {
          enabled: true,
          active: activeView === "billing",
          onClick: () => onNavigate?.("billing"),
          ready: "Open"
        }),
        {
          label: "New or Upload",
          onClick: onStartNew,
          state: "Action",
          tone: "action"
        }
      ]
    },
    {
      title: "ATS Engine",
      links: [
        {
          label: "Resume vs JD scoring",
          onClick: () => onNavigate?.("builder"),
          state: "Live",
          tone: "enabled"
        },
        {
          label: "Keyword match analysis",
          onClick: () => onNavigate?.("builder"),
          state: "Live",
          tone: "enabled"
        },
        {
          label: "Rewrite suggestions",
          onClick: () => onNavigate?.("builder"),
          state: "Live",
          tone: "enabled"
        }
      ]
    },
    {
      title: "AI Writing",
      links: [
        createFeatureItem("Cover letter generator", {
          enabled: entitlements.coverLetters,
          onClick: () => onNavigate?.(entitlements.coverLetters ? "dashboard" : "billing")
        }),
        createFeatureItem("Unlimited rewrites", {
          enabled: entitlements.unlimitedRewrites,
          onClick: () => onNavigate?.(entitlements.unlimitedRewrites ? "builder" : "billing")
        }),
        {
          label: "Prompt profile controls",
          onClick: () => onNavigate?.("dashboard"),
          state: entitlements.coverLetters ? "Ready" : "Pro",
          tone: entitlements.coverLetters ? "enabled" : "locked"
        }
      ]
    },
    {
      title: "Templates & Export",
      links: [
        {
          label: "PDF export workflow",
          onClick: () => onNavigate?.("builder"),
          state: "Ready",
          tone: "enabled"
        },
        createFeatureItem("Premium templates", {
          enabled: entitlements.premiumTemplates,
          onClick: () => onNavigate?.(entitlements.premiumTemplates ? "builder" : "billing")
        }),
        {
          label: "Signed PDF links",
          onClick: () => onNavigate?.("builder"),
          state: "Secure",
          tone: "enabled"
        }
      ]
    },
    {
      title: "Plan",
      links: [
        {
          label: `Current plan: ${isProPlan ? "Pro" : "Free"}`,
          onClick: () => onNavigate?.("billing"),
          state: isProPlan ? "Active" : "Starter",
          tone: isProPlan ? "enabled" : "muted"
        },
        {
          label: isProPlan ? "Resume drafts" : "Resume draft limit",
          state: resumeLimitLabel,
          tone: "muted"
        },
        {
          label: isProPlan ? "Manage subscription" : "Upgrade to Pro",
          onClick: () => onNavigate?.("billing"),
          state: isProPlan ? "Billing" : "Unlock",
          tone: isProPlan ? "action" : "locked"
        }
      ]
    }
  ];
}

export default function AppFooter({
  brandName = "CareerForge Pro",
  activeView = "builder",
  currentPlan = "free",
  entitlements,
  onNavigate,
  onStartNew
}) {
  const currentYear = new Date().getFullYear();
  const resolvedPlan = normalizePlan(currentPlan);
  const isProPlan = resolvedPlan === "pro";
  const normalizedEntitlements = normalizeEntitlements(entitlements);
  const unlockedProWorkflows = [
    normalizedEntitlements.premiumTemplates,
    normalizedEntitlements.coverLetters,
    normalizedEntitlements.unlimitedRewrites
  ].filter(Boolean).length;
  const resumeLimitLabel = isProPlan
    ? "Unlimited"
    : `${normalizedEntitlements.resumeLimit} draft${
        normalizedEntitlements.resumeLimit === 1 ? "" : "s"
      }`;
  const footerTagline = isProPlan
    ? "AI Resume Architect and ATS Optimizer with Pro workflows unlocked"
    : `AI Resume Architect and ATS Optimizer (${unlockedProWorkflows}/3 Pro workflows unlocked)`;
  const footerColumns = buildFooterColumns({
    activeView,
    isProPlan,
    resumeLimitLabel,
    entitlements: normalizedEntitlements,
    onNavigate,
    onStartNew
  });
  const footerMetaLinks = [
    {
      label: `Plan: ${isProPlan ? "Pro" : "Free"}`,
      onClick: () => onNavigate?.("billing")
    },
    {
      label: `Drafts: ${resumeLimitLabel}`,
      onClick: () => onNavigate?.("billing")
    },
    {
      label: `View: ${VIEW_LABELS[activeView] || VIEW_LABELS.builder}`,
      onClick: () => onNavigate?.(activeView)
    }
  ];

  const handlePlaceholderClick = (event) => {
    event.preventDefault();
  };

  const handleFooterItemClick = (event, item) => {
    event.preventDefault();

    if (typeof item?.onClick === "function") {
      item.onClick();
    }
  };

  return (
    <footer className="app-product-footer" aria-label="CareerForge footer">
      <div className="app-product-footer-inner">
        <div className="app-product-footer-top">
          <div className="app-product-footer-brand">
            <p className="app-product-footer-logo">{brandName}</p>
            <p className="app-product-footer-tagline">
              {footerTagline}
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title} className="app-product-footer-column">
              <h4>{column.title}</h4>
              <ul>
                {column.links.map((item) => (
                  <li key={`${column.title}-${item.label}`}>
                    <a
                      href="#"
                      onClick={(event) => handleFooterItemClick(event, item)}
                      className={item.active ? "active-link" : ""}
                    >
                      <span className="app-product-footer-item-text">{item.label}</span>
                      {item.state ? (
                        <>
                          <span
                            className="app-product-footer-item-separator"
                            aria-hidden="true"
                          />
                          <span className={`app-product-footer-item-state ${item.tone || "muted"}`}>
                            {item.state}
                          </span>
                        </>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="app-product-footer-bottom">
          <div className="app-product-footer-meta">
            <span>{`© ${currentYear} ${brandName}`}</span>
            {footerMetaLinks.map((item) => (
              <a
                key={item.label}
                href="#"
                className="app-product-footer-meta-link"
                onClick={(event) => handleFooterItemClick(event, item)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="app-product-footer-social" aria-label="Social links">
            {FOOTER_SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                aria-label={link.label}
                onClick={handlePlaceholderClick}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
