const STOP_WORDS = new Set([
  "a",
  "about",
  "above",
  "across",
  "after",
  "again",
  "against",
  "all",
  "also",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "done",
  "down",
  "during",
  "each",
  "few",
  "for",
  "from",
  "further",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "me",
  "more",
  "most",
  "my",
  "myself",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "use",
  "using",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves"
]);

const GENERIC_JD_TERMS = new Set([
  "ability",
  "able",
  "applicant",
  "candidate",
  "collaborate",
  "collaboration",
  "communication",
  "company",
  "contributor",
  "culture",
  "customer",
  "detail",
  "environment",
  "excellent",
  "fast",
  "growth",
  "highly",
  "independently",
  "individual",
  "job",
  "join",
  "knowledge",
  "learn",
  "learning",
  "looking",
  "maintain",
  "manage",
  "manager",
  "member",
  "multiple",
  "organization",
  "organizational",
  "passion",
  "performance",
  "problem",
  "professional",
  "quality",
  "responsibility",
  "responsible",
  "result",
  "role",
  "self",
  "skill",
  "solution",
  "strong",
  "success",
  "successful",
  "support",
  "system",
  "team",
  "technical",
  "timely",
  "work",
  "working"
]);

const DYNAMIC_NOISE_TOKENS = new Set([
  "ability",
  "about",
  "across",
  "candidate",
  "demonstrated",
  "desired",
  "experience",
  "experienced",
  "familiarity",
  "good",
  "great",
  "have",
  "having",
  "ideal",
  "including",
  "knowledge",
  "looking",
  "maintain",
  "must",
  "need",
  "needed",
  "plus",
  "preferred",
  "prefer",
  "proficient",
  "required",
  "requirement",
  "responsibility",
  "responsibilities",
  "should",
  "strong",
  "team",
  "understanding",
  "using",
  "with"
]);

const ACTION_VERBS = new Set([
  "accelerated",
  "achieved",
  "adapted",
  "analyzed",
  "architected",
  "automated",
  "built",
  "collaborated",
  "created",
  "deployed",
  "delivered",
  "designed",
  "developed",
  "drove",
  "eliminated",
  "enhanced",
  "established",
  "executed",
  "expanded",
  "generated",
  "implemented",
  "improved",
  "increased",
  "influenced",
  "integrated",
  "launched",
  "led",
  "managed",
  "migrated",
  "optimized",
  "orchestrated",
  "owned",
  "reduced",
  "resolved",
  "scaled",
  "shipped",
  "simplified",
  "solved",
  "streamlined",
  "transformed"
]);

const REQUIREMENT_PATTERNS = [
  /\bmust\b/i,
  /\brequired\b/i,
  /\bminimum\b/i,
  /\bneed(?:ed)?\b/i,
  /\bessential\b/i,
  /\bstrong\b/i,
  /\bproficient\b/i,
  /\bexpert\b/i,
  /\bhands[- ]on\b/i,
  /\byears?\s+of\s+experience\b/i,
  /\bqualifications?\b/i
];

const PREFERRED_PATTERNS = [
  /\bnice\s+to\s+have\b/i,
  /\bpreferred\b/i,
  /\bplus\b/i,
  /\bbonus\b/i,
  /\bgood\s+to\s+have\b/i,
  /\bdesirable\b/i
];

const RESPONSIBILITY_PATTERNS = [
  /\bresponsibilit(?:y|ies)\b/i,
  /\byou\s+will\b/i,
  /\bday[- ]to[- ]day\b/i,
  /\bown\b/i,
  /\bdeliver\b/i,
  /\bbuild\b/i,
  /\bdesign\b/i,
  /\bdevelop\b/i,
  /\blead\b/i
];

const CERTIFICATION_PATTERNS = [
  /\bcertified\b/i,
  /\bcertification\b/i,
  /\bcertificate\b/i,
  /\blicense\b/i
];

const ROLE_PHRASES = [
  "software engineer",
  "full stack developer",
  "frontend developer",
  "backend developer",
  "devops engineer",
  "site reliability engineer",
  "data engineer",
  "data analyst",
  "data scientist",
  "machine learning engineer",
  "ai engineer",
  "qa engineer",
  "test engineer",
  "product manager",
  "project manager",
  "business analyst",
  "solutions architect",
  "security engineer",
  "cloud engineer",
  "mobile developer"
];

const SKILL_CATALOG = [
  { label: "JavaScript", category: "skill", aliases: ["javascript", "js", "ecmascript"] },
  { label: "TypeScript", category: "skill", aliases: ["typescript", "ts"] },
  { label: "React", category: "skill", aliases: ["react", "react.js", "reactjs"] },
  { label: "Next.js", category: "skill", aliases: ["next.js", "nextjs", "next js"] },
  { label: "Vue", category: "skill", aliases: ["vue", "vue.js", "vuejs"] },
  { label: "Angular", category: "skill", aliases: ["angular", "angularjs"] },
  { label: "Node.js", category: "skill", aliases: ["node.js", "nodejs", "node js"] },
  { label: "Express", category: "skill", aliases: ["express", "express.js", "expressjs"] },
  { label: "Python", category: "skill", aliases: ["python"] },
  { label: "Java", category: "skill", aliases: ["java"] },
  { label: "C++", category: "skill", aliases: ["c++"] },
  { label: "C#", category: "skill", aliases: ["c#", "csharp"] },
  { label: "Go", category: "skill", aliases: ["golang", "go"] },
  { label: "SQL", category: "skill", aliases: ["sql", "postgresql", "mysql", "sql server"] },
  { label: "NoSQL", category: "skill", aliases: ["nosql", "mongodb", "cassandra", "dynamodb"] },
  { label: "REST API", category: "tool", aliases: ["rest", "rest api", "restful"] },
  { label: "GraphQL", category: "tool", aliases: ["graphql"] },
  { label: "Microservices", category: "architecture", aliases: ["microservices", "microservice"] },
  { label: "System Design", category: "architecture", aliases: ["system design", "distributed systems"] },
  { label: "Docker", category: "tool", aliases: ["docker", "containerization", "containerisation"] },
  { label: "Kubernetes", category: "tool", aliases: ["kubernetes", "k8s"] },
  { label: "CI/CD", category: "tool", aliases: ["ci/cd", "ci cd", "continuous integration", "continuous delivery"] },
  { label: "Git", category: "tool", aliases: ["git", "github", "gitlab", "bitbucket"] },
  { label: "AWS", category: "platform", aliases: ["aws", "amazon web services"] },
  { label: "Azure", category: "platform", aliases: ["azure", "microsoft azure"] },
  { label: "GCP", category: "platform", aliases: ["gcp", "google cloud", "google cloud platform"] },
  { label: "Terraform", category: "tool", aliases: ["terraform", "iac", "infrastructure as code"] },
  { label: "Linux", category: "platform", aliases: ["linux", "unix"] },
  { label: "Agile", category: "methodology", aliases: ["agile", "scrum", "kanban"] },
  { label: "Testing", category: "methodology", aliases: ["testing", "unit testing", "integration testing", "e2e testing"] },
  { label: "Jest", category: "tool", aliases: ["jest"] },
  { label: "Cypress", category: "tool", aliases: ["cypress"] },
  { label: "Selenium", category: "tool", aliases: ["selenium"] },
  { label: "Playwright", category: "tool", aliases: ["playwright"] },
  { label: "PyTest", category: "tool", aliases: ["pytest", "py test"] },
  { label: "Pandas", category: "tool", aliases: ["pandas"] },
  { label: "NumPy", category: "tool", aliases: ["numpy"] },
  { label: "Spark", category: "tool", aliases: ["spark", "apache spark", "pyspark"] },
  { label: "Airflow", category: "tool", aliases: ["airflow", "apache airflow"] },
  { label: "Kafka", category: "tool", aliases: ["kafka", "apache kafka"] },
  { label: "Tableau", category: "tool", aliases: ["tableau"] },
  { label: "Power BI", category: "tool", aliases: ["power bi", "powerbi"] },
  { label: "Machine Learning", category: "domain", aliases: ["machine learning", "ml"] },
  { label: "Deep Learning", category: "domain", aliases: ["deep learning", "neural networks"] },
  { label: "NLP", category: "domain", aliases: ["nlp", "natural language processing"] },
  { label: "Computer Vision", category: "domain", aliases: ["computer vision"] },
  { label: "LLM", category: "domain", aliases: ["llm", "large language model", "large language models"] },
  { label: "Prompt Engineering", category: "domain", aliases: ["prompt engineering"] },
  { label: "RAG", category: "domain", aliases: ["rag", "retrieval augmented generation"] },
  { label: "Data Modeling", category: "domain", aliases: ["data modeling", "data modelling"] },
  { label: "ETL", category: "domain", aliases: ["etl", "elt", "data pipeline", "data pipelines"] },
  { label: "Analytics", category: "domain", aliases: ["analytics", "analysis"] },
  { label: "Product Strategy", category: "domain", aliases: ["product strategy", "roadmap", "go to market"] },
  { label: "Stakeholder Management", category: "soft-skill", aliases: ["stakeholder management", "stakeholder communication"] },
  { label: "Communication", category: "soft-skill", aliases: ["communication", "presentation"] },
  { label: "Leadership", category: "soft-skill", aliases: ["leadership", "mentoring", "mentor"] },
  { label: "Problem Solving", category: "soft-skill", aliases: ["problem solving", "critical thinking"] },
  { label: "Security", category: "domain", aliases: ["security", "cybersecurity", "application security"] },
  { label: "Observability", category: "domain", aliases: ["observability", "monitoring", "logging", "tracing"] },
  { label: "Scalability", category: "domain", aliases: ["scalability", "high availability", "reliability"] },
  { label: "Performance Optimization", category: "domain", aliases: ["performance optimization", "latency", "throughput"] },
  { label: "A/B Testing", category: "methodology", aliases: ["a/b testing", "ab testing", "experimentation"] },
  { label: "SEO", category: "domain", aliases: ["seo", "search engine optimization"] },
  { label: "SEM", category: "domain", aliases: ["sem", "paid search", "google ads"] },
  { label: "Financial Modeling", category: "domain", aliases: ["financial modeling", "financial modelling"] },
  { label: "Forecasting", category: "domain", aliases: ["forecasting", "budgeting"] },
  { label: "CPA", category: "certification", aliases: ["cpa"] },
  { label: "PMP", category: "certification", aliases: ["pmp", "project management professional"] },
  { label: "AWS Certification", category: "certification", aliases: ["aws certified", "aws certification"] },
  { label: "Scrum Certification", category: "certification", aliases: ["scrum master", "csm", "psm"] }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(Number(value) || 0);
}

function canonicalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[|]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/[./]/g, " ")
    .replace(/[\\-_,:;]+/g, " ")
    .replace(/[^a-z0-9+#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeToken(token) {
  const value = String(token || "").trim();
  if (!value) return "";
  if (value.length <= 3) return value;

  if (value.endsWith("ies") && value.length > 4) {
    return `${value.slice(0, -3)}y`;
  }

  if (value.endsWith("ses") && value.length > 4) {
    return value.slice(0, -2);
  }

  if (value.endsWith("s") && !value.endsWith("ss")) {
    return value.slice(0, -1);
  }

  return value;
}

function tokenize(text) {
  const normalized = canonicalizeText(text);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .map((token) => singularizeToken(token))
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
}

function toNgrams(tokens, maxGram = 3) {
  const grams = [];

  for (let size = 1; size <= maxGram; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      grams.push(tokens.slice(index, index + size).join(" "));
    }
  }

  return grams;
}

function ngramSetFromText(text, maxGram = 3) {
  const tokens = tokenize(text);
  return new Set(toNgrams(tokens, maxGram));
}

function normalizeAliasList(aliases = []) {
  const normalized = new Set();

  aliases.forEach((alias) => {
    const canonical = canonicalizeText(alias);
    if (!canonical) return;

    const normalizedAlias = canonical
      .split(" ")
      .map((token) => singularizeToken(token))
      .filter(Boolean)
      .join(" ");

    if (normalizedAlias) {
      normalized.add(normalizedAlias);
    }
  });

  return [...normalized];
}

function prettifyTerm(canonical) {
  const value = String(canonical || "").trim();
  if (!value) return "";

  const acronyms = new Set(["api", "aws", "gcp", "sql", "etl", "elt", "nlp", "rag", "seo", "sem", "pmp", "cpa", "ci", "cd"]);
  return value
    .split(" ")
    .map((token) => {
      if (acronyms.has(token)) {
        return token.toUpperCase();
      }

      if (token === "js") return "JS";
      if (token === "c#") return "C#";
      if (token === "c++") return "C++";

      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
}

function splitSentences(text) {
  return String(text || "")
    .split(/\n+|(?<=[.!?;:])\s+/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 2);
}

function sentenceWeight(sentence) {
  let weight = 1;

  if (REQUIREMENT_PATTERNS.some((pattern) => pattern.test(sentence))) {
    weight += 1.2;
  }

  if (PREFERRED_PATTERNS.some((pattern) => pattern.test(sentence))) {
    weight += 0.45;
  }

  if (RESPONSIBILITY_PATTERNS.some((pattern) => pattern.test(sentence))) {
    weight += 0.3;
  }

  return weight;
}

function looksGenericPhrase(tokens) {
  if (!tokens.length) return true;

  if (tokens.length === 1 && GENERIC_JD_TERMS.has(tokens[0])) {
    return true;
  }

  const meaningful = tokens.filter((token) => !GENERIC_JD_TERMS.has(token));
  return meaningful.length === 0;
}

function guessCategoryForPhrase(phrase) {
  if (/\b(certified|certification|license|pmp|cpa|aws certified|scrum)\b/i.test(phrase)) {
    return "certification";
  }

  if (/\b(engineer|developer|manager|analyst|architect|scientist|lead)\b/i.test(phrase)) {
    return "role";
  }

  if (/\b(methodology|scrum|agile|kanban|testing)\b/i.test(phrase)) {
    return "methodology";
  }

  if (/\b(api|docker|kubernetes|cloud|python|java|react|node|sql|mongodb|aws|azure|gcp)\b/i.test(phrase)) {
    return "skill";
  }

  return "domain";
}

function buildSkillCatalog() {
  return SKILL_CATALOG.map((item) => {
    const canonical = canonicalizeText(item.label)
      .split(" ")
      .map((token) => singularizeToken(token))
      .join(" ");

    const aliases = normalizeAliasList([item.label, ...(item.aliases || [])]);

    return {
      ...item,
      canonical,
      aliases
    };
  });
}

const NORMALIZED_SKILL_CATALOG = buildSkillCatalog();
const CATALOG_CANONICAL_SET = new Set(NORMALIZED_SKILL_CATALOG.map((item) => item.canonical));
const ROLE_CANONICAL_SET = new Set(
  ROLE_PHRASES.map((phrase) =>
    canonicalizeText(phrase)
      .split(" ")
      .map((token) => singularizeToken(token))
      .join(" ")
  ).filter(Boolean)
);

function registerCandidate(candidateMap, candidate) {
  const canonical = String(candidate?.canonical || "").trim();
  if (!canonical) return;

  const previous = candidateMap.get(canonical);
  const aliases = normalizeAliasList(candidate.aliases || [canonical]);
  const score = Number(candidate.score || 0);
  const category = candidate.category || "domain";

  if (!previous) {
    candidateMap.set(canonical, {
      canonical,
      label: candidate.label || prettifyTerm(canonical),
      category,
      score,
      aliases,
      hitCount: 1
    });
    return;
  }

  const mergedAliases = new Set([...(previous.aliases || []), ...aliases]);
  candidateMap.set(canonical, {
    ...previous,
    label: previous.label || candidate.label || prettifyTerm(canonical),
    category: previous.category || category,
    score: previous.score + score,
    aliases: [...mergedAliases],
    hitCount: (previous.hitCount || 0) + 1
  });
}

function extractKeywordsFromJobDescription(jobDescription, limit = 30) {
  const text = String(jobDescription || "");
  if (!text.trim()) return [];

  const candidateMap = new Map();
  const jdNgrams = ngramSetFromText(text, 4);
  const sentences = splitSentences(text);

  NORMALIZED_SKILL_CATALOG.forEach((skill) => {
    const matchedAliases = skill.aliases.filter((alias) => jdNgrams.has(alias));
    if (!matchedAliases.length) return;

    const emphasized = sentences.some((sentence) => {
      const normalizedSentence = ngramSetFromText(sentence, 4);
      const sentenceHasSkill = matchedAliases.some((alias) => normalizedSentence.has(alias));
      if (!sentenceHasSkill) return false;
      return REQUIREMENT_PATTERNS.some((pattern) => pattern.test(sentence));
    });

    registerCandidate(candidateMap, {
      canonical: skill.canonical,
      label: skill.label,
      category: skill.category,
      aliases: skill.aliases,
      score: matchedAliases.length * (emphasized ? 8.5 : 6.5)
    });
  });

  ROLE_PHRASES.forEach((phrase) => {
    const canonical = canonicalizeText(phrase)
      .split(" ")
      .map((token) => singularizeToken(token))
      .join(" ");

    if (!canonical || !jdNgrams.has(canonical)) return;

    registerCandidate(candidateMap, {
      canonical,
      label: prettifyTerm(canonical),
      category: "role",
      aliases: [canonical],
      score: 7.2
    });
  });

  sentences.forEach((sentence) => {
    const tokens = tokenize(sentence);
    if (!tokens.length) return;

    const weight = sentenceWeight(sentence);

    tokens.forEach((token) => {
      if (token.length < 3) return;
      if (GENERIC_JD_TERMS.has(token) || DYNAMIC_NOISE_TOKENS.has(token)) return;

      registerCandidate(candidateMap, {
        canonical: token,
        label: prettifyTerm(token),
        category: guessCategoryForPhrase(token),
        aliases: [token],
        score: 0.58 * weight
      });
    });

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const left = tokens[index];
      const right = tokens[index + 1];

      if (!left || !right) continue;
      if (DYNAMIC_NOISE_TOKENS.has(left) || DYNAMIC_NOISE_TOKENS.has(right)) continue;
      if (GENERIC_JD_TERMS.has(left) || GENERIC_JD_TERMS.has(right)) continue;

      const phraseTokens = [left, right];
      if (looksGenericPhrase(phraseTokens)) continue;

      const canonical = phraseTokens.join(" ").trim();
      if (!canonical || canonical.length < 5) continue;

      registerCandidate(candidateMap, {
        canonical,
        label: prettifyTerm(canonical),
        category: guessCategoryForPhrase(canonical),
        aliases: [canonical],
        score: 1.25 * weight
      });
    }

    if (CERTIFICATION_PATTERNS.some((pattern) => pattern.test(sentence))) {
      const certTokens = tokenize(sentence)
        .filter((token) => token.length > 2)
        .slice(0, 4);

      if (certTokens.length) {
        const certPhrase = certTokens.join(" ");
        registerCandidate(candidateMap, {
          canonical: certPhrase,
          label: prettifyTerm(certPhrase),
          category: "certification",
          aliases: [certPhrase],
          score: 3.2 * weight
        });
      }
    }
  });

  const sortedCandidates = [...candidateMap.values()]
    .filter((item) => item.score > 1.2)
    .sort((a, b) => b.score - a.score);

  const deduped = [];
  for (const item of sortedCandidates) {
    const tokens = item.canonical.split(" ");
    const fromCatalog =
      CATALOG_CANONICAL_SET.has(item.canonical) || ROLE_CANONICAL_SET.has(item.canonical);

    if (tokens.length === 1 && GENERIC_JD_TERMS.has(tokens[0])) {
      continue;
    }

    if (!fromCatalog && tokens.some((token) => DYNAMIC_NOISE_TOKENS.has(token))) {
      continue;
    }

    if (!fromCatalog && tokens.length === 1 && item.score < 2.3) {
      continue;
    }

    if (!fromCatalog && tokens.length === 2 && item.score < 3.1) {
      continue;
    }

    if (
      tokens.length === 1 &&
      deduped.some(
        (selected) =>
          selected.canonical.includes(item.canonical) &&
          selected.canonical !== item.canonical &&
          selected.score >= item.score * 0.7
      )
    ) {
      continue;
    }

    deduped.push(item);
    if (deduped.length >= limit * 2) {
      break;
    }
  }

  const trimmed = deduped.slice(0, limit);
  const maxScore = trimmed.length ? trimmed[0].score : 1;

  return trimmed.map((item) => {
    const normalizedImportance = clamp((item.score / maxScore) * 5, 1, 5);
    return {
      ...item,
      importance: round(normalizedImportance * 10) / 10,
      aliases: normalizeAliasList(item.aliases)
    };
  });
}

function sectionArrayText(items, mapper) {
  return (Array.isArray(items) ? items : [])
    .flatMap((item) => mapper(item) || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
}

function buildResumeSectionTexts(resumeData) {
  const profile = resumeData?.profile || {};

  const profileText = [
    profile.fullName,
    profile.title,
    profile.email,
    profile.phone,
    profile.location,
    profile.summary,
    ...(profile.links || []).flatMap((link) => [link?.label, link?.url])
  ]
    .filter(Boolean)
    .join(" ");

  const summaryText = [profile.title, profile.summary].filter(Boolean).join(" ");

  const experienceText = sectionArrayText(resumeData?.experience, (entry) => [
    entry?.role,
    entry?.company,
    entry?.location,
    ...(entry?.bullets || [])
  ]);

  const skillsText = sectionArrayText(resumeData?.skills, (group) => [
    group?.category,
    ...(group?.items || [])
  ]);

  const projectsText = sectionArrayText(resumeData?.projects, (project) => [
    project?.name,
    ...(project?.stack || []),
    ...(project?.bullets || []),
    project?.link
  ]);

  const educationText = sectionArrayText(resumeData?.education, (entry) => [
    entry?.degree,
    entry?.field,
    entry?.institution,
    ...(entry?.highlights || []),
    entry?.startYear,
    entry?.endYear
  ]);

  const certificationsText = sectionArrayText(resumeData?.certifications, (cert) => [
    cert?.name,
    cert?.issuer,
    cert?.year
  ]);

  return {
    profile: profileText,
    summary: summaryText,
    experience: experienceText,
    skills: skillsText,
    projects: projectsText,
    education: educationText,
    certifications: certificationsText,
    all: [
      profileText,
      experienceText,
      skillsText,
      projectsText,
      educationText,
      certificationsText
    ]
      .filter(Boolean)
      .join(" ")
  };
}

function countNonEmptyResumeSections(resumeData) {
  const sections = {
    summary: Boolean(String(resumeData?.profile?.summary || "").trim()),
    experience: Array.isArray(resumeData?.experience) && resumeData.experience.some((entry) => {
      const bullets = Array.isArray(entry?.bullets) ? entry.bullets : [];
      return Boolean(entry?.role || entry?.company || bullets.some((bullet) => String(bullet || "").trim()));
    }),
    skills: Array.isArray(resumeData?.skills) && resumeData.skills.some((group) =>
      Array.isArray(group?.items) && group.items.some((item) => String(item || "").trim())
    ),
    projects: Array.isArray(resumeData?.projects) && resumeData.projects.some((project) =>
      Boolean(project?.name) ||
      (Array.isArray(project?.bullets) && project.bullets.some((bullet) => String(bullet || "").trim()))
    ),
    education: Array.isArray(resumeData?.education) && resumeData.education.some((entry) =>
      Boolean(entry?.institution || entry?.degree || entry?.field)
    ),
    certifications: Array.isArray(resumeData?.certifications) && resumeData.certifications.some((cert) =>
      Boolean(cert?.name || cert?.issuer)
    )
  };

  const nonEmptySectionCount = Object.values(sections).filter(Boolean).length;
  return {
    sections,
    nonEmptySectionCount,
    totalSections: Object.keys(sections).length
  };
}

function bulletWordCount(text) {
  return tokenize(text).length;
}

function bulletHasMetric(text) {
  return /(\d+\s?%|\$\s?\d+|\d+x|\d+\+|\b\d{2,}\b)/i.test(String(text || ""));
}

function bulletStartsWithActionVerb(text) {
  const firstToken = tokenize(text)[0] || "";
  return ACTION_VERBS.has(firstToken);
}

function buildResumeSignals(resumeData, sectionTexts) {
  const experiences = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  const projects = Array.isArray(resumeData?.projects) ? resumeData.projects : [];
  const profile = resumeData?.profile || {};

  const experienceBullets = experiences.flatMap((entry) => entry?.bullets || []).filter(Boolean);
  const projectBullets = projects.flatMap((project) => project?.bullets || []).filter(Boolean);
  const allBullets = [...experienceBullets, ...projectBullets].map((bullet) => String(bullet || "").trim()).filter(Boolean);

  const bulletWordCounts = allBullets.map((bullet) => bulletWordCount(bullet));
  const actionVerbCount = allBullets.filter((bullet) => bulletStartsWithActionVerb(bullet)).length;
  const metricBulletCount = allBullets.filter((bullet) => bulletHasMetric(bullet)).length;

  const inRangeBulletCount = bulletWordCounts.filter((count) => count >= 8 && count <= 28).length;
  const longBullets = bulletWordCounts.filter((count) => count > 35).length;

  const skillItems = sectionTexts.skills ? tokenize(sectionTexts.skills) : [];
  const uniqueSkills = new Set(skillItems).size;

  const contactFields = {
    fullName: Boolean(String(profile.fullName || "").trim()),
    title: Boolean(String(profile.title || "").trim()),
    email: Boolean(String(profile.email || "").trim()),
    phone: Boolean(String(profile.phone || "").trim()),
    location: Boolean(String(profile.location || "").trim())
  };

  const contactFilledCount = Object.values(contactFields).filter(Boolean).length;
  const summaryLength = String(profile.summary || "").trim().length;

  const sectionStats = countNonEmptyResumeSections(resumeData);

  return {
    experienceEntryCount: experiences.filter((entry) => {
      const bullets = Array.isArray(entry?.bullets) ? entry.bullets : [];
      return Boolean(entry?.role || entry?.company || bullets.some((bullet) => String(bullet || "").trim()));
    }).length,
    projectCount: projects.filter((project) => Boolean(String(project?.name || "").trim())).length,
    experienceBulletCount: experienceBullets.length,
    totalBulletCount: allBullets.length,
    bulletActionRatio: allBullets.length ? actionVerbCount / allBullets.length : 0,
    bulletMetricRatio: allBullets.length ? metricBulletCount / allBullets.length : 0,
    bulletLengthQuality: allBullets.length ? inRangeBulletCount / allBullets.length : 0,
    longBulletRatio: allBullets.length ? longBullets / allBullets.length : 0,
    averageBulletWords: bulletWordCounts.length
      ? bulletWordCounts.reduce((sum, count) => sum + count, 0) / bulletWordCounts.length
      : 0,
    uniqueSkillCount: uniqueSkills,
    summaryLength,
    contactFilledCount,
    contactTotal: Object.keys(contactFields).length,
    contactFields,
    sectionStats,
    linksCount: Array.isArray(profile.links) ? profile.links.filter((link) => Boolean(link?.url || link)).length : 0
  };
}

function termMatchesSection(term, sectionNgrams) {
  return term.aliases.some((alias) => sectionNgrams.has(alias));
}

function computeKeywordCoverage(keywords, sectionNgramsBySection) {
  const sectionKeys = [
    "summary",
    "experience",
    "skills",
    "projects",
    "education",
    "certifications",
    "profile"
  ];

  const sectionWeightHints = {
    experience: 0.55,
    skills: 0.3,
    summary: 0.15,
    projects: 0.12,
    education: 0.1,
    certifications: 0.08,
    profile: 0.06
  };

  let totalWeight = 0;
  let matchedWeight = 0;

  const sectionMatchedWeight = Object.fromEntries(sectionKeys.map((key) => [key, 0]));
  const sectionMatchedCount = Object.fromEntries(sectionKeys.map((key) => [key, 0]));

  const matchedKeywords = [];
  const missingKeywords = [];
  const keywordMatchDetails = [];

  keywords.forEach((term) => {
    const importance = Number(term.importance || 1);
    totalWeight += importance;

    const matchedSections = sectionKeys.filter((section) =>
      termMatchesSection(term, sectionNgramsBySection[section])
    );

    const matched = matchedSections.length > 0;
    if (matched) {
      matchedWeight += importance;
      matchedKeywords.push(term.label);
      matchedSections.forEach((section) => {
        sectionMatchedWeight[section] += importance;
        sectionMatchedCount[section] += 1;
      });
    } else {
      missingKeywords.push(term.label);
    }

    keywordMatchDetails.push({
      term: term.label,
      canonical: term.canonical,
      importance,
      category: term.category,
      matched,
      matchedSections
    });
  });

  const keywordRelevanceScore = totalWeight ? (matchedWeight / totalWeight) * 100 : 0;

  const sectionBreakdown = sectionKeys.reduce((acc, section) => {
    const coverage = totalWeight ? (sectionMatchedWeight[section] / totalWeight) * 100 : 0;
    acc[section] = {
      weight: sectionWeightHints[section] || 0,
      matchedCount: sectionMatchedCount[section],
      totalKeywords: keywords.length,
      coverage: round(coverage),
      weightedCoverage: round(coverage * (sectionWeightHints[section] || 0) * 100) / 100
    };
    return acc;
  }, {});

  return {
    keywordRelevanceScore: clamp(keywordRelevanceScore, 0, 100),
    matchedKeywords,
    missingKeywords,
    sectionBreakdown,
    keywordMatchDetails,
    totalWeight,
    matchedWeight
  };
}

function computeSemanticAlignmentScore(keywordCoverage) {
  const preferredSectionsByCategory = {
    role: ["profile", "summary", "experience"],
    skill: ["skills", "experience", "projects"],
    tool: ["skills", "experience", "projects"],
    architecture: ["experience", "projects", "summary"],
    platform: ["skills", "experience", "projects"],
    methodology: ["experience", "projects", "summary"],
    domain: ["summary", "experience", "projects"],
    certification: ["certifications", "education", "summary"],
    "soft-skill": ["summary", "experience"]
  };

  const details = keywordCoverage.keywordMatchDetails || [];
  const totalWeight = details.reduce((sum, item) => sum + (Number(item.importance) || 0), 0);

  let alignedWeight = 0;

  details.forEach((item) => {
    const importance = Number(item.importance || 0);
    if (!importance) return;

    if (!item.matched) {
      return;
    }

    const preferredSections = preferredSectionsByCategory[item.category] || ["summary", "experience", "skills"];
    const matchedPreferred = preferredSections.some((section) =>
      (item.matchedSections || []).includes(section)
    );

    if (matchedPreferred) {
      alignedWeight += importance;
      return;
    }

    alignedWeight += importance * 0.35;
  });

  if (!totalWeight) return 0;
  return clamp((alignedWeight / totalWeight) * 100, 0, 100);
}

function computeExperienceQualityScore(signals) {
  const entryScore = clamp((signals.experienceEntryCount / 3) * 100, 0, 100);
  const bulletVolumeScore = clamp((signals.experienceBulletCount / 10) * 100, 0, 100);
  const actionScore = clamp(signals.bulletActionRatio * 100, 0, 100);
  const metricScore = clamp(signals.bulletMetricRatio * 100, 0, 100);
  const lengthScore = clamp(signals.bulletLengthQuality * 100, 0, 100);

  const score =
    entryScore * 0.22 +
    bulletVolumeScore * 0.18 +
    actionScore * 0.24 +
    metricScore * 0.24 +
    lengthScore * 0.12;

  return clamp(score, 0, 100);
}

function computeStructureScore(signals) {
  const contactScore = signals.contactTotal
    ? (signals.contactFilledCount / signals.contactTotal) * 100
    : 0;

  const sectionScore = signals.sectionStats.totalSections
    ? (signals.sectionStats.nonEmptySectionCount / signals.sectionStats.totalSections) * 100
    : 0;

  const summaryScore = signals.summaryLength >= 70 ? 100 : signals.summaryLength >= 35 ? 70 : 35;
  const linksScore = signals.linksCount > 0 ? 100 : 55;

  const score =
    contactScore * 0.36 +
    sectionScore * 0.42 +
    summaryScore * 0.14 +
    linksScore * 0.08;

  return clamp(score, 0, 100);
}

function computeAtsReadinessScore(signals, keywordCoverage) {
  const summaryLength = signals.summaryLength;

  const summaryWindowScore =
    summaryLength >= 80 && summaryLength <= 320
      ? 100
      : summaryLength >= 45 && summaryLength <= 420
      ? 75
      : summaryLength
      ? 50
      : 25;

  const coveredSections = [
    "summary",
    "experience",
    "skills",
    "projects",
    "education",
    "certifications"
  ].filter((section) => (keywordCoverage.sectionBreakdown?.[section]?.matchedCount || 0) > 0).length;

  const keywordSpreadScore = clamp((coveredSections / 4) * 100, 0, 100);
  const conciseBulletsScore = clamp(signals.bulletLengthQuality * 100, 0, 100);
  const actionVerbScore = clamp(signals.bulletActionRatio * 100, 0, 100);
  const metricScore = clamp(signals.bulletMetricRatio * 100, 0, 100);
  const longBulletPenalty = clamp(signals.longBulletRatio * 100, 0, 100);

  const score =
    keywordSpreadScore * 0.34 +
    summaryWindowScore * 0.18 +
    conciseBulletsScore * 0.2 +
    actionVerbScore * 0.14 +
    metricScore * 0.14 -
    longBulletPenalty * 0.08;

  return clamp(score, 0, 100);
}

function createSuggestions({
  missingKeywords,
  categoryScores,
  sectionBreakdown,
  signals,
  keywordCoverage
}) {
  const suggestions = [];

  if (missingKeywords.length) {
    const topMissing = missingKeywords.slice(0, 8).join(", ");
    suggestions.push(
      `Add high-impact JD terms naturally across Skills, Summary, and Experience: ${topMissing}.`
    );
  }

  if ((sectionBreakdown.experience?.coverage || 0) < 45) {
    suggestions.push(
      "Move key requirements into experience bullets using action + technology + measurable result format."
    );
  }

  if ((sectionBreakdown.skills?.coverage || 0) < 35) {
    suggestions.push(
      "Expand the Skills section with role-specific tools, frameworks, and platforms from the JD."
    );
  }

  if (categoryScores.experienceQuality < 68) {
    suggestions.push(
      "Strengthen bullet quality: start with strong action verbs and include quantifiable impact in at least 50% of bullets."
    );
  }

  if (signals.bulletMetricRatio < 0.35) {
    suggestions.push(
      "Add metrics to experience bullets (%, $, time saved, scale, latency, users) to improve recruiter and ATS confidence."
    );
  }

  if (categoryScores.semanticAlignment < 65) {
    suggestions.push(
      "Align your headline and most recent role descriptions with the target role language used in the job description."
    );
  }

  if (categoryScores.resumeStructure < 70) {
    const missingFields = Object.entries(signals.contactFields)
      .filter(([, present]) => !present)
      .map(([field]) => field);

    if (missingFields.length) {
      suggestions.push(`Complete profile essentials for ATS parsing: ${missingFields.join(", ")}.`);
    } else {
      suggestions.push("Improve structure by ensuring each section has concise, specific, and non-duplicate content.");
    }
  }

  if (categoryScores.atsReadiness < 70) {
    suggestions.push(
      "Keep bullets concise (8-28 words), avoid overlong lines, and distribute critical keywords across multiple sections."
    );
  }

  if (!suggestions.length) {
    suggestions.push("Alignment is strong. Tailor the top 3 bullets to the target role with deeper impact metrics.");
    suggestions.push("Keep your most relevant tools and domain terms near the top of Summary and Skills for faster ATS ranking.");
  }

  const priorityMissing = (keywordCoverage.keywordMatchDetails || [])
    .filter((item) => !item.matched)
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 5)
    .map((item) => item.term);

  if (priorityMissing.length) {
    suggestions.push(`Priority gap terms to target first: ${priorityMissing.join(", ")}.`);
  }

  return [...new Set(suggestions)].slice(0, 7);
}

function analyzeResumeAgainstJobDescription(resumeData, jobDescription) {
  const keywords = extractKeywordsFromJobDescription(jobDescription, 30);
  const sectionTexts = buildResumeSectionTexts(resumeData);

  const sectionNgramsBySection = {
    profile: ngramSetFromText(sectionTexts.profile, 4),
    summary: ngramSetFromText(sectionTexts.summary, 4),
    experience: ngramSetFromText(sectionTexts.experience, 4),
    skills: ngramSetFromText(sectionTexts.skills, 4),
    projects: ngramSetFromText(sectionTexts.projects, 4),
    education: ngramSetFromText(sectionTexts.education, 4),
    certifications: ngramSetFromText(sectionTexts.certifications, 4)
  };

  const keywordCoverage = computeKeywordCoverage(keywords, sectionNgramsBySection);
  const signals = buildResumeSignals(resumeData, sectionTexts);

  const keywordRelevance = keywordCoverage.keywordRelevanceScore;
  const semanticAlignment = computeSemanticAlignmentScore(keywordCoverage);
  const experienceQuality = computeExperienceQualityScore(signals);
  const resumeStructure = computeStructureScore(signals);
  const atsReadiness = computeAtsReadinessScore(signals, keywordCoverage);

  const score = round(
    keywordRelevance * 0.4 +
      semanticAlignment * 0.2 +
      experienceQuality * 0.2 +
      resumeStructure * 0.1 +
      atsReadiness * 0.1
  );

  const categoryScores = {
    keywordRelevance: round(keywordRelevance),
    semanticAlignment: round(semanticAlignment),
    experienceQuality: round(experienceQuality),
    resumeStructure: round(resumeStructure),
    atsReadiness: round(atsReadiness)
  };

  const suggestions = createSuggestions({
    missingKeywords: keywordCoverage.missingKeywords,
    categoryScores,
    sectionBreakdown: keywordCoverage.sectionBreakdown,
    signals,
    keywordCoverage
  });

  const prioritizedKeywords = (keywordCoverage.keywordMatchDetails || [])
    .slice()
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10)
    .map((item) => item.term);

  return {
    score: clamp(score, 0, 100),
    rawScore: round(keywordRelevance),
    totalKeywords: keywords.length,
    matchedKeywords: keywordCoverage.matchedKeywords,
    missingKeywords: keywordCoverage.missingKeywords,
    suggestions,
    sectionBreakdown: keywordCoverage.sectionBreakdown,
    categoryScores,
    diagnostics: {
      matchedKeywordWeight: round(keywordCoverage.matchedWeight * 10) / 10,
      totalKeywordWeight: round(keywordCoverage.totalWeight * 10) / 10,
      experienceEntryCount: signals.experienceEntryCount,
      experienceBulletCount: signals.experienceBulletCount,
      bulletActionRatio: round(signals.bulletActionRatio * 100),
      bulletMetricRatio: round(signals.bulletMetricRatio * 100),
      averageBulletWords: round(signals.averageBulletWords),
      uniqueSkillCount: signals.uniqueSkillCount,
      summaryLength: signals.summaryLength,
      nonEmptySections: signals.sectionStats.nonEmptySectionCount,
      totalSections: signals.sectionStats.totalSections
    },
    priorityKeywords: prioritizedKeywords
  };
}

function extractRankedKeywordsFromJobDescription(jobDescription, limit = 20) {
  return extractKeywordsFromJobDescription(jobDescription || "", Math.max(5, Number(limit) || 20))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .map((item) => item.label);
}

module.exports = {
  analyzeResumeAgainstJobDescription,
  extractRankedKeywordsFromJobDescription
};
