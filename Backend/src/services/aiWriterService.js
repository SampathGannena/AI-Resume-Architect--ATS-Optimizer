const { extractRankedKeywordsFromJobDescription } = require("./atsAnalyzer");
const { rewriteBulletWithLlm } = require("./llmWriterClient");

const AUTHORITATIVE_VERBS = [
  "Led",
  "Spearheaded",
  "Delivered",
  "Optimized",
  "Engineered",
  "Directed",
  "Implemented",
  "Automated",
  "Reduced",
  "Improved",
  "Built",
  "Scaled"
];

const COMMON_MISSPELLINGS = {
  proffesional: "professional",
  acheived: "achieved",
  responsiblity: "responsibility",
  managment: "management",
  collabration: "collaboration",
  enviroment: "environment",
  succesful: "successful",
  comunication: "communication",
  experiance: "experience",
  technlogy: "technology"
};

const PROFESSIONAL_TERMS = [
  "optimized",
  "implemented",
  "delivered",
  "engineered",
  "automated",
  "stakeholder",
  "cross-functional",
  "scalable",
  "measurable",
  "impact"
];

const HEURISTIC_ENDINGS = [
  "with measurable delivery impact.",
  "to improve delivery speed and reliability.",
  "to support scalable cross-functional execution.",
  "while improving quality and stakeholder outcomes.",
  "to strengthen performance and operational efficiency."
];

const BULLET_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "using",
  "use",
  "used",
  "through",
  "across",
  "within",
  "into",
  "over",
  "while",
  "this",
  "these",
  "those",
  "an",
  "our",
  "their",
  "team"
]);

const DUPLICATE_SIMILARITY_THRESHOLD = 0.72;
const MINIMUM_RELEVANCE_SCORE = 30;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectCommonMisspellings(text) {
  const normalized = String(text || "").toLowerCase();
  return Object.keys(COMMON_MISSPELLINGS).filter((word) => {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
    return pattern.test(normalized);
  });
}

function applySpellingCorrections(text) {
  let corrected = String(text || "");
  let correctionCount = 0;

  Object.entries(COMMON_MISSPELLINGS).forEach(([wrong, right]) => {
    const pattern = new RegExp(`\\b${escapeRegex(wrong)}\\b`, "gi");
    const matches = corrected.match(pattern);

    if (!matches?.length) {
      return;
    }

    correctionCount += matches.length;
    corrected = corrected.replace(pattern, right);
  });

  return {
    corrected,
    correctionCount
  };
}

function countProfessionalTerms(text) {
  const normalized = String(text || "").toLowerCase();
  return PROFESSIONAL_TERMS.filter((term) => normalized.includes(term)).length;
}

function normalizeSemanticText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[.,/#!$%^*;:{}=_`~|?<>]+/g, " ")
    .replace(/[+\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSemantic(text) {
  const normalized = normalizeSemanticText(text);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !BULLET_STOP_WORDS.has(token));
}

function toSet(items) {
  return new Set(Array.isArray(items) ? items.filter(Boolean) : []);
}

function setIntersectionCount(setA, setB) {
  let count = 0;
  setA.forEach((item) => {
    if (setB.has(item)) count += 1;
  });
  return count;
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = toSet(tokensA);
  const setB = toSet(tokensB);
  if (!setA.size || !setB.size) return 0;

  const intersection = setIntersectionCount(setA, setB);
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

function toCharacterBigrams(value) {
  const text = normalizeSemanticText(value).replace(/\s+/g, "");
  if (text.length < 2) return [];

  const grams = [];
  for (let index = 0; index < text.length - 1; index += 1) {
    grams.push(text.slice(index, index + 2));
  }
  return grams;
}

function diceSimilarity(textA, textB) {
  const gramsA = toSet(toCharacterBigrams(textA));
  const gramsB = toSet(toCharacterBigrams(textB));
  if (!gramsA.size || !gramsB.size) return 0;

  const intersection = setIntersectionCount(gramsA, gramsB);
  return (2 * intersection) / (gramsA.size + gramsB.size);
}

function bulletSimilarity(first, second) {
  const tokenScore = jaccardSimilarity(tokenizeSemantic(first), tokenizeSemantic(second));
  const diceScore = diceSimilarity(first, second);
  return tokenScore * 0.68 + diceScore * 0.32;
}

function inferRewriteProfile(jobDescription = "") {
  const normalized = String(jobDescription || "").toLowerCase();

  let roleFamily = "general";
  if (/software|engineer|developer|frontend|backend|full stack/.test(normalized)) {
    roleFamily = "software-engineering";
  } else if (/data|analytics|machine learning|ai|sql|warehouse/.test(normalized)) {
    roleFamily = "data";
  } else if (/product manager|product strategy|roadmap/.test(normalized)) {
    roleFamily = "product";
  } else if (/marketing|seo|campaign|brand/.test(normalized)) {
    roleFamily = "marketing";
  }

  let seniority = "mid";
  if (/intern|junior|entry level/.test(normalized)) {
    seniority = "junior";
  }
  if (/senior|lead|staff|principal|director|head|vp/.test(normalized)) {
    seniority = "senior";
  }

  return {
    roleFamily,
    seniority
  };
}

function buildRewritePromptTemplate({
  bulletPoint,
  keyword,
  jobDescription,
  profile,
  priorApprovedBullets,
  rankedKeywords,
  sequenceIndex,
  totalBullets
}) {
  const topKeywords = (Array.isArray(rankedKeywords) ? rankedKeywords : [])
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");

  const priorBulletsSnippet = (Array.isArray(priorApprovedBullets) ? priorApprovedBullets : [])
    .filter(Boolean)
    .slice(-4)
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");

  const keywordInstruction = keyword
    ? `Preferred Keyword: ${keyword}. Use this keyword naturally if relevant.`
    : "No fixed preferred keyword. Choose the most relevant JD keyword naturally.";

  return [
    "System: You are an elite ATS resume writer for CareerForge Pro.",
    `Sequence Context: Rewrite bullet ${sequenceIndex + 1} of ${totalBullets}.`,
    `Role Profile: ${profile?.roleFamily || "general"} | Seniority: ${profile?.seniority || "mid"}`,
    "Task: Rewrite the bullet to be ATS-friendly, professional, and measurable.",
    "Requirements:",
    "1) Output exactly one bullet sentence.",
    "2) Keep the original achievement intent; do not invent impossible claims.",
    "3) Use action + scope + impact style.",
    "4) Keep length around 16-30 words.",
    "5) Avoid repeating same structure or wording from prior approved bullets.",
    keywordInstruction,
    topKeywords ? `Top JD Keywords: ${topKeywords}` : "",
    priorBulletsSnippet ? `Prior Approved Bullets:\n${priorBulletsSnippet}` : "",
    `Original Bullet: ${bulletPoint}`,
    `Job Description Context: ${jobDescription}`,
    "Return only the rewritten bullet text with no numbering or markdown."
  ]
    .filter(Boolean)
    .join("\n");
}

function heuristicRewriteBullet({
  bulletPoint,
  keyword,
  rankedKeywords = [],
  sequenceIndex = 0
}) {
  const cleanedInput = applySpellingCorrections(bulletPoint || "").corrected;
  const cleanBullet = String(cleanedInput || "")
    .replace(/\s+/g, " ")
    .trim();
  const chosenVerb = AUTHORITATIVE_VERBS[cleanBullet.length % AUTHORITATIVE_VERBS.length];

  const fallbackKeyword = keyword || rankedKeywords[0] || "deliverables";
  const chosenEnding = HEURISTIC_ENDINGS[sequenceIndex % HEURISTIC_ENDINGS.length];

  let rewritten = cleanBullet
    .replace(/^(worked\s+on|responsible\s+for|involved\s+in)\s+/i, "")
    .replace(/^to\s+/i, "")
    .trim();

  if (!rewritten) {
    rewritten = `${chosenVerb} initiatives aligned to ${fallbackKeyword} priorities ${chosenEnding}`;
  } else if (!AUTHORITATIVE_VERBS.some((verb) => rewritten.toLowerCase().startsWith(verb.toLowerCase()))) {
    rewritten = `${chosenVerb} ${rewritten}`;
  }

  if (fallbackKeyword && !rewritten.toLowerCase().includes(fallbackKeyword.toLowerCase())) {
    rewritten = `${rewritten.replace(/[.]$/, "")} for ${fallbackKeyword} objectives ${chosenEnding}`;
  }

  if (!/^[A-Z]/.test(rewritten)) {
    rewritten = rewritten[0].toUpperCase() + rewritten.slice(1);
  }

  if (!/[.!?]$/.test(rewritten)) {
    rewritten = `${rewritten}.`;
  }

  return rewritten;
}

function sanitizeGeneratedBullet(text, preferredKeyword, fallbackKeyword) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const corrected = applySpellingCorrections(normalized).corrected;

  let safeBullet = corrected
    .replace(/^[-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^"|"$/g, "")
    .trim();

  if (!safeBullet) return "";

  if (preferredKeyword && !safeBullet.toLowerCase().includes(preferredKeyword.toLowerCase())) {
    safeBullet = `${safeBullet.replace(/[.]$/, "")}, advancing ${preferredKeyword} outcomes.`;
  } else if (!preferredKeyword && fallbackKeyword && !safeBullet.toLowerCase().includes(fallbackKeyword.toLowerCase())) {
    safeBullet = `${safeBullet.replace(/[.]$/, "")}, aligned with ${fallbackKeyword} priorities.`;
  }

  if (!/^[A-Z]/.test(safeBullet)) {
    safeBullet = safeBullet[0].toUpperCase() + safeBullet.slice(1);
  }

  if (!/[.!?]$/.test(safeBullet)) {
    safeBullet = `${safeBullet}.`;
  }

  return safeBullet;
}

function buildKeywordSignals(jobDescription = "") {
  const rankedKeywords = extractRankedKeywordsFromJobDescription(jobDescription, 18)
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const keywordTokenSet = new Set();
  rankedKeywords.forEach((keyword) => {
    tokenizeSemantic(keyword).forEach((token) => keywordTokenSet.add(token));
  });

  const jdTokenSet = new Set(tokenizeSemantic(jobDescription));

  return {
    rankedKeywords,
    keywordTokenSet,
    jdTokenSet
  };
}

function stripKeywordTokens(text, rankedKeywords = []) {
  let normalized = normalizeSemanticText(text);
  if (!normalized) return "";

  (Array.isArray(rankedKeywords) ? rankedKeywords : []).forEach((keyword) => {
    const candidate = normalizeSemanticText(keyword);
    if (!candidate) return;
    const pattern = new RegExp(`\\b${escapeRegex(candidate)}\\b`, "gi");
    normalized = normalized.replace(pattern, " ");
  });

  return normalizeSemanticText(normalized);
}

function keywordHitsFromText(text, rankedKeywords = []) {
  const normalized = normalizeSemanticText(text);
  if (!normalized) return [];

  return rankedKeywords.filter((keyword) => {
    const candidate = normalizeSemanticText(keyword);
    if (!candidate) return false;

    const pattern = new RegExp(`\\b${escapeRegex(candidate)}\\b`, "i");
    return pattern.test(normalized);
  });
}

function computeSpecificityScore(text) {
  const normalized = normalizeSemanticText(text);
  const tokens = tokenizeSemantic(normalized);
  const uniqueTokenCount = new Set(tokens).size;

  const hasMetric = /(\d+\s?%|\$\s?\d+|\d+x|\d+\+|\b\d{2,}\b)/i.test(normalized);
  const hasStrongVerb = AUTHORITATIVE_VERBS.some((verb) =>
    normalized.startsWith(verb.toLowerCase())
  );
  const vaguePattern = /(many\s+tasks|various\s+tasks|different\s+tasks|miscellaneous|other\s+duties|worked\s+on|responsible\s+for|etc\b)/i.test(
    normalized
  );

  const lengthScore = clamp((tokens.length / 18) * 42, 0, 42);
  const uniqueScore = clamp((uniqueTokenCount / 12) * 36, 0, 36);
  const metricBonus = hasMetric ? 14 : 0;
  const verbBonus = hasStrongVerb ? 10 : 0;
  const vaguePenalty = vaguePattern ? 45 : 0;

  return clamp(lengthScore + uniqueScore + metricBonus + verbBonus - vaguePenalty, 0, 100);
}

function assessBulletRelevance({ rewrittenBullet, originalBullet, keywordSignals }) {
  const bulletTokens = tokenizeSemantic(rewrittenBullet);
  const originalTokens = tokenizeSemantic(originalBullet);

  const bulletTokenSet = new Set(bulletTokens);
  const originalTokenSet = new Set(originalTokens);

  const jdIntersection = setIntersectionCount(bulletTokenSet, keywordSignals.jdTokenSet);
  const keywordIntersection = setIntersectionCount(bulletTokenSet, keywordSignals.keywordTokenSet);

  const tokenOverlapRatio = bulletTokenSet.size
    ? jdIntersection / bulletTokenSet.size
    : 0;

  const keywordCoverageRatio = keywordSignals.keywordTokenSet.size
    ? keywordIntersection / keywordSignals.keywordTokenSet.size
    : 0;

  const matchedKeywords = keywordHitsFromText(rewrittenBullet, keywordSignals.rankedKeywords);
  const originalMatchedKeywords = keywordHitsFromText(originalBullet, keywordSignals.rankedKeywords);

  const metricBonus = /(\d+\s?%|\$\s?\d+|\d+x|\d+\+|\b\d{2,}\b)/i.test(rewrittenBullet) ? 8 : 0;
  const actionBonus = AUTHORITATIVE_VERBS.some((verb) =>
    normalizeSemanticText(rewrittenBullet).startsWith(verb.toLowerCase())
  )
    ? 7
    : 0;
  const specificityScore = computeSpecificityScore(rewrittenBullet);

  const relevanceScore = clamp(
    tokenOverlapRatio * 45 +
      keywordCoverageRatio * 30 +
      matchedKeywords.length * 10 +
      metricBonus +
      actionBonus,
    0,
    100
  );

  const keep =
    (relevanceScore >= MINIMUM_RELEVANCE_SCORE && specificityScore >= 40) ||
    (matchedKeywords.length >= 2 && relevanceScore >= MINIMUM_RELEVANCE_SCORE - 2 && specificityScore >= 35) ||
    (originalMatchedKeywords.length > 0 &&
      relevanceScore >= MINIMUM_RELEVANCE_SCORE - 4 &&
      specificityScore >= 35);

  return {
    keep,
    relevanceScore: Math.round(relevanceScore),
    specificityScore: Math.round(specificityScore),
    tokenOverlapRatio: Math.round(tokenOverlapRatio * 100),
    keywordCoverageRatio: Math.round(keywordCoverageRatio * 100),
    matchedKeywords,
    originalMatchedKeywords
  };
}

function findDuplicateBullet(candidateBullet, acceptedBullets, rankedKeywords = []) {
  const candidates = Array.isArray(acceptedBullets) ? acceptedBullets : [];

  let strongest = {
    duplicate: false,
    similarity: 0,
    templateSimilarity: 0,
    against: ""
  };

  candidates.forEach((existing) => {
    const similarity = bulletSimilarity(candidateBullet, existing);
    const templateSimilarity = bulletSimilarity(
      stripKeywordTokens(candidateBullet, rankedKeywords),
      stripKeywordTokens(existing, rankedKeywords)
    );
    const duplicate =
      similarity >= DUPLICATE_SIMILARITY_THRESHOLD ||
      templateSimilarity >= 0.8;

    if (similarity > strongest.similarity || templateSimilarity > strongest.templateSimilarity) {
      strongest = {
        duplicate,
        similarity,
        templateSimilarity,
        against: existing
      };
    }
  });

  return strongest;
}

function assessRewriteQuality({ rewrittenBullet, keyword, originalBullet }) {
  const normalized = String(rewrittenBullet || "").toLowerCase();
  const effectiveKeyword = String(keyword || "").toLowerCase();
  const keywordIncluded = effectiveKeyword
    ? normalized.includes(effectiveKeyword)
    : true;
  const hasActionVerb = AUTHORITATIVE_VERBS.some((verb) =>
    normalized.startsWith(verb.toLowerCase()) || normalized.includes(` ${verb.toLowerCase()} `)
  );
  const improvedLength =
    rewrittenBullet.length >= Math.max(28, (originalBullet || "").length * 0.78);
  const spellingIssues = detectCommonMisspellings(rewrittenBullet);
  const spellingIssueCount = spellingIssues.length;
  const professionalTermsMatched = countProfessionalTerms(rewrittenBullet);
  const professionalToneScore = Math.min(100, professionalTermsMatched * 20);

  const scoreParts = [
    keywordIncluded ? 30 : 0,
    hasActionVerb ? 25 : 0,
    improvedLength ? 20 : 0,
    spellingIssueCount === 0 ? 10 : 0,
    professionalTermsMatched > 0 ? 15 : 0
  ];
  const qualityScore = scoreParts.reduce((sum, val) => sum + val, 0);

  return {
    qualityScore,
    keywordIncluded,
    hasActionVerb,
    improvedLength,
    spellingIssueCount,
    spellingIssues,
    professionalTermsMatched,
    professionalToneScore,
    verdict:
      qualityScore >= 82
        ? "strong"
        : qualityScore >= 58
          ? "acceptable"
          : "needs-improvement"
  };
}

async function rewriteBulletWithMetrics({
  bulletPoint,
  keyword,
  jobDescription,
  priorApprovedBullets = [],
  rankedKeywords = [],
  keywordSignals,
  sequenceIndex = 0,
  totalBullets = 1
}) {
  const startedAt = Date.now();

  const effectiveSignals = keywordSignals || buildKeywordSignals(jobDescription);
  const effectiveRankedKeywords = rankedKeywords.length
    ? rankedKeywords
    : effectiveSignals.rankedKeywords;

  const profile = inferRewriteProfile(jobDescription);
  const promptTemplate = buildRewritePromptTemplate({
    bulletPoint,
    keyword,
    jobDescription,
    profile,
    priorApprovedBullets,
    rankedKeywords: effectiveRankedKeywords,
    sequenceIndex,
    totalBullets
  });

  const llmResult = await rewriteBulletWithLlm({ promptTemplate });

  const fallbackKeyword = effectiveRankedKeywords[0] || "delivery";
  const rewrittenBullet = llmResult.ok
    ? sanitizeGeneratedBullet(llmResult.rewrittenBullet, keyword, fallbackKeyword)
    : heuristicRewriteBullet({
        bulletPoint,
        keyword,
        rankedKeywords: effectiveRankedKeywords,
        sequenceIndex
      });

  const quality = assessRewriteQuality({
    rewrittenBullet,
    keyword,
    originalBullet: bulletPoint || ""
  });

  const relevance = assessBulletRelevance({
    rewrittenBullet,
    originalBullet: bulletPoint,
    keywordSignals: effectiveSignals
  });

  const duplicate = findDuplicateBullet(
    rewrittenBullet,
    priorApprovedBullets,
    effectiveRankedKeywords
  );
  const latencyMs = Date.now() - startedAt;

  return {
    promptTemplate,
    profile,
    rewrittenBullet,
    keywordUsed: keyword || null,
    rankedKeywords: effectiveRankedKeywords,
    latencyMs,
    quality,
    relevance,
    duplicate,
    engine: llmResult.ok ? llmResult.engine : "careerforge-heuristic-writer-v2",
    providerStatus: llmResult.ok ? "llm" : "fallback",
    fallbackReason: llmResult.ok ? null : llmResult.reason
  };
}

function chooseRetryKeyword({ selectedKeyword, rankedKeywords, usedKeywords }) {
  const normalizedSelected = String(selectedKeyword || "").trim().toLowerCase();

  const pool = (Array.isArray(rankedKeywords) ? rankedKeywords : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const next = pool.find((item) => {
    const normalized = item.toLowerCase();
    if (!normalized) return false;
    if (normalized === normalizedSelected) return false;
    return !usedKeywords.has(normalized);
  });

  return next || pool[0] || selectedKeyword || "";
}

async function rewriteBatchWithMetrics({ bullets, keywords = [], jobDescription }) {
  const inputBullets = Array.isArray(bullets)
    ? bullets.map((item) => String(item || "").trim())
    : [];

  const keywordSignals = buildKeywordSignals(jobDescription);
  const rankedKeywords = keywordSignals.rankedKeywords;

  const rewrites = [];
  const approvedBullets = [];
  const usedKeywords = new Set();

  for (let index = 0; index < inputBullets.length; index += 1) {
    const sourceBullet = inputBullets[index];
    const initialKeyword = String(keywords[index] || keywords[0] || "").trim();

    const firstAttempt = await rewriteBulletWithMetrics({
      bulletPoint: sourceBullet,
      keyword: initialKeyword || undefined,
      jobDescription,
      priorApprovedBullets: approvedBullets,
      rankedKeywords,
      keywordSignals,
      sequenceIndex: index,
      totalBullets: inputBullets.length
    });

    let selectedRewrite = firstAttempt;
    let removed = false;
    let removalReason = "";

    const needsRetryForDuplicate = selectedRewrite.duplicate?.duplicate;
    const needsRetryForRelevance = !selectedRewrite.relevance?.keep;

    if (needsRetryForDuplicate || needsRetryForRelevance) {
      const retryKeyword = chooseRetryKeyword({
        selectedKeyword: initialKeyword,
        rankedKeywords,
        usedKeywords
      });

      const retryAttempt = await rewriteBulletWithMetrics({
        bulletPoint: sourceBullet,
        keyword: retryKeyword || undefined,
        jobDescription,
        priorApprovedBullets: approvedBullets,
        rankedKeywords,
        keywordSignals,
        sequenceIndex: index,
        totalBullets: inputBullets.length
      });

      const retryBetter =
        (retryAttempt.relevance?.relevanceScore || 0) >
          (selectedRewrite.relevance?.relevanceScore || 0) ||
        (retryAttempt.quality?.qualityScore || 0) >
          (selectedRewrite.quality?.qualityScore || 0);

      if (retryBetter) {
        selectedRewrite = retryAttempt;
      }
    }

    if (selectedRewrite.duplicate?.duplicate) {
      removed = true;
      removalReason = "duplicate-pattern";
    }

    if (!removed && !selectedRewrite.relevance?.keep) {
      removed = true;
      removalReason = "not-related-to-job-description";
    }

    if (!removed && selectedRewrite.rewrittenBullet) {
      approvedBullets.push(selectedRewrite.rewrittenBullet);
    }

    const effectiveKeyword =
      selectedRewrite.keywordUsed || initialKeyword || rankedKeywords[index % Math.max(1, rankedKeywords.length)] || null;

    if (effectiveKeyword) {
      usedKeywords.add(String(effectiveKeyword).toLowerCase());
    }

    rewrites.push({
      originalIndex: index,
      sourceBullet,
      rewrittenBullet: removed ? "" : selectedRewrite.rewrittenBullet,
      removed,
      removalReason: removed ? removalReason : null,
      keywordUsed: effectiveKeyword,
      rankedKeywords: selectedRewrite.rankedKeywords,
      latencyMs: selectedRewrite.latencyMs,
      quality: selectedRewrite.quality,
      relevance: selectedRewrite.relevance,
      providerStatus: selectedRewrite.providerStatus,
      engine: selectedRewrite.engine,
      fallbackReason: selectedRewrite.fallbackReason
    });
  }

  if (rewrites.length && rewrites.every((item) => item.removed)) {
    const bestIndex = rewrites
      .map((item, idx) => ({
        idx,
        score:
          Number(item.relevance?.relevanceScore || 0) +
          Number(item.quality?.qualityScore || 0) * 0.35
      }))
      .sort((a, b) => b.score - a.score)[0]?.idx;

    if (Number.isInteger(bestIndex) && rewrites[bestIndex]) {
      rewrites[bestIndex].removed = false;
      rewrites[bestIndex].removalReason = null;
      rewrites[bestIndex].rewrittenBullet =
        rewrites[bestIndex].rewrittenBullet || rewrites[bestIndex].sourceBullet;
    }
  }

  const kept = rewrites.filter((item) => !item.removed);
  const removedCount = rewrites.length - kept.length;

  const averageQuality = kept.length
    ? Math.round(
        kept.reduce((sum, item) => sum + (item.quality?.qualityScore || 0), 0) /
          kept.length
      )
    : 0;

  const averageLatencyMs = rewrites.length
    ? Math.round(
        rewrites.reduce((sum, item) => sum + (item.latencyMs || 0), 0) /
          rewrites.length
      )
    : 0;

  return {
    rewrites,
    summary: {
      total: rewrites.length,
      rewrittenCount: kept.length,
      removedCount,
      averageQuality,
      averageLatencyMs,
      processingMode: "sequential"
    }
  };
}

function evaluateRewriteQuality({ rewrittenBullet, keyword, originalBullet }) {
  return assessRewriteQuality({
    rewrittenBullet,
    keyword,
    originalBullet
  });
}

module.exports = {
  rewriteBulletWithMetrics,
  rewriteBatchWithMetrics,
  evaluateRewriteQuality,
  buildRewritePromptTemplate,
  inferRewriteProfile
};
