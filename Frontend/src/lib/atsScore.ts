// Strict, deterministic ATS scoring — modeled on enterprise HRS ATS systems
// (Workday, Greenhouse, Taleo, iCIMS-style scoring rubrics).
// Re-runs instantly on every resume edit. No AI calls.

import type { ResumeData, AiResult } from "./resumeTypes";

export type AtsCheck = {
  id: string;
  label: string;
  category: "contact" | "structure" | "content" | "keywords" | "formatting";
  weight: number;
  score: number; // 0..weight earned
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type AtsReport = {
  score: number; // 0..100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  band: string;
  checks: AtsCheck[];
  keywordCoverage: { matched: string[]; missing: string[]; coveragePct: number };
};

const ACTION_VERBS = [
  "led","built","designed","developed","launched","shipped","drove","increased","reduced","improved",
  "optimized","automated","architected","implemented","delivered","spearheaded","scaled","accelerated",
  "boosted","streamlined","engineered","created","established","negotiated","mentored","analyzed",
  "owned","executed","resolved","saved","generated","cut","grew","managed","produced","redesigned",
];

const WEAK_PHRASES = [
  "responsible for","duties included","worked on","helped with","assisted in","participated in",
  "involved in","tasked with","in charge of",
];

const BUZZWORDS = ["synergy","go-getter","team player","detail-oriented","results-driven","hard worker","self-starter"];

const PRONOUNS = /\b(I|me|my|we|our|us)\b/gi;

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RX = /https?:\/\/|www\.|linkedin\.com|github\.com/i;
const DATE_RX = /(19|20)\d{2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
const NUMBER_IN_BULLET = /(\d+%|\$\d|\d+\+|\d+x|\b\d{2,}\b)/;

const grade = (s: number): AtsReport["grade"] => {
  if (s >= 92) return "A+";
  if (s >= 85) return "A";
  if (s >= 75) return "B";
  if (s >= 65) return "C";
  if (s >= 50) return "D";
  return "F";
};

const band = (s: number) => {
  if (s >= 85) return "Top-tier · likely passes recruiter ATS filters";
  if (s >= 70) return "Strong · minor fixes recommended";
  if (s >= 55) return "Average · several issues block ATS parsing";
  if (s >= 40) return "Weak · likely filtered out by enterprise ATS";
  return "Critical · resume needs major restructuring";
};

const tokenize = (s: string): string[] =>
  s.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, " ").split(/\s+/).filter((t) => t.length > 1);

const STOP = new Set([
  "the","a","an","and","or","of","in","on","to","for","with","by","at","is","are","be","as","that","this",
  "from","it","you","your","our","we","will","can","has","have","had","was","were","but","not","they","their",
  "if","do","does","than","then","such","into","over","across","per","via","also","any","all","other","more","most",
  "experience","work","job","role","candidate","ability","skill","skills","required","preferred","plus","year","years",
]);

const extractJdKeywords = (jd: string): string[] => {
  if (!jd) return [];
  const tokens = tokenize(jd).filter((t) => !STOP.has(t) && t.length > 2);
  const freq = new Map<string, number>();
  tokens.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));
  // Bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = `${tokens[i]} ${tokens[i + 1]}`;
    if (tokens[i].length > 2 && tokens[i + 1].length > 2) freq.set(bg, (freq.get(bg) ?? 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([k]) => k);
};

export const computeAts = (resume: ResumeData, jd: string, ai: AiResult | null): AtsReport => {
  const checks: AtsCheck[] = [];
  const allBullets = resume.experience.flatMap((e) => e.bullets || []).filter(Boolean);
  const fullText = [
    resume.name, resume.headline, resume.summary,
    ...resume.experience.flatMap((e) => [e.company, e.title, e.location, ...(e.bullets || [])]),
    ...resume.education.flatMap((e) => [e.school, e.degree, e.details || ""]),
    ...(resume.skills || []),
    ...((resume.projects || []).flatMap((p) => [p.name, p.description, ...(p.bullets || [])])),
  ].filter(Boolean).join(" ");
  const fullTextLower = fullText.toLowerCase();
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  // ===== CONTACT (15) =====
  checks.push({
    id: "name", label: "Full name present", category: "contact", weight: 3,
    score: resume.name?.trim().split(/\s+/).length >= 2 ? 3 : 0,
    status: resume.name?.trim().split(/\s+/).length >= 2 ? "pass" : "fail",
    detail: resume.name?.trim() ? `"${resume.name}"` : "Missing — ATS uses name as primary identifier.",
  });
  checks.push({
    id: "email", label: "Valid email address", category: "contact", weight: 4,
    score: EMAIL_RX.test(resume.email || "") ? 4 : 0,
    status: EMAIL_RX.test(resume.email || "") ? "pass" : "fail",
    detail: EMAIL_RX.test(resume.email || "") ? resume.email : "Missing or malformed — ATS auto-rejects.",
  });
  checks.push({
    id: "phone", label: "Phone number", category: "contact", weight: 3,
    score: PHONE_RX.test(resume.phone || "") ? 3 : 0,
    status: PHONE_RX.test(resume.phone || "") ? "pass" : "fail",
    detail: PHONE_RX.test(resume.phone || "") ? resume.phone! : "Add a reachable phone number.",
  });
  checks.push({
    id: "location", label: "Location", category: "contact", weight: 2,
    score: (resume.location || "").trim().length >= 3 ? 2 : 0,
    status: (resume.location || "").trim().length >= 3 ? "pass" : "warn",
    detail: resume.location || "Many ATS rank candidates by geography.",
  });
  const hasLink = (resume.links || []).some((l) => URL_RX.test(l.url || "") || URL_RX.test(l.label || ""));
  checks.push({
    id: "links", label: "Professional link (LinkedIn / portfolio)", category: "contact", weight: 3,
    score: hasLink ? 3 : 0,
    status: hasLink ? "pass" : "warn",
    detail: hasLink ? "Link detected" : "Recruiters click LinkedIn/GitHub before reading bullets.",
  });

  // ===== STRUCTURE (20) =====
  checks.push({
    id: "summary", label: "Professional summary (40-120 words)", category: "structure", weight: 5,
    score: (() => {
      const w = (resume.summary || "").split(/\s+/).filter(Boolean).length;
      if (w >= 40 && w <= 120) return 5;
      if (w >= 20) return 3;
      return 0;
    })(),
    status: (() => {
      const w = (resume.summary || "").split(/\s+/).filter(Boolean).length;
      if (w >= 40 && w <= 120) return "pass";
      if (w >= 20) return "warn";
      return "fail";
    })(),
    detail: `${(resume.summary || "").split(/\s+/).filter(Boolean).length} words. Optimal: 40-120.`,
  });
  checks.push({
    id: "exp_section", label: "Experience section", category: "structure", weight: 6,
    score: resume.experience.length >= 2 ? 6 : resume.experience.length === 1 ? 4 : 0,
    status: resume.experience.length >= 2 ? "pass" : resume.experience.length === 1 ? "warn" : "fail",
    detail: `${resume.experience.length} role(s). ATS expect at least 2 entries.`,
  });
  checks.push({
    id: "edu", label: "Education section", category: "structure", weight: 4,
    score: resume.education.length >= 1 ? 4 : 0,
    status: resume.education.length >= 1 ? "pass" : "fail",
    detail: `${resume.education.length} entry. Required by 95% of ATS templates.`,
  });
  checks.push({
    id: "skills", label: "Skills section (≥6 items)", category: "structure", weight: 5,
    score: resume.skills.length >= 10 ? 5 : resume.skills.length >= 6 ? 3 : resume.skills.length >= 1 ? 1 : 0,
    status: resume.skills.length >= 6 ? "pass" : resume.skills.length >= 1 ? "warn" : "fail",
    detail: `${resume.skills.length} skills. Best 10-20 hard skills.`,
  });

  // ===== CONTENT (30) =====
  // Dates on every role
  const datesOk = resume.experience.every((e) => DATE_RX.test(e.start_date || "") && (e.end_date || "").length > 1);
  checks.push({
    id: "dates", label: "Every role has start & end dates", category: "content", weight: 5,
    score: datesOk && resume.experience.length > 0 ? 5 : 0,
    status: datesOk && resume.experience.length > 0 ? "pass" : "fail",
    detail: datesOk ? "All dates present" : "Missing dates trigger ATS parsing errors.",
  });

  // Bullet count
  const bulletCount = allBullets.length;
  checks.push({
    id: "bullets_count", label: "Bullet count (8-25)", category: "content", weight: 4,
    score: bulletCount >= 8 && bulletCount <= 25 ? 4 : bulletCount >= 4 ? 2 : 0,
    status: bulletCount >= 8 && bulletCount <= 25 ? "pass" : bulletCount >= 4 ? "warn" : "fail",
    detail: `${bulletCount} bullets across all roles.`,
  });

  // Action verbs
  const verbStarts = allBullets.filter((b) => {
    const first = b.trim().split(/\s+/)[0]?.toLowerCase() || "";
    return ACTION_VERBS.includes(first);
  }).length;
  const verbPct = bulletCount > 0 ? verbStarts / bulletCount : 0;
  checks.push({
    id: "verbs", label: "Bullets start with strong action verbs", category: "content", weight: 6,
    score: Math.round(verbPct * 6),
    status: verbPct >= 0.7 ? "pass" : verbPct >= 0.4 ? "warn" : "fail",
    detail: `${verbStarts}/${bulletCount} bullets start with action verbs.`,
  });

  // Quantified bullets
  const quantified = allBullets.filter((b) => NUMBER_IN_BULLET.test(b)).length;
  const quantPct = bulletCount > 0 ? quantified / bulletCount : 0;
  checks.push({
    id: "metrics", label: "Bullets include metrics / numbers", category: "content", weight: 7,
    score: Math.round(quantPct * 7),
    status: quantPct >= 0.5 ? "pass" : quantPct >= 0.25 ? "warn" : "fail",
    detail: `${quantified}/${bulletCount} quantified. Top resumes hit 50%+.`,
  });

  // Weak phrases
  const weakHits = WEAK_PHRASES.filter((p) => fullTextLower.includes(p)).length;
  checks.push({
    id: "weak", label: "No weak phrases ('responsible for' etc.)", category: "content", weight: 4,
    score: weakHits === 0 ? 4 : weakHits <= 2 ? 2 : 0,
    status: weakHits === 0 ? "pass" : weakHits <= 2 ? "warn" : "fail",
    detail: weakHits === 0 ? "Clean language" : `${weakHits} weak phrase(s) detected.`,
  });

  // Buzzwords / pronouns
  const buzzHits = BUZZWORDS.filter((b) => fullTextLower.includes(b)).length;
  const pronounHits = (fullText.match(PRONOUNS) || []).length;
  checks.push({
    id: "tone", label: "No buzzwords or first-person pronouns", category: "content", weight: 4,
    score: buzzHits === 0 && pronounHits === 0 ? 4 : buzzHits + pronounHits <= 2 ? 2 : 0,
    status: buzzHits === 0 && pronounHits === 0 ? "pass" : "warn",
    detail: `${buzzHits} buzzword(s), ${pronounHits} pronoun(s).`,
  });

  // ===== KEYWORDS (25) =====
  const aiKeywords = (ai?.keywords || []).map((k) => k.term.toLowerCase());
  const jdKeywords = aiKeywords.length > 0 ? aiKeywords : extractJdKeywords(jd);
  const matched: string[] = [];
  const missing: string[] = [];
  jdKeywords.forEach((k) => {
    if (fullTextLower.includes(k.toLowerCase())) matched.push(k);
    else missing.push(k);
  });

  const coveragePct = jdKeywords.length > 0 ? matched.length / jdKeywords.length : 0;

  checks.push({
    id: "kw_coverage", label: "JD keyword coverage", category: "keywords", weight: 15,
    score: Math.round(coveragePct * 15),
    status: coveragePct >= 0.7 ? "pass" : coveragePct >= 0.4 ? "warn" : "fail",
    detail: jdKeywords.length === 0
      ? "Add a job description to score keyword match."
      : `${matched.length}/${jdKeywords.length} matched (${Math.round(coveragePct * 100)}%).`,
  });

  // Critical keyword presence (top 5)
  const critical = jdKeywords.slice(0, 5);
  const criticalMatched = critical.filter((k) => fullTextLower.includes(k.toLowerCase())).length;
  checks.push({
    id: "kw_critical", label: "Top-5 critical keywords present", category: "keywords", weight: 10,
    score: critical.length > 0 ? Math.round((criticalMatched / critical.length) * 10) : 0,
    status: critical.length === 0 ? "warn" : criticalMatched === critical.length ? "pass" : criticalMatched >= 3 ? "warn" : "fail",
    detail: critical.length === 0 ? "No JD provided." : `${criticalMatched}/${critical.length} top keywords found.`,
  });

  // ===== FORMATTING (10) =====
  checks.push({
    id: "length", label: "Resume length (300-900 words)", category: "formatting", weight: 5,
    score: wordCount >= 300 && wordCount <= 900 ? 5 : wordCount >= 200 ? 3 : 0,
    status: wordCount >= 300 && wordCount <= 900 ? "pass" : "warn",
    detail: `${wordCount} words.`,
  });

  // No special chars / emojis (would break ATS parsers)
  const badChars = (fullText.match(/[^\x00-\x7F]/g) || []).length;
  checks.push({
    id: "ascii", label: "ATS-safe characters (no emojis/symbols)", category: "formatting", weight: 5,
    score: badChars === 0 ? 5 : badChars <= 3 ? 3 : 0,
    status: badChars === 0 ? "pass" : badChars <= 3 ? "warn" : "fail",
    detail: badChars === 0 ? "All characters are ATS-safe" : `${badChars} non-ASCII character(s) may break parsers.`,
  });

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + c.score, 0);
  const score = Math.round((earned / totalWeight) * 100);

  return {
    score,
    grade: grade(score),
    band: band(score),
    checks,
    keywordCoverage: { matched, missing, coveragePct: Math.round(coveragePct * 100) },
  };
};
