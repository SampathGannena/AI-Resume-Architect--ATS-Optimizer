const { extractRankedKeywordsFromJobDescription } = require("./atsAnalyzer");

const COVER_LETTER_PROFILES = {
  general: {
    id: "general",
    name: "General Professional",
    description: "Balanced profile for most applications with concise impact and clarity.",
    promptProfile: {
      voice: "confident and clear",
      emphasis: ["business impact", "cross-functional execution", "role fit"]
    }
  },
  engineering: {
    id: "engineering",
    name: "Engineering Impact",
    description: "Technical profile focused on reliability, scalability, and delivery outcomes.",
    promptProfile: {
      voice: "technical and outcome-oriented",
      emphasis: ["systems", "automation", "quality", "performance"]
    }
  },
  product: {
    id: "product",
    name: "Product Strategy",
    description: "Profile oriented around roadmap ownership, user value, and measurable growth.",
    promptProfile: {
      voice: "strategic and customer-centric",
      emphasis: ["roadmap", "stakeholders", "experiments", "business impact"]
    }
  },
  data: {
    id: "data",
    name: "Data and Analytics",
    description: "Profile for analytics and data roles focused on decisions, insights, and efficiency.",
    promptProfile: {
      voice: "analytical and precise",
      emphasis: ["insights", "data quality", "decision support", "measurement"]
    }
  }
};

function coerceArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function dedupeByLowercase(values) {
  const seen = new Set();
  const unique = [];

  coerceArray(values).forEach((item) => {
    const normalized = normalizeText(item);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    unique.push(normalized);
  });

  return unique;
}

function collectHighlights(resumeData, maxItems = 2) {
  const highlights = [];

  coerceArray(resumeData?.experience).forEach((entry) => {
    coerceArray(entry?.bullets).forEach((bullet) => {
      const normalized = normalizeText(bullet);
      if (!normalized) return;
      highlights.push(normalized);
    });
  });

  if (!highlights.length) {
    coerceArray(resumeData?.projects).forEach((entry) => {
      coerceArray(entry?.bullets).forEach((bullet) => {
        const normalized = normalizeText(bullet);
        if (!normalized) return;
        highlights.push(normalized);
      });
    });
  }

  return dedupeByLowercase(highlights).slice(0, Math.max(1, maxItems));
}

function collectSkills(resumeData, maxItems = 6) {
  const allSkills = [];

  coerceArray(resumeData?.skills).forEach((group) => {
    coerceArray(group?.items).forEach((item) => {
      const normalized = normalizeText(item);
      if (!normalized) return;
      allSkills.push(normalized);
    });
  });

  return dedupeByLowercase(allSkills).slice(0, Math.max(1, maxItems));
}

function inferProfileId({ jobDescription = "", explicitProfileId = "" } = {}) {
  const requested = normalizeText(explicitProfileId).toLowerCase();
  if (requested && COVER_LETTER_PROFILES[requested]) {
    return requested;
  }

  const normalized = normalizeText(jobDescription).toLowerCase();
  if (!normalized) return "general";

  if (/software|engineer|developer|backend|frontend|full stack|platform/.test(normalized)) {
    return "engineering";
  }

  if (/product|roadmap|stakeholder|go-to-market|gtm/.test(normalized)) {
    return "product";
  }

  if (/analytics|data|sql|warehouse|insight|machine learning|ml|ai/.test(normalized)) {
    return "data";
  }

  return "general";
}

function summarizeJobDescription(jobDescription = "", maxWords = 28) {
  const words = normalizeText(jobDescription).split(" ").filter(Boolean);
  if (!words.length) {
    return "the role requirements";
  }

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}...`;
}

function sentenceCase(text) {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  return normalized[0].toUpperCase() + normalized.slice(1);
}

function trimToWordLimit(text, maxWords) {
  const normalized = normalizeText(text);
  const safeLimit = Number.isFinite(Number(maxWords))
    ? Math.max(120, Math.min(450, Number(maxWords)))
    : 280;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= safeLimit) {
    return {
      text: normalized,
      wordCount: words.length,
      truncated: false
    };
  }

  const trimmed = `${words.slice(0, safeLimit).join(" ")}...`;
  return {
    text: trimmed,
    wordCount: safeLimit,
    truncated: true
  };
}

function buildGreeting(hiringManagerName) {
  const normalizedName = normalizeText(hiringManagerName);
  if (normalizedName) {
    return `Dear ${normalizedName},`;
  }

  return "Dear Hiring Team,";
}

function listCoverLetterProfiles() {
  return Object.values(COVER_LETTER_PROFILES).map((profile) => ({
    id: profile.id,
    name: profile.name,
    description: profile.description,
    promptProfile: profile.promptProfile
  }));
}

function generateCoverLetter({
  resumeData,
  jobDescription,
  companyName,
  hiringManagerName,
  tone,
  profileId,
  maxWords
}) {
  const safeResume = resumeData || {};
  const safeProfile = safeResume.profile || {};
  const selectedProfileId = inferProfileId({
    jobDescription,
    explicitProfileId: profileId
  });
  const selectedProfile = COVER_LETTER_PROFILES[selectedProfileId] || COVER_LETTER_PROFILES.general;

  const rankedKeywords = extractRankedKeywordsFromJobDescription(jobDescription || "", 8);
  const topKeywords = dedupeByLowercase(rankedKeywords).slice(0, 5);

  const highlights = collectHighlights(safeResume, 2);
  const skills = collectSkills(safeResume, 6);
  const candidateName = normalizeText(safeProfile.fullName) || "the applicant";
  const candidateTitle = normalizeText(safeProfile.title) || "the role";
  const safeCompany = normalizeText(companyName) || "your organization";
  const jdSummary = summarizeJobDescription(jobDescription || "");
  const normalizedTone = normalizeText(tone).toLowerCase();

  const opening = sentenceCase(
    `${candidateName} is excited to apply for the ${candidateTitle} opportunity at ${safeCompany}. ` +
    `The role focus on ${jdSummary} strongly aligns with the candidate's recent delivery work.`
  );

  const highlightSentence = highlights.length
    ? `Recent impact includes ${highlights.join("; ")}.`
    : "Recent work has emphasized measurable outcomes, delivery quality, and cross-team execution.";

  const keywordSentence = topKeywords.length
    ? `The background aligns with critical priorities such as ${topKeywords.join(", ")}.`
    : "The background aligns with the required technical and collaboration priorities from the job description.";

  const skillSentence = skills.length
    ? `Core capabilities include ${skills.join(", ")}, with consistent focus on production quality and velocity.`
    : "Core capabilities include end-to-end ownership, pragmatic execution, and communication across stakeholders.";

  let closing = "Thank you for your time and consideration. I would welcome the opportunity to discuss how this experience can support your team goals.";
  if (normalizedTone.includes("direct") || normalizedTone.includes("assertive")) {
    closing = "Thank you for your consideration. I would value a conversation on how these outcomes can accelerate your current roadmap and delivery priorities.";
  }

  const body = [
    buildGreeting(hiringManagerName),
    "",
    opening,
    highlightSentence,
    keywordSentence,
    skillSentence,
    closing,
    "",
    "Sincerely,",
    candidateName
  ].join("\n");

  const trimmed = trimToWordLimit(body, maxWords);

  return {
    profileId: selectedProfile.id,
    profile: {
      id: selectedProfile.id,
      name: selectedProfile.name,
      description: selectedProfile.description,
      promptProfile: selectedProfile.promptProfile
    },
    tone: normalizedTone || "professional",
    keywordsUsed: topKeywords,
    sections: {
      opening,
      impact: highlightSentence,
      alignment: `${keywordSentence} ${skillSentence}`,
      closing
    },
    content: trimmed.text,
    wordCount: trimmed.wordCount,
    truncated: trimmed.truncated,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  listCoverLetterProfiles,
  generateCoverLetter
};
