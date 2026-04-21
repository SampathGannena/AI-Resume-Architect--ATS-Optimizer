const { PDFParse } = require("pdf-parse");
const { normalizeResumeInput } = require("../schema/resumeSchema");

const SECTION_DEFINITIONS = [
  {
    key: "summary",
    aliases: [
      "professional summary",
      "profile summary",
      "career summary",
      "about me",
      "summary",
      "profile"
    ]
  },
  {
    key: "experience",
    aliases: [
      "professional experience",
      "work experience",
      "employment history",
      "work history",
      "career history",
      "experience"
    ]
  },
  {
    key: "education",
    aliases: [
      "education and training",
      "academic background",
      "academic qualifications",
      "academic qualification",
      "education details",
      "education profile",
      "qualifications",
      "qualification",
      "education"
    ]
  },
  {
    key: "skills",
    aliases: [
      "technical skills",
      "core skills",
      "key skills",
      "competencies",
      "skill set",
      "skills"
    ]
  },
  {
    key: "projects",
    aliases: [
      "project experience",
      "project highlights",
      "project portfolio",
      "project details",
      "professional projects",
      "relevant projects",
      "selected projects",
      "key projects",
      "personal projects",
      "academic projects",
      "internship projects",
      "capstone projects",
      "projects",
      "project"
    ]
  },
  {
    key: "certifications",
    aliases: [
      "certifications and courses",
      "licenses and certifications",
      "professional certifications",
      "training and certifications",
      "courses and certifications",
      "certifications",
      "certification",
      "credentials",
      "accreditations",
      "licenses",
      "certificates"
    ]
  }
];

const SECTION_ALIAS_PAIRS = SECTION_DEFINITIONS.flatMap(({ key, aliases }) =>
  aliases
    .slice()
    .sort((first, second) => second.length - first.length)
    .map((alias) => ({ key, alias: alias.toLowerCase() }))
);

function cleanLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(
      (line) =>
        !/^[\-–—]{1,}\s*\d+\s+of\s+\d+\s*[\-–—]{1,}$/i.test(line)
    )
    .filter((line) => !/^page\s+\d+\s+of\s+\d+$/i.test(line))
    .filter(Boolean);
}

function normalizedTextLength(value) {
  return String(value || "").replace(/\s+/g, "").length;
}

async function extractTextFromAllPages(pdfBuffer) {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    let info = null;
    try {
      info = await parser.getInfo();
    } catch (_error) {
      info = null;
    }
    const totalPages = Number(info?.total || 0);

    const defaultParseResult = await parser.getText({ pageJoiner: "\n" });
    let text = String(defaultParseResult?.text || "");

    if (totalPages > 1) {
      const pageTexts = [];

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        const pageResult = await parser.getText({
          partial: [pageNumber],
          pageJoiner: "\n"
        });

        const pageText = String(pageResult?.text || "").trim();
        if (pageText) {
          pageTexts.push(pageText);
        }
      }

      const mergedPageText = pageTexts.join("\n\n").trim();
      if (
        mergedPageText &&
        normalizedTextLength(mergedPageText) >= normalizedTextLength(text) * 0.9
      ) {
        text = mergedPageText;
      }
    }

    return {
      text,
      totalPages: totalPages || 1
    };
  } finally {
    await parser.destroy();
  }
}

function normalizeHeadingCandidate(line) {
  return String(line || "")
    .replace(/[:\-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeInlineHeadingCandidate(line) {
  const clean = normalizeHeadingCandidate(line);
  if (!clean || clean.length > 90) return false;

  const words = clean.split(/\s+/).filter(Boolean);
  if (!words.length) return false;

  const uppercaseLikeWords = words.filter(
    (word) => word.toUpperCase() === word
  ).length;
  const uppercaseRatio = uppercaseLikeWords / words.length;

  return uppercaseRatio >= 0.6 || words.length <= 5;
}

function detectSectionStart(line) {
  const candidate = normalizeHeadingCandidate(line);
  const lowered = candidate.toLowerCase();

  for (const { key, alias } of SECTION_ALIAS_PAIRS) {
    const exactMatch = lowered === alias;
    const punctuatedMatch =
      lowered.startsWith(`${alias}:`) ||
      lowered.startsWith(`${alias} -`) ||
      lowered.startsWith(`${alias} |`) ||
      lowered.startsWith(`${alias} —`) ||
      lowered.startsWith(`${alias} –`);
    const inlineMatch =
      lowered.startsWith(`${alias} `) && looksLikeInlineHeadingCandidate(candidate);

    if (!exactMatch && !punctuatedMatch && !inlineMatch) {
      continue;
    }

    const remainder = candidate
      .slice(alias.length)
      .replace(/^[:\-–—|.\s]+/, "")
      .trim();

    return {
      key,
      remainder
    };
  }

  return null;
}

function splitSections(lines) {
  const sections = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: []
  };

  let currentKey = "header";

  lines.forEach((line) => {
    const detected = detectSectionStart(line);
    if (detected) {
      currentKey = detected.key;
      if (detected.remainder) {
        sections[currentKey].push(detected.remainder);
      }
      return;
    }

    sections[currentKey].push(line);
  });

  return sections;
}

function extractEmail(text) {
  const match = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "candidate@example.com";
}

function extractPhone(text) {
  const match = String(text || "").match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function extractUrls(text) {
  const rawMatches = String(text || "").match(/https?:\/\/[^\s)]+/gi) || [];
  return [...new Set(rawMatches)].map((url, index) => ({
    label: `Link ${index + 1}`,
    url
  }));
}

function isLikelyName(line) {
  if (!line || line.length < 3 || line.length > 70) return false;
  if (/\d/.test(line)) return false;
  if (/@|https?:\/\//i.test(line)) return false;

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;

  return words.every((word) => /^[A-Za-z.'-]+$/.test(word));
}

function isBulletLine(line) {
  return /^[-*•]\s+/.test(line);
}

function sanitizeBullet(line) {
  return String(line || "")
    .replace(/^[-*•]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSentence(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";

  const sentence = clean[0].toUpperCase() + clean.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function clip(text, maxLength = 420) {
  const clean = String(text || "").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function stableHash(text) {
  const input = String(text || "");
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function looksLikeInstitutionToken(value) {
  return /\b(university|college|institute|school|academy|polytechnic|campus|faculty)\b/i.test(
    String(value || "")
  );
}

function looksLikeDegreeToken(value) {
  return /\b(bachelor|master|mba|ph\.?d|doctorate|diploma|b\.?tech|m\.?tech|b\.?e|m\.?e|bsc|msc|bca|mca|associate|hsc|ssc|intermediate|higher secondary|certificate|certification|postgraduate|undergraduate)\b/i.test(
    String(value || "")
  );
}

function extractYearsFromText(value) {
  let clean = String(value || "").replace(/\s+/g, " ").trim();
  let startYear = null;
  let endYear = null;

  const rangeMatch = clean.match(/\b((?:19|20)\d{2})\b\s*(?:-|–|—|to)\s*(present|current|((?:19|20)\d{2}))\b/i);
  if (rangeMatch) {
    startYear = Number(rangeMatch[1]);
    if (rangeMatch[3]) {
      endYear = Number(rangeMatch[3]);
    }

    clean = clean.replace(rangeMatch[0], " ").replace(/\s+/g, " ").trim();
  } else {
    const singleYearMatch = clean.match(/\b((?:19|20)\d{2})\b/);
    if (singleYearMatch) {
      endYear = Number(singleYearMatch[1]);
      clean = clean
        .replace(singleYearMatch[0], " ")
        .replace(/\(\s*\)/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return {
    text: clean,
    startYear,
    endYear
  };
}

function splitDegreeField(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return {
      degree: "",
      field: ""
    };
  }

  const inMatch = clean.match(/^(.*?)(?:\s+in\s+)(.+)$/i);
  if (inMatch) {
    return {
      degree: inMatch[1].trim(),
      field: inMatch[2].trim()
    };
  }

  return {
    degree: clean,
    field: ""
  };
}

function normalizeEducationSourceLines(lines) {
  const source = Array.isArray(lines) ? lines : [];

  return source
    .map((line) => (isBulletLine(line) ? sanitizeBullet(line) : String(line || "")))
    .flatMap((line) =>
      line
        .split(/\s*[;•]\s*/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
    .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseEducationLine(line) {
  const clean = String(line || "")
    .replace(/^(education|qualifications?)\s*[:\-]/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return null;
  }

  const years = extractYearsFromText(clean);
  const textWithoutYears = years.text.replace(/\s+/g, " ").trim();

  if (!textWithoutYears) {
    return {
      institution: "",
      degree: "",
      field: "",
      startYear: years.startYear,
      endYear: years.endYear
    };
  }

  const segments = textWithoutYears
    .split(/\s*\|\s*|\s[-–—]\s|\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  let institution = "";
  let degree = "";
  let field = "";

  if (segments.length > 1) {
    const institutionIndex = segments.findIndex((segment) => looksLikeInstitutionToken(segment));
    const degreeIndex = segments.findIndex((segment) => looksLikeDegreeToken(segment));

    if (institutionIndex >= 0) {
      institution = segments[institutionIndex];
    }

    if (degreeIndex >= 0) {
      const parsedDegree = splitDegreeField(segments[degreeIndex]);
      degree = parsedDegree.degree;
      field = parsedDegree.field;
    }

    if (!institution && degreeIndex === 0 && segments[1]) {
      institution = segments[1];
    }

    if (!degree && institutionIndex === 0 && segments[1]) {
      const parsedDegree = splitDegreeField(segments[1]);
      degree = parsedDegree.degree;
      field = parsedDegree.field;
    }

    if (!institution && !degree) {
      institution = segments[0];
      const parsedDegree = splitDegreeField(segments[1] || "");
      degree = parsedDegree.degree;
      field = parsedDegree.field;
    }
  } else {
    const token = segments[0];
    if (looksLikeInstitutionToken(token)) {
      institution = token;
    } else if (looksLikeDegreeToken(token)) {
      const parsedDegree = splitDegreeField(token);
      degree = parsedDegree.degree;
      field = parsedDegree.field;
    } else {
      institution = token;
    }
  }

  return {
    institution: clip(institution, 120),
    degree: clip(degree, 120),
    field: clip(field, 120),
    startYear: years.startYear,
    endYear: years.endYear
  };
}

function parseCertificationChunk(chunk) {
  if (!chunk) return null;

  let name = String(chunk || "")
    .replace(/^(certification|certificate|license|credentials?)\s*[:\-]\s*/i, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return null;

  let issuer = "";
  let year = null;

  const yearMatch = name.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    year = Number(yearMatch[0]);
    name = name.replace(yearMatch[0], " ").replace(/\s+/g, " ").trim();
  }

  const byMatch = name.match(/^(.*?)(?:\s+(?:issued\s+by|by|from)\s+)(.+)$/i);
  if (byMatch) {
    name = byMatch[1].trim();
    issuer = byMatch[2].trim();
  } else {
    const separatorMatch = name.match(/^(.*?)\s(?:—|–|-|\|)\s(.+)$/);
    if (separatorMatch) {
      name = separatorMatch[1].trim();
      issuer = separatorMatch[2].trim();
    }
  }

  name = name.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  issuer = issuer.replace(/[()]/g, "").replace(/\s+/g, " ").trim();

  if (!name || name.length < 3) {
    return null;
  }

  if (/^(issued|completed|credential|license)$/i.test(name)) {
    return null;
  }

  return {
    name: clip(name, 90),
    issuer: clip(issuer, 90),
    year
  };
}

function extractSkills(lines) {
  const tokens = lines
    .flatMap((line) => line.split(/[|,;/]/))
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter((item) => item && item.length <= 40 && !/^\d+$/.test(item));

  const unique = [];
  tokens.forEach((token) => {
    const exists = unique.some((item) => item.toLowerCase() === token.toLowerCase());
    if (!exists) {
      unique.push(token);
    }
  });

  return unique.slice(0, 18);
}

function parseRoleAndCompany(line) {
  const clean = line.replace(/\s+/g, " ").trim();

  const stripDates = (value) =>
    String(value || "")
      .replace(
        /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*(?:-|–|—|to)\s*(?:present|current|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})\b/gi,
        ""
      )
      .replace(/\b(19|20)\d{2}\s*(?:-|–|—|to)\s*(?:present|current|(19|20)\d{2})\b/gi, "")
      .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\b$/gi, "")
      .replace(/\b(19|20)\d{2}\b$/g, "")
      .replace(/\s+\|\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();

  if (clean.includes("|")) {
    const [role, company] = clean.split("|").map((part) => part.trim());
    return {
      role: stripDates(role) || "Professional",
      company: stripDates(company) || ""
    };
  }

  if (/\sat\s/i.test(clean)) {
    const [role, company] = clean.split(/\sat\s/i).map((part) => part.trim());
    return {
      role: stripDates(role) || "Professional",
      company: stripDates(company) || ""
    };
  }

  if (clean.includes(" - ") || clean.includes(" — ") || clean.includes(" – ")) {
    const [role, company] = clean.split(/\s[-–—]\s/).map((part) => part.trim());
    return {
      role: stripDates(role) || "Professional",
      company: stripDates(company) || ""
    };
  }

  return {
    role: stripDates(clean) || "Professional",
    company: ""
  };
}

function looksLikeRoleHeader(line) {
  if (!line || isBulletLine(line)) return false;
  const clean = line.replace(/\s+/g, " ").trim();
  const stripped = clean.replace(/\s+\|\s*$/, "").trim();
  if (!stripped || stripped.length > 120) return false;
  if (/[.!?]$/.test(stripped)) return false;
  if (stripped.split(/\s+/).length > 18) return false;

  if (
    /\b(summary|experience|education|skills|projects|certifications?|responsibilities|achievements|tasks|template)\b/i.test(
      stripped
    ) &&
    stripped.split(/\s+/).length <= 4
  ) {
    return false;
  }

  const hasSeparator = /\||\sat\s| - | — | – /.test(stripped);
  const hasRoleKeyword =
    /\b(intern|engineer|developer|manager|analyst|specialist|associate|consultant|lead|architect|administrator|designer|officer|director|scientist|tester|qa|sdet)\b/i.test(
      stripped
    );

  return hasSeparator || hasRoleKeyword;
}

function looksLikeProjectHeader(line) {
  if (!line || isBulletLine(line)) return false;

  const clean = normalizeHeadingCandidate(String(line || "").replace(/^\d+[.)]\s*/, ""));
  if (!clean || clean.length < 3 || clean.length > 95) return false;
  if (/[.!?]$/.test(clean)) return false;

  if (/\b(summary|experience|education|skills|certifications?)\b/i.test(clean)) {
    return false;
  }

  if (/^(tech|stack|technologies|tools)\s*[:\-]/i.test(clean)) {
    return false;
  }

  return (
    /\b(project|platform|application|dashboard|portal|system|website|tool|api|engine|highlight)\b/i.test(
      clean
    ) || /\|| - | — | – /.test(clean)
  );
}

function parseStackTokens(text) {
  const clean = String(text || "")
    .replace(/^(tech|stack|technologies|tools)\s*[:\-]\s*/i, "")
    .replace(/[.]$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return [];

  const parts = clean
    .split(/[|,;/·]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const unique = [];
  parts.forEach((token) => {
    const normalized = token.replace(/\s+/g, " ").trim();
    if (!normalized) return;
    if (normalized.length > 40) return;
    if (/^(and|with|ready)$/i.test(normalized)) return;

    const exists = unique.some(
      (item) => item.toLowerCase() === normalized.toLowerCase()
    );
    if (!exists) {
      unique.push(normalized);
    }
  });

  return unique.slice(0, 12);
}

function parseProjectHeader(line, fallbackIndex) {
  const clean = normalizeHeadingCandidate(
    String(line || "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^(project|capstone|thesis|assignment)\s*[:\-]\s*/i, "")
  );
  if (!clean) {
    return {
      name: `Imported Project ${fallbackIndex}`,
      stack: []
    };
  }

  const match = clean.match(/^(.*?)\s(?:—|–|-|\|)\s(.+)$/);
  if (match) {
    const name = clip(match[1].trim(), 90) || `Imported Project ${fallbackIndex}`;
    const stack = parseStackTokens(match[2]);
    return { name, stack };
  }

  if (clean.includes("|")) {
    const [name, stackText] = clean.split("|").map((part) => part.trim());
    return {
      name: clip(name, 90) || `Imported Project ${fallbackIndex}`,
      stack: parseStackTokens(stackText)
    };
  }

  if (clean.includes(" - ") || clean.includes(" — ") || clean.includes(" – ")) {
    const [name, stackText] = clean.split(/\s[-–—]\s/).map((part) => part.trim());
    return {
      name: clip(name, 90) || `Imported Project ${fallbackIndex}`,
      stack: parseStackTokens(stackText)
    };
  }

  return {
    name: clip(clean, 90),
    stack: []
  };
}

function startsWithProjectActionVerb(text) {
  const firstToken = normalizeHeadingCandidate(String(text || ""))
    .split(/\s+/)
    .map((token) => token.replace(/[^A-Za-z]/g, ""))
    .find(Boolean);

  if (!firstToken) return false;

  return /^(built|developed|designed|implemented|simulated|identified|improved|achieved|validated|maintained|increased|reduced|optimized|tested|testing|created|delivered|managed|led|collaborated|worked|drove|driven|resolved|engineered|integrated|deployed|migrated|automated|ensured)$/i.test(
    firstToken
  );
}

function isLikelyProjectTitleText(text, options = {}) {
  const maxWords = Number.isFinite(options.maxWords) ? options.maxWords : 9;
  const clean = normalizeHeadingCandidate(String(text || "").replace(/^\d+[.)]\s*/, ""));
  if (!clean || clean.length < 3 || clean.length > 95) return false;
  if (/[.!?]$/.test(clean)) return false;
  if (/[,;]/.test(clean)) return false;

  if (/^(tech|stack|technologies|tools|responsibilities|achievements?|description)\b/i.test(clean)) {
    return false;
  }

  if (/\b(summary|experience|education|skills|certifications?)\b/i.test(clean)) {
    return false;
  }

  if (startsWithProjectActionVerb(clean)) {
    return false;
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > maxWords) return false;

  const connectorWords = new Set(["and", "of", "for", "to", "in", "on", "with", "the", "a", "an", "&"]);
  const meaningfulWords = words.filter((word) => {
    const token = word.replace(/[^A-Za-z0-9+#./-]/g, "");
    return token && !connectorWords.has(token.toLowerCase());
  });
  if (!meaningfulWords.length) return false;

  if (meaningfulWords.length === 1) {
    return meaningfulWords[0].replace(/[^A-Za-z0-9+#./-]/g, "").length >= 3;
  }

  if (meaningfulWords.length <= 3) {
    return true;
  }

  const titleLikeCount = meaningfulWords.filter((word) => {
    const token = word.replace(/[^A-Za-z0-9+#./-]/g, "");
    if (!token) return false;
    return /^[A-Z0-9]/.test(token) || /[a-z][A-Z]/.test(token);
  }).length;

  return titleLikeCount >= Math.ceil(meaningfulWords.length * 0.6);
}

function splitProjectBulletHeader(line) {
  const clean = normalizeHeadingCandidate(String(line || "").replace(/^\d+[.)]\s*/, ""));
  if (!clean) {
    return null;
  }

  const hasStrongSeparator = /\||\s[-–—]\s/.test(clean);
  const startsWithProjectLabel = /^(project|capstone|thesis|assignment)\b/i.test(clean);
  const colonIndex = clean.indexOf(":");
  const hasHeaderColon = colonIndex > 2 && colonIndex < 90;

  if (!hasStrongSeparator && !startsWithProjectLabel && !hasHeaderColon) {
    return null;
  }

  if (hasHeaderColon) {
    const header = clean.slice(0, colonIndex).trim();
    const detail = clean.slice(colonIndex + 1).trim();
    if (header && (startsWithProjectLabel || isLikelyProjectTitleText(header, { maxWords: 7 }))) {
      return {
        header,
        detail
      };
    }

    return null;
  }

  const separatorPrefix = clean.split(/\s(?:—|–|-|\|)\s/)[0]?.trim() || clean;
  if (!startsWithProjectLabel && !isLikelyProjectTitleText(separatorPrefix, { maxWords: 7 })) {
    return null;
  }

  return {
    header: clean,
    detail: ""
  };
}

function looksLikeStandaloneProjectBulletTitle(line) {
  return isLikelyProjectTitleText(line, { maxWords: 6 });
}

function looksLikePlainProjectTitle(line) {
  return isLikelyProjectTitleText(line, { maxWords: 8 });
}

function buildExperience(sectionLines, fallbackTitle, globalBullets) {
  const lines = Array.isArray(sectionLines) ? sectionLines : [];
  const entries = [];
  let current = null;

  lines.forEach((line) => {
    if (isBulletLine(line)) {
      if (!current) {
        current = {
          id: `exp-${entries.length + 1}`,
          company: "",
          role: fallbackTitle || "Professional Experience",
          location: "",
          bullets: []
        };
        entries.push(current);
      }

      const cleanBullet = sanitizeBullet(line);
      if (cleanBullet) {
        current.bullets.push(normalizeSentence(cleanBullet));
      }
      return;
    }

    if (looksLikeRoleHeader(line)) {
      const parsed = parseRoleAndCompany(line);
      current = {
        id: `exp-${entries.length + 1}`,
        company: parsed.company,
        role: parsed.role,
        location: "",
        bullets: []
      };
      entries.push(current);
      return;
    }

    if (current && line.length >= 20 && current.bullets.length < 5) {
      current.bullets.push(normalizeSentence(line));
    }
  });

  const trimmedEntries = entries
    .map((entry) => ({
      ...entry,
      bullets: (entry.bullets || []).filter(Boolean).slice(0, 6)
    }))
    .filter((entry) => entry.role || entry.company || entry.bullets.length);

  if (trimmedEntries.length) {
    return trimmedEntries;
  }

  return [
    {
      id: "exp-1",
      company: "",
      role: fallbackTitle || "Professional Experience",
      location: "",
      bullets: globalBullets.slice(0, 4)
    }
  ];
}

function buildEducation(lines) {
  const educationLines = normalizeEducationSourceLines(lines);
  if (!educationLines.length) {
    return [];
  }

  const entries = [];
  let current = null;

  educationLines.forEach((line) => {
    const parsed = parseEducationLine(line);
    if (!parsed) {
      return;
    }

    const hasInstitution = Boolean(parsed.institution);
    const hasDegree = Boolean(parsed.degree);
    const startsNewEntry =
      hasInstitution &&
      current &&
      Boolean(current.institution);

    if (!current || startsNewEntry) {
      current = {
        id: `edu-${entries.length + 1}`,
        institution: "",
        degree: "",
        field: "",
        startYear: null,
        endYear: null,
        highlights: []
      };
      entries.push(current);
    }

    if (hasInstitution && !current.institution) {
      current.institution = parsed.institution;
    }

    if (hasDegree && !current.degree) {
      current.degree = parsed.degree;
    }

    if (parsed.field && !current.field) {
      current.field = parsed.field;
    }

    if (typeof parsed.startYear === "number" && !current.startYear) {
      current.startYear = parsed.startYear;
    }

    if (typeof parsed.endYear === "number" && !current.endYear) {
      current.endYear = parsed.endYear;
    }

    if (
      !hasInstitution &&
      !hasDegree &&
      line.length > 8 &&
      current.highlights.length < 2
    ) {
      current.highlights.push(normalizeSentence(line));
    }
  });

  return entries
    .filter(
      (entry) =>
        entry.institution ||
        entry.degree ||
        entry.field ||
        entry.startYear ||
        entry.endYear
    )
    .slice(0, 8);
}

function buildProjects(lines, globalBullets) {
  const projectLines = Array.isArray(lines) ? lines : [];
  if (!projectLines.length) return [];

  const entries = [];
  let current = null;

  projectLines.forEach((line) => {
    const cleanLine = normalizeHeadingCandidate(line);
    if (!cleanLine || /^template\s*:/i.test(cleanLine)) {
      return;
    }

    if (
      !current &&
      /\b(highlights?|overview|selected\s+work|sdet-relevant|relevant)\b/i.test(
        cleanLine
      ) &&
      cleanLine.split(/\s+/).length <= 5
    ) {
      return;
    }

    if (isBulletLine(line)) {
      const cleanBullet = sanitizeBullet(line);
      const parsedBulletHeader = splitProjectBulletHeader(cleanBullet);
      const currentHasContent =
        Boolean(current) &&
        (Boolean(String(current.name || "").trim().replace(/^Imported Project\s+\d+$/i, "")) ||
          (Array.isArray(current.stack) && current.stack.length > 0) ||
          (Array.isArray(current.bullets) && current.bullets.length > 0));

      if (parsedBulletHeader) {
        const nextIndex = entries.length + 1;
        const parsedHeader = parseProjectHeader(parsedBulletHeader.header, nextIndex);

        current = {
          id: `proj-${nextIndex}`,
          name: parsedHeader.name,
          stack: parsedHeader.stack,
          bullets: [],
          link: ""
        };
        entries.push(current);

        if (parsedBulletHeader.detail) {
          const detailBullet = normalizeSentence(parsedBulletHeader.detail);
          if (detailBullet) {
            current.bullets.push(detailBullet);
          }
        }

        return;
      }

      if ((!current || currentHasContent) && looksLikeStandaloneProjectBulletTitle(cleanBullet)) {
        const nextIndex = entries.length + 1;
        const parsedHeader = parseProjectHeader(cleanBullet, nextIndex);
        current = {
          id: `proj-${nextIndex}`,
          name: parsedHeader.name,
          stack: parsedHeader.stack,
          bullets: [],
          link: ""
        };
        entries.push(current);
        return;
      }

      if (!current) {
        current = {
          id: `proj-${entries.length + 1}`,
          name: `Imported Project ${entries.length + 1}`,
          stack: [],
          bullets: [],
          link: ""
        };
        entries.push(current);
      }

      const bullet = normalizeSentence(cleanBullet);
      if (bullet) {
        current.bullets.push(bullet);
      }
      return;
    }

    const maybeStackTokens = parseStackTokens(cleanLine);
    const looksLikeProse =
      /\b(built|designed|implemented|simulated|identified|improved|achieved|validated|maintained|increased|reduced|developed|created|optimized|tested|testing|shipping)\b/i.test(
        cleanLine
      );
    const hasStrongStackSeparator =
      cleanLine.split(/[|;/·]+/).filter(Boolean).length >= 2;
    const looksLikeStackContinuation =
      current &&
      current.stack.length > 0 &&
      cleanLine.length <= 28 &&
      maybeStackTokens.length > 0 &&
      maybeStackTokens.length <= 3;
    const canAttachAsStack =
      Boolean(current) &&
      maybeStackTokens.length > 0 &&
      !looksLikeProse &&
      (/^(tech|stack|technologies|tools)\b/i.test(cleanLine) ||
        hasStrongStackSeparator ||
        looksLikeStackContinuation);

    if (canAttachAsStack && maybeStackTokens.length) {
      current.stack = [...new Set([...(current.stack || []), ...maybeStackTokens])].slice(
        0,
        12
      );
      return;
    }

    const currentHasContent =
      Boolean(current) &&
      (Boolean(String(current.name || "").trim().replace(/^Imported Project\s+\d+$/i, "")) ||
        Array.isArray(current.stack) && current.stack.length > 0 ||
        Array.isArray(current.bullets) && current.bullets.length > 0);

    const startsNextProject = !current ||
      looksLikeProjectHeader(line) ||
      (currentHasContent && looksLikePlainProjectTitle(line));

    if (startsNextProject) {
      const nextIndex = entries.length + 1;
      const parsedHeader = parseProjectHeader(line, nextIndex);
      current = {
        id: `proj-${nextIndex}`,
        name: parsedHeader.name,
        stack: parsedHeader.stack,
        bullets: [],
        link: ""
      };
      entries.push(current);
      return;
    }

    if (current && cleanLine.length >= 20 && current.bullets.length < 5) {
      current.bullets.push(normalizeSentence(cleanLine));
    }
  });

  const normalizedEntries = entries
    .map((entry) => ({
      ...entry,
      bullets: Array.isArray(entry.bullets)
        ? entry.bullets.filter(Boolean).slice(0, 4)
        : []
    }))
    .filter((entry) => entry.name || entry.bullets.length)
    .map((entry, index) => ({
      ...entry,
      id: entry.id || `proj-${index + 1}`,
      name: clip(entry.name || `Imported Project ${index + 1}`, 90),
      bullets: entry.bullets.length ? entry.bullets : globalBullets.slice(0, 2)
    }));

  return normalizedEntries;
}

function buildCertifications(lines) {
  const sourceLines = Array.isArray(lines) ? lines : [];
  const collected = [];

  sourceLines.forEach((line) => {
    const cleanLine = (isBulletLine(line) ? sanitizeBullet(line) : String(line || ""))
      .replace(/^certifications?\s*[:\-]\s*/i, "")
      .trim();
    if (!cleanLine) return;

    const chunks = cleanLine
      .split(/\s*[|;•]\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

    (chunks.length ? chunks : [cleanLine]).forEach((chunk) => {
      const parsed = parseCertificationChunk(chunk);
      if (!parsed) return;

      const exists = collected.some((item) => {
        const sameName = item.name.toLowerCase() === parsed.name.toLowerCase();
        const sameIssuer =
          String(item.issuer || "").toLowerCase() ===
          String(parsed.issuer || "").toLowerCase();
        return sameName && sameIssuer;
      });
      if (exists) return;

      collected.push({
        id: `cert-${collected.length + 1}`,
        name: parsed.name,
        issuer: parsed.issuer,
        year: parsed.year
      });
    });
  });

  return collected.slice(0, 12);
}

function inferPdfTemplateDetection({ lines, sections, text }) {
  const normalizedText = String(text || "").toLowerCase();
  const lineSample = (Array.isArray(lines) ? lines : []).slice(0, 120);
  const pipeCount = lineSample.filter((line) => line.includes("|")).length;
  const dateRangeCount =
    String(text || "").match(
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b\.?\s+\d{4}|\b(19|20)\d{2}\b/gi
    )?.length || 0;
  const uppercaseHeadlineCount = lineSample.filter(
    (line) => line.length >= 5 && line.length <= 40 && line === line.toUpperCase()
  ).length;

  let templateId = "classic";
  let layout = "classic";
  let confidence = 0.64;

  if (/\b(board|executive\s+summary|leadership|director|vp|head\s+of)\b/i.test(normalizedText)) {
    templateId = "boardroom-impact";
    layout = "boardroom";
    confidence = 0.86;
  } else if (/\b(strategy|roadmap|portfolio|transformation)\b/i.test(normalizedText)) {
    templateId = "strategy-lead";
    layout = "strategy";
    confidence = 0.8;
  } else if (dateRangeCount >= 8 || /employment\s+history|chronological/i.test(normalizedText)) {
    templateId = "timeline-focus";
    layout = "timeline";
    confidence = 0.76;
  } else if (pipeCount >= 10) {
    templateId = "corporate-clarity";
    layout = "corporate";
    confidence = 0.74;
  } else if (uppercaseHeadlineCount >= 7) {
    templateId = "compact";
    layout = "compact";
    confidence = 0.69;
  } else if (/\b(creative|portfolio|behance|dribbble)\b/i.test(normalizedText)) {
    templateId = "creative-balance";
    layout = "creative";
    confidence = 0.7;
  }

  const sectionSignature = [
    ...(sections.summary || []).slice(0, 2),
    ...(sections.experience || []).slice(0, 2),
    ...(sections.projects || []).slice(0, 2)
  ]
    .join("|")
    .slice(0, 280);

  const signalSignature = `${pipeCount}|${dateRangeCount}|${uppercaseHeadlineCount}|${lineSample.length}`;
  const signature = stableHash(`${layout}|${templateId}|${sectionSignature}|${signalSignature}`);
  const customTemplateId = `imported-${signature}`;
  const layoutDisplayName = layout
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    templateId: null,
    layout,
    confidence,
    isCustom: true,
    signature,
    customTemplateId,
    displayName: `Imported ${layoutDisplayName} Layout`,
    description: "Detected from uploaded resume layout and saved as a new custom mini-card template.",
    metaTemplateId: templateId
  };
}

function collectFallbackProjectLines(lines) {
  const sourceLines = Array.isArray(lines) ? lines : [];
  const collected = [];
  let inProjectBlock = false;

  sourceLines.forEach((line) => {
    const clean = normalizeHeadingCandidate(line);
    if (!clean) {
      return;
    }

    const detected = detectSectionStart(line);
    if (detected) {
      if (detected.key === "projects") {
        inProjectBlock = true;
        if (detected.remainder) {
          collected.push(detected.remainder);
        }
      } else if (inProjectBlock) {
        inProjectBlock = false;
      }

      return;
    }

    if (
      !inProjectBlock &&
      /\b(project|capstone)\b/i.test(clean) &&
      looksLikeInlineHeadingCandidate(clean)
    ) {
      inProjectBlock = true;

      const remainder = clean
        .replace(
          /^(selected|key|major|relevant|notable|professional|academic|internship)?\s*projects?\s*[:\-–—|]?\s*/i,
          ""
        )
        .trim();

      if (remainder && remainder.toLowerCase() !== clean.toLowerCase()) {
        collected.push(remainder);
      }

      return;
    }

    if (inProjectBlock) {
      collected.push(line);
    }
  });

  return collected;
}

function buildSummary(sectionSummaryLines, headerLines, fallbackBullets) {
  const summarySource = sectionSummaryLines.length
    ? sectionSummaryLines
    : headerLines.filter((line) => line.length > 40 && !/@|https?:\/\//i.test(line));

  if (summarySource.length) {
    return clip(normalizeSentence(summarySource.slice(0, 3).join(" ")), 420);
  }

  if (fallbackBullets.length) {
    return clip(normalizeSentence(fallbackBullets.slice(0, 2).join(" ")), 420);
  }

  return "";
}

async function parseResumeFromPdfBuffer(pdfBuffer) {
  const extracted = await extractTextFromAllPages(pdfBuffer);
  const text = extracted?.text || "";
  const lines = cleanLines(text);
  const sections = splitSections(lines);

  const fullText = lines.join("\n");
  const email = extractEmail(fullText);
  const phone = extractPhone(fullText);
  const links = extractUrls(fullText);

  const headerLines = sections.header || [];
  const fullName = headerLines.find((line) => isLikelyName(line)) || "";
  const title =
    headerLines.find((line) => line !== fullName && line.length >= 3 && line.length <= 80 && !/@|https?:\/\//i.test(line)) ||
    "";

  const location =
    headerLines.find((line) => {
      if (line === fullName || line === title) return false;
      if (/@|https?:\/\//i.test(line)) return false;
      return /,/.test(line) || /\b(india|usa|uk|australia|canada|city|remote)\b/i.test(line);
    }) || "";

  const globalBullets = lines
    .filter((line) => isBulletLine(line))
    .map((line) => normalizeSentence(sanitizeBullet(line)))
    .filter(Boolean);

  const skills = extractSkills(sections.skills || []);
  const summary = buildSummary(sections.summary || [], headerLines, globalBullets);
  const experience = buildExperience(sections.experience || [], title, globalBullets);
  const education = buildEducation(sections.education || []);
  const projectSourceLines =
    Array.isArray(sections.projects) && sections.projects.length
      ? sections.projects
      : collectFallbackProjectLines(lines);
  const projects = buildProjects(projectSourceLines, globalBullets);
  const certifications = buildCertifications(sections.certifications || []);

  const resumeData = normalizeResumeInput({
    schemaVersion: "1.0",
    profile: {
      fullName,
      title,
      email,
      phone,
      location,
      summary,
      links
    },
    experience,
    education,
    projects,
    skills: [
      {
        category: "Core Skills",
        items: skills
      }
    ],
    certifications
  });

  const templateDetection = inferPdfTemplateDetection({
    lines,
    sections,
    text
  });

  return {
    resumeData,
    templateDetection
  };
}

module.exports = {
  parseResumeFromPdfBuffer
};