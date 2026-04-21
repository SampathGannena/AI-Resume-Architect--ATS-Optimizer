export const ATS_TEMPLATES = [
  {
    id: "classic",
    name: "Slate Professional",
    badge: "Recommended",
    description: "Structured ATS-first layout with strong section clarity.",
    layout: "classic"
  },
  {
    id: "corporate-clarity",
    name: "Corporate Clarity",
    badge: "Business",
    description: "Traditional enterprise-friendly format with crisp hierarchy.",
    layout: "corporate"
  },
  {
    id: "timeline-focus",
    name: "Timeline Focus",
    badge: "Chronological",
    description: "Chronological emphasis for stable work history and progression.",
    layout: "timeline"
  },
  {
    id: "modern",
    name: "Centered Heritage",
    badge: "Serif",
    description: "Elegant centered profile with a clean hiring-manager flow.",
    layout: "modern"
  },
  {
    id: "modern-nordic",
    name: "Nordic Modern",
    badge: "Minimal",
    description: "Clean modern lines with ATS-safe section readability.",
    layout: "nordic"
  },
  {
    id: "creative-balance",
    name: "Creative Balance ATS",
    badge: "Hybrid",
    description: "Modern visual polish while preserving ATS parsing safety.",
    layout: "creative"
  },
  {
    id: "compact",
    name: "Mono Grid ATS",
    badge: "Compact",
    description: "Dense monospaced design for keyword-rich, quick scans.",
    layout: "compact"
  },
  {
    id: "compact-skills-matrix",
    name: "Skills Matrix Compact",
    badge: "Keyword Heavy",
    description: "Skill-forward compact layout optimized for ATS relevance.",
    layout: "matrix"
  },
  {
    id: "quickscan-compact",
    name: "QuickScan Compact",
    badge: "Fast Scan",
    description: "High-density parser-friendly template for rapid recruiter scans.",
    layout: "quickscan"
  },
  {
    id: "executive",
    name: "Neo Minimal",
    badge: "Leadership",
    description: "Minimal modern resume optimized for senior role storytelling.",
    layout: "executive"
  },
  {
    id: "boardroom-impact",
    name: "Boardroom Impact",
    badge: "Senior",
    description: "Outcome-focused executive format for strategic leadership roles.",
    layout: "boardroom"
  },
  {
    id: "strategy-lead",
    name: "Strategy Lead",
    badge: "Director",
    description: "Executive structure tuned for strategy and people leadership.",
    layout: "strategy"
  }
];

const LAYOUT_GROUP = {
  classic: "classic",
  corporate: "classic",
  timeline: "classic",
  modern: "modern",
  nordic: "modern",
  creative: "modern",
  compact: "compact",
  matrix: "compact",
  quickscan: "compact",
  executive: "executive",
  boardroom: "executive",
  strategy: "executive"
};

const SECTION_LABELS = {
  summary: "Summary",
  skills: "Skills",
  projects: "Projects",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  languages: "Languages",
  highlights: "Highlights"
};

const JOB_FAMILY_CONFIG = {
  sde: {
    label: "SDE",
    sectionOrder: [
      "summary",
      "skills",
      "projects",
      "experience",
      "education",
      "certifications",
      "languages"
    ]
  },
  data: {
    label: "Data",
    sectionOrder: [
      "summary",
      "skills",
      "projects",
      "experience",
      "certifications",
      "education",
      "languages"
    ]
  },
  product: {
    label: "Product",
    sectionOrder: [
      "summary",
      "experience",
      "projects",
      "skills",
      "education",
      "highlights",
      "certifications",
      "languages"
    ]
  },
  marketing: {
    label: "Marketing",
    sectionOrder: [
      "summary",
      "experience",
      "skills",
      "projects",
      "education",
      "highlights",
      "certifications",
      "languages"
    ]
  },
  finance: {
    label: "Finance",
    sectionOrder: [
      "summary",
      "highlights",
      "experience",
      "education",
      "skills",
      "certifications",
      "projects",
      "languages"
    ]
  }
};

const TEMPLATE_ROLE_PROFILE = {
  classic: "sde",
  "corporate-clarity": "finance",
  "timeline-focus": "product",
  modern: "marketing",
  "modern-nordic": "product",
  "creative-balance": "marketing",
  compact: "data",
  "compact-skills-matrix": "data",
  "quickscan-compact": "sde",
  executive: "finance",
  "boardroom-impact": "finance",
  "strategy-lead": "product"
};

const LAYOUT_META = {
  classic: {
    tags: ["Recommended", "ATS-Optimized"],
    popularity: "4.3K+ people picked this template",
    highlights: [
      "ATS-optimized content hierarchy",
      "Single-column readability for parsers",
      "Editable sample content",
      "Export-ready structure for PDF delivery"
    ],
    insights: [
      {
        title: "Keyword Match Friendly",
        text: "Promotes critical JD keywords in summary, skills, and experience lines."
      },
      {
        title: "Built For CareerForge Pro",
        text: "Works naturally with ATS analyzer and Magic Rewrite improvements."
      },
      {
        title: "Recruiter Readability",
        text: "Highlights role, timeline, and measurable outcomes with clean rhythm."
      },
      {
        title: "Fast Iteration",
        text: "Simple structure for rapid job-specific edits with low formatting friction."
      }
    ]
  },
  modern: {
    tags: ["Balanced", "Modern"],
    popularity: "3.9K+ people picked this template",
    highlights: [
      "ATS-safe centered profile header",
      "Strong summary-to-experience progression",
      "Readable two-zone content rhythm",
      "Export-ready structure for PDF delivery"
    ],
    insights: [
      {
        title: "Keyword Match Friendly",
        text: "Keeps core terms near top fold and distributes them naturally in bullets."
      },
      {
        title: "Built For CareerForge Pro",
        text: "Supports ATS score tracking and repeat optimization cycles."
      },
      {
        title: "Recruiter Readability",
        text: "Balances visual polish with strict section semantics for screening speed."
      },
      {
        title: "Fast Iteration",
        text: "Lets you pivot to new role narratives without breaking layout quality."
      }
    ]
  },
  compact: {
    tags: ["Keyword Heavy", "Compact"],
    popularity: "3.2K+ people picked this template",
    highlights: [
      "High-density ATS-friendly presentation",
      "Compact sectioning for quick scanning",
      "Language bars for profile depth",
      "Export-ready structure for PDF delivery"
    ],
    insights: [
      {
        title: "Keyword Match Friendly",
        text: "Moves role nouns and tool terms into highly visible scanning lanes."
      },
      {
        title: "Built For CareerForge Pro",
        text: "Pairs with keyword suggestions and section-level ATS feedback loops."
      },
      {
        title: "Recruiter Readability",
        text: "Dense but organized content helps both parsers and fast human review."
      },
      {
        title: "Fast Iteration",
        text: "Great for tailoring resume variants across many similar job postings."
      }
    ]
  },
  executive: {
    tags: ["Leadership", "Minimal"],
    popularity: "2.6K+ people picked this template",
    highlights: [
      "Senior-level narrative structure",
      "Minimal design with ATS-safe semantics",
      "Outcome-focused experience storytelling",
      "Export-ready structure for PDF delivery"
    ],
    insights: [
      {
        title: "Keyword Match Friendly",
        text: "Blends strategic keyword placement with leadership credibility signals."
      },
      {
        title: "Built For CareerForge Pro",
        text: "Optimized for AI rewrite quality and before/after ATS trend tracking."
      },
      {
        title: "Recruiter Readability",
        text: "Prioritizes impact statements and scope indicators for hiring managers."
      },
      {
        title: "Fast Iteration",
        text: "Easy to adapt for principal, manager, and staff-level job targets."
      }
    ]
  }
};

const TEMPLATE_META_OVERRIDES = {
  classic: {
    popularity: "5.2K+ people picked this template"
  },
  "corporate-clarity": {
    tags: ["Corporate", "ATS-Ready"],
    popularity: "4.8K+ people picked this template"
  },
  "timeline-focus": {
    tags: ["Chronological", "Stable Career"],
    popularity: "4.1K+ people picked this template"
  },
  modern: {
    tags: ["Balanced", "Creative"],
    popularity: "4.7K+ people picked this template"
  },
  "modern-nordic": {
    tags: ["Minimal", "Clean"],
    popularity: "4.0K+ people picked this template"
  },
  "creative-balance": {
    tags: ["Hybrid", "Visual"],
    popularity: "3.7K+ people picked this template"
  },
  compact: {
    tags: ["Keyword Heavy", "Monospaced"],
    popularity: "3.8K+ people picked this template"
  },
  "compact-skills-matrix": {
    tags: ["Skills First", "Dense"],
    popularity: "3.5K+ people picked this template"
  },
  "quickscan-compact": {
    tags: ["Fast Scan", "ATS Parser"],
    popularity: "3.1K+ people picked this template"
  },
  executive: {
    popularity: "2.9K+ people picked this template"
  },
  "boardroom-impact": {
    tags: ["Senior", "Leadership"],
    popularity: "2.7K+ people picked this template"
  },
  "strategy-lead": {
    tags: ["Director", "Strategy"],
    popularity: "2.4K+ people picked this template"
  }
};

function getRoleProfile(templateId) {
  const familyKey = TEMPLATE_ROLE_PROFILE[templateId] || "sde";
  const roleConfig = JOB_FAMILY_CONFIG[familyKey] || JOB_FAMILY_CONFIG.sde;

  return {
    jobFamily: familyKey,
    jobFamilyLabel: roleConfig.label,
    sectionOrder: roleConfig.sectionOrder,
    sectionOrderLabel: roleConfig.sectionOrder
      .map((item) => SECTION_LABELS[item] || item)
      .join(" -> ")
  };
}

function mergeMeta(layoutMeta, overrideMeta = {}) {
  const roleProfile = getRoleProfile(overrideMeta.templateId);

  return {
    tags: overrideMeta.tags || layoutMeta.tags,
    popularity: overrideMeta.popularity || layoutMeta.popularity,
    highlights: overrideMeta.highlights || layoutMeta.highlights,
    insights: overrideMeta.insights || layoutMeta.insights,
    jobFamily: roleProfile.jobFamily,
    jobFamilyLabel: roleProfile.jobFamilyLabel,
    sectionOrder: roleProfile.sectionOrder,
    sectionOrderLabel: roleProfile.sectionOrderLabel
  };
}

export const TEMPLATE_META = ATS_TEMPLATES.reduce((acc, template) => {
  const layoutGroup = LAYOUT_GROUP[template.layout] || "classic";
  const baseMeta = LAYOUT_META[layoutGroup] || LAYOUT_META.classic;
  const overrideMeta = {
    ...(TEMPLATE_META_OVERRIDES[template.id] || {}),
    templateId: template.id
  };
  acc[template.id] = mergeMeta(baseMeta, overrideMeta);
  return acc;
}, {});

export function getTemplateById(templateId) {
  return ATS_TEMPLATES.find((template) => template.id === templateId) || null;
}

export function getTemplateLayout(templateId) {
  const template = getTemplateById(templateId);
  return template?.layout || "classic";
}

export function getTemplateMeta(templateId) {
  return TEMPLATE_META[templateId] || TEMPLATE_META.classic;
}
