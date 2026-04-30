// Resume editor — load existing or build from scratch, edit live, pick template, export PDF
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Download, Loader2, Plus, Save, Trash2, Mail, CheckCircle2, AlertCircle, Crown, Wand2, ShieldCheck, Upload, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { AtsPanel } from "@/components/resume/AtsPanel";
import { useAuth, useSubscription } from "@/hooks/useAuth";
import { resumeApi } from "@/lib/api/resume";
import { toast } from "@/hooks/use-toast";
import { exportNodeToPdf } from "@/lib/pdfExport";
import { EMPTY_RESUME, projectBulletLines, type AiResult, type ResumeData, type TemplateId } from "@/lib/resumeTypes";
import { computeAts } from "@/lib/atsScore";
import { fileToText } from "@/lib/fileParser";

const DEFAULT_TEMPLATE: TemplateId = "modern";

const cleanBulletLine = (line: string) => line.replace(/^[-*•●▪◦·]\s*/, "").trim();
const linesToBullets = (value: string): string[] => value.split("\n").map(cleanBulletLine).filter(Boolean);
const normalizeProject = (project: any): NonNullable<ResumeData["projects"]>[number] => {
  const bullets = Array.isArray(project?.bullets)
    ? project.bullets.map((b: unknown) => cleanBulletLine(String(b))).filter(Boolean)
    : linesToBullets(project?.description || "");

  return {
    name: project?.name || "",
    description: bullets.join("\n"),
    bullets,
    link: project?.link || "",
  };
};

// Defensive adapter: accept either editor-shape ({name, title, bullets})
// or legacy AI shape ({basics, position, highlights}) and always return editor shape.
const adaptResumeData = (raw: any): ResumeData => {
  if (!raw || typeof raw !== "object") return EMPTY_RESUME;
  const basics = raw.basics || {};
  return {
    name: raw.name || basics.name || "",
    headline: raw.headline || basics.headline || basics.title || "",
    email: raw.email || basics.email || "",
    phone: raw.phone || basics.phone || "",
    location: raw.location || basics.location || "",
    links: Array.isArray(raw.links) ? raw.links : [],
    summary: raw.summary || basics.summary || "",
    experience: Array.isArray(raw.experience)
      ? raw.experience.map((e: any) => ({
          company: e.company || "",
          title: e.title || e.position || e.role || "",
          location: e.location || "",
          start_date: e.start_date || e.startDate || "",
          end_date: e.end_date || e.endDate || "Present",
          bullets: Array.isArray(e.bullets) ? e.bullets : Array.isArray(e.highlights) ? e.highlights : [],
        }))
      : [],
    education: Array.isArray(raw.education)
      ? raw.education.map((ed: any) => ({
          school: ed.school || ed.institution || "",
          degree: ed.degree ? (ed.field ? `${ed.degree}, ${ed.field}` : ed.degree) : "",
          start_date: ed.start_date || ed.startDate || "",
          end_date: ed.end_date || ed.endDate || ed.graduationDate || "",
          details: ed.details || "",
        }))
      : [],
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    projects: Array.isArray(raw.projects) ? raw.projects.map(normalizeProject) : [],
  };
};

const TEMPLATES: { id: TemplateId; label: string; desc: string; premium?: boolean }[] = [
  { id: "modern", label: "Modern", desc: "Bold, ATS-friendly" },
  { id: "classic", label: "Classic", desc: "Traditional, serif" },
  { id: "minimal", label: "Minimal", desc: "Clean two-column" },
  { id: "executive", label: "Executive", desc: "Elegant leadership profile", premium: true },
  { id: "creative_two_column", label: "Creative Two-Column", desc: "Stylish split layout", premium: true },
  { id: "tech", label: "Tech", desc: "Code-inspired modern format", premium: true },
  { id: "elegant_serif", label: "Elegant Serif", desc: "Editorial-grade typography", premium: true },
  { id: "bold_accent", label: "Bold Accent", desc: "Standout violet header", premium: true },
  { id: "compact_pro", label: "Compact Pro", desc: "Dense, recruiter-friendly", premium: true },
];

const isTemplateId = (value: unknown): value is TemplateId =>
  typeof value === "string" && TEMPLATES.some((t) => t.id === value);

const normalizeTemplate = (value: unknown): TemplateId => (isTemplateId(value) ? value : DEFAULT_TEMPLATE);

const isPremiumTemplate = (value: TemplateId): boolean => TEMPLATES.find((t) => t.id === value)?.premium === true;

type JdBulletMatch = {
  keyword: string;
  bullet: string;
  importance: "critical" | "high" | "medium";
};

type BulletDiffStatus = "updated" | "added" | "removed";

type BulletDiffItem = {
  roleLabel: string;
  status: BulletDiffStatus;
  before?: string;
  after?: string;
};

const statusLabel: Record<BulletDiffStatus, string> = {
  updated: "Updated",
  added: "Added",
  removed: "Removed",
};

const normalizeBulletText = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

const roleLabelForDiff = (experience: ResumeData["experience"][number] | undefined, index: number): string => {
  if (!experience) return `Experience #${index + 1}`;
  const title = experience.title || "Role";
  const company = experience.company || "Company";
  return `${title} @ ${company}`;
};

const buildBulletDiff = (beforeResume: ResumeData, afterResume: ResumeData): BulletDiffItem[] => {
  const items: BulletDiffItem[] = [];
  const maxExperience = Math.max(beforeResume.experience.length, afterResume.experience.length);

  for (let experienceIndex = 0; experienceIndex < maxExperience; experienceIndex += 1) {
    const beforeExperience = beforeResume.experience[experienceIndex];
    const afterExperience = afterResume.experience[experienceIndex];
    const roleLabel = roleLabelForDiff(afterExperience ?? beforeExperience, experienceIndex);

    const beforeBullets = beforeExperience?.bullets ?? [];
    const afterBullets = afterExperience?.bullets ?? [];
    const maxBullets = Math.max(beforeBullets.length, afterBullets.length);

    for (let bulletIndex = 0; bulletIndex < maxBullets; bulletIndex += 1) {
      const beforeBullet = beforeBullets[bulletIndex]?.trim() ?? "";
      const afterBullet = afterBullets[bulletIndex]?.trim() ?? "";

      if (beforeBullet && afterBullet) {
        if (normalizeBulletText(beforeBullet) === normalizeBulletText(afterBullet)) continue;
        items.push({ roleLabel, status: "updated", before: beforeBullet, after: afterBullet });
        continue;
      }

      if (beforeBullet && !afterBullet) {
        items.push({ roleLabel, status: "removed", before: beforeBullet });
      }

      if (!beforeBullet && afterBullet) {
        items.push({ roleLabel, status: "added", after: afterBullet });
      }
    }
  }

  return items;
};

const resumeToPlainText = (resume: ResumeData): string => {
  const chunks: string[] = [];

  if (resume.name) chunks.push(resume.name);
  if (resume.headline) chunks.push(resume.headline);

  const contact = [resume.email, resume.phone, resume.location].filter(Boolean).join(" | ");
  if (contact) chunks.push(contact);

  if (resume.summary) chunks.push(`Summary\n${resume.summary}`);

  if (resume.experience.length > 0) {
    const exp = resume.experience
      .map((e) => {
        const header = `${e.title} at ${e.company}${e.location ? ` (${e.location})` : ""} | ${e.start_date} - ${e.end_date}`;
        const bullets = e.bullets.map((b) => `- ${b}`).join("\n");
        return `${header}\n${bullets}`;
      })
      .join("\n\n");
    chunks.push(`Experience\n${exp}`);
  }

  if (resume.education.length > 0) {
    const edu = resume.education
      .map((e) => `${e.degree} - ${e.school} (${e.start_date ? `${e.start_date} - ` : ""}${e.end_date})${e.details ? ` | ${e.details}` : ""}`)
      .join("\n");
    chunks.push(`Education\n${edu}`);
  }

  if (resume.skills.length > 0) {
    chunks.push(`Skills\n${resume.skills.join(", ")}`);
  }

  if (resume.projects && resume.projects.length > 0) {
    const projects = resume.projects
      .map((p) => {
        const bullets = projectBulletLines(p).map((b) => `- ${b}`).join("\n");
        return `${p.name}${p.link ? ` | ${p.link}` : ""}${bullets ? `\n${bullets}` : ""}`;
      })
      .join("\n\n");
    chunks.push(`Projects\n${projects}`);
  }

  return chunks.join("\n\n").trim();
};

const extractJdBulletMatches = (resume: ResumeData, keywords: AiResult["keywords"]): JdBulletMatch[] => {
  const keywordWeight: Record<JdBulletMatch["importance"], number> = {
    critical: 3,
    high: 2,
    medium: 1,
  };

  const bullets = resume.experience
    .flatMap((e) => e.bullets)
    .map((b) => b.trim())
    .filter(Boolean);

  const rankedKeywords = [...keywords].sort((a, b) => (keywordWeight[b.importance] || 0) - (keywordWeight[a.importance] || 0));
  const matches: JdBulletMatch[] = [];
  const seenBullets = new Set<string>();

  for (const keyword of rankedKeywords) {
    const match = bullets.find((bullet) => !seenBullets.has(bullet) && bullet.toLowerCase().includes(keyword.term.toLowerCase()));
    if (!match) continue;
    seenBullets.add(match);
    matches.push({ keyword: keyword.term, bullet: match, importance: keyword.importance });
    if (matches.length >= 8) break;
  }

  if (matches.length > 0) return matches;

  return bullets.slice(0, 5).map((bullet) => ({ keyword: "JD related", bullet, importance: "medium" }));
};

const TemplateThumbnail = ({ id }: { id: TemplateId }) => {
  if (id === "classic") {
    return (
      <div className="h-20 bg-white border border-zinc-200 rounded-md p-2" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        <div className="h-2.5 w-2/3 bg-zinc-800 rounded-sm mb-1.5" />
        <div className="h-px bg-zinc-300 mb-1.5" />
        <div className="h-1.5 w-full bg-zinc-200 rounded-sm mb-1" />
        <div className="h-1.5 w-5/6 bg-zinc-200 rounded-sm mb-1" />
        <div className="h-1.5 w-3/4 bg-zinc-200 rounded-sm" />
      </div>
    );
  }

  if (id === "minimal") {
    return (
      <div className="h-20 bg-white border border-zinc-200 rounded-md p-2">
        <div className="h-2 w-1/2 bg-zinc-700 rounded-sm mb-2" />
        <div className="grid grid-cols-[34px_1fr] gap-2">
          <div className="h-1.5 bg-zinc-200 rounded-sm" />
          <div className="h-1.5 bg-zinc-300 rounded-sm" />
          <div className="h-1.5 bg-zinc-200 rounded-sm" />
          <div className="h-1.5 bg-zinc-300 rounded-sm" />
        </div>
      </div>
    );
  }

  if (id === "executive") {
    return (
      <div className="h-20 bg-white border border-zinc-200 rounded-md p-2" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
        <div className="h-2.5 w-3/5 bg-zinc-900 rounded-sm mb-1" />
        <div className="h-1.5 w-2/5 bg-zinc-400 rounded-sm mb-2" />
        <div className="h-px bg-zinc-300 mb-2" />
        <div className="h-1.5 w-full bg-zinc-200 rounded-sm mb-1" />
        <div className="h-1.5 w-11/12 bg-zinc-200 rounded-sm" />
      </div>
    );
  }

  if (id === "creative_two_column") {
    return (
      <div className="h-20 bg-white border border-zinc-200 rounded-md overflow-hidden grid grid-cols-[28%_1fr]">
        <div className="bg-sky-100 p-1.5">
          <div className="h-2 w-4/5 bg-sky-700 rounded-sm mb-1" />
          <div className="h-1.5 w-full bg-sky-300 rounded-sm mb-1" />
          <div className="h-1.5 w-3/4 bg-sky-300 rounded-sm" />
        </div>
        <div className="p-1.5">
          <div className="h-2 w-1/2 bg-zinc-700 rounded-sm mb-1.5" />
          <div className="h-1.5 w-full bg-zinc-200 rounded-sm mb-1" />
          <div className="h-1.5 w-5/6 bg-zinc-200 rounded-sm mb-1" />
          <div className="h-1.5 w-3/4 bg-zinc-200 rounded-sm" />
        </div>
      </div>
    );
  }

  if (id === "tech") {
    return (
      <div className="h-20 bg-zinc-950 border border-cyan-400/40 rounded-md p-2" style={{ fontFamily: "'JetBrains Mono', 'Consolas', monospace" }}>
        <div className="h-2 w-2/5 bg-cyan-300/80 rounded-sm mb-1" />
        <div className="h-1.5 w-4/5 bg-zinc-700 rounded-sm mb-2" />
        <div className="h-1.5 w-full bg-zinc-800 rounded-sm mb-1" />
        <div className="h-1.5 w-11/12 bg-zinc-800 rounded-sm mb-1" />
        <div className="h-1.5 w-3/4 bg-zinc-800 rounded-sm" />
      </div>
    );
  }

  return (
    <div className="h-20 bg-white border border-zinc-200 rounded-md p-2">
      <div className="h-3 w-1/2 bg-zinc-900 rounded-sm mb-1.5" />
      <div className="h-px bg-zinc-300 mb-1.5" />
      <div className="h-1.5 w-full bg-zinc-200 rounded-sm mb-1" />
      <div className="h-1.5 w-10/12 bg-zinc-200 rounded-sm mb-1" />
      <div className="h-1.5 w-3/4 bg-zinc-200 rounded-sm" />
    </div>
  );
};

// Heuristic parser: turn raw resume text (from PDF/DOCX) into ResumeData.
// Identifies contact info, sections, experience headers, and bullet lines.
const parseResumeText = (raw: string): Partial<ResumeData> => {
  const text = raw
    .replace(/\r/g, "")
    .replace(/[•●▪◦·]/g, "-")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    .trim();
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phoneMatch = text.match(/\+?\d[\d\s().-]{8,}\d/);
  const urlMatches = Array.from(text.matchAll(/(https?:\/\/\S+|linkedin\.com\/\S+|github\.com\/\S+)/gi)).map((m) => m[0]);

  const SECTION_RE = /^(summary|profile|objective|experience|work experience|professional experience|employment history|employment|education|skills|technical skills|projects|certifications|achievements|internships?)\b\s*:?$/i;
  const isContactLine = (line: string) => /@|\+?\d[\d\s().-]{8,}|linkedin\.com|github\.com|https?:\/\//i.test(line);
  const normalizeHeaderLine = (line: string) => line.replace(/[|•·]/g, " ").replace(/\s+/g, " ").trim();

  // Name = first header line that looks like a person name
  let name = "";
  for (const l of lines.slice(0, 8)) {
    const cleaned = normalizeHeaderLine(l);
    if (SECTION_RE.test(l)) continue;
    if (isContactLine(cleaned)) continue;
    if (cleaned.length < 3 || cleaned.length > 90) continue;

    const words = cleaned.split(/\s+/).filter(Boolean);
    const alphaWords = words.filter((w) => /[A-Za-z]/.test(w));
    const looksLikeName =
      alphaWords.length >= 2 &&
      alphaWords.length <= 5 &&
      !/^(resume|curriculum|vitae|profile|summary|experience|education|skills)$/i.test(cleaned);

    if (looksLikeName) {
      name = cleaned;
      break;
    }
  }

  // Headline = first non-contact header line after name
  let headline = "";
  const firstSectionIndex = lines.findIndex((l) => SECTION_RE.test(l));
  const headerLines = (firstSectionIndex >= 0 ? lines.slice(0, firstSectionIndex) : lines.slice(0, 12)).map(normalizeHeaderLine);
  if (headerLines.length > 0) {
    const nameIdx = name ? headerLines.findIndex((l) => l.toLowerCase() === name.toLowerCase()) : -1;
    for (let i = Math.max(0, nameIdx + 1); i < headerLines.length; i += 1) {
      const candidate = headerLines[i];
      if (!candidate || isContactLine(candidate) || SECTION_RE.test(candidate)) continue;
      if (candidate.length >= 6 && candidate.length <= 120) {
        headline = candidate;
        break;
      }
    }
  }

  // Group lines by section
  const sections: Record<string, string[]> = {};
  let current = "header";
  for (const l of lines) {
    const m = l.match(SECTION_RE);
    if (m) {
      current = m[1].toLowerCase().replace(/\s+/g, "_");
      sections[current] = [];
      continue;
    }
    (sections[current] = sections[current] || []).push(l);
  }

  let summary = (sections["summary"] || sections["profile"] || sections["objective"] || []).join(" ").trim().slice(0, 1500);
  if (!summary) {
    const summaryFallback = headerLines
      .filter((l) => l && l !== name && l !== headline && !isContactLine(l))
      .slice(0, 3)
      .join(" ")
      .trim();
    if (summaryFallback.length > 40) summary = summaryFallback.slice(0, 1500);
  }

  const expLines =
    sections["experience"] ||
    sections["work_experience"] ||
    sections["professional_experience"] ||
    sections["employment"] ||
    [];

  const isBullet = (l: string) => /^[-•*●▪◦·]/.test(l);
  const experience: ResumeData["experience"] = [];
  let cur: ResumeData["experience"][number] | null = null;
  const dateRe = /(\b(19|20)\d{2}\b|present|current|\bjan\b|\bfeb\b|\bmar\b|\bapr\b|\bmay\b|\bjun\b|\bjul\b|\baug\b|\bsep\b|\boct\b|\bnov\b|\bdec\b)/i;

  const parseExperienceHeader = (line: string) => {
    const base = line.replace(/\s+/g, " ").trim();
    const dates = base.match(/((?:19|20)\d{2}|present|current)[^,\n]*?((?:19|20)\d{2}|present|current)?/i);
    const cleaned = base
      .replace(/\((?:19|20)\d{2}[^)]*\)/gi, "")
      .replace(/\b(?:19|20)\d{2}\b\s*[-to–—]*\s*\b(?:19|20)\d{2}|present|current\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    let company = "";
    let title = "";

    if (/\sat\s/i.test(cleaned)) {
      const [left, right] = cleaned.split(/\sat\s/i);
      title = (left || "").trim();
      company = (right || "").trim();
    } else if (/\s@\s/i.test(cleaned)) {
      const [left, right] = cleaned.split(/\s@\s/i);
      title = (left || "").trim();
      company = (right || "").trim();
    } else {
      const parts = cleaned.split(/\s[—–-]\s|\s\|\s|,\s/).map((p) => p.trim()).filter(Boolean);
      company = parts[0] || "";
      title = parts[1] || "";
    }

    return {
      company,
      title,
      start_date: dates?.[1] || "",
      end_date: dates?.[2] || (dates?.[1] ? "Present" : ""),
    };
  };

  for (const l of expLines) {
    if (isBullet(l)) {
      if (!cur) cur = { company: "", title: "", location: "", start_date: "", end_date: "Present", bullets: [] };
      cur.bullets.push(l.replace(/^[-•*●▪◦·]\s*/, "").trim());
    } else if (dateRe.test(l) || /[—–-]/.test(l) || /\b(at|@)\b/i.test(l)) {
      if (cur) experience.push(cur);
      const header = parseExperienceHeader(l);
      cur = {
        company: header.company,
        title: header.title,
        location: "",
        start_date: header.start_date,
        end_date: header.end_date,
        bullets: [],
      };
    } else if (cur) {
      // continuation line
      if (cur.bullets.length === 0) cur.title = (cur.title ? cur.title + " " : "") + l;
    }
  }
  if (cur) experience.push(cur);

  const eduLines = sections["education"] || [];
  const education: ResumeData["education"] = eduLines
    .filter((l) => !isBullet(l))
    .map((l) => {
      const yearMatch = l.match(/(19|20)\d{2}/g);
      return {
        school: l.split(/[—–|,]/)[1]?.trim() || l.split(/[—–|,]/)[0]?.trim() || l,
        degree: l.split(/[—–|,]/)[0]?.trim() || "",
        end_date: yearMatch?.[yearMatch.length - 1] || "",
        details: "",
      };
    });

  const skillsSection = sections["skills"] || sections["technical_skills"] || [];
  const skillsRaw = skillsSection.join(", ");
  const skills = skillsRaw
    .split(/[,•|;\n]/)
    .map((s) => s.replace(/^[-*●]\s*/, "").trim())
    .filter((s) => s.length > 1 && s.length < 60);

  // Fallback: if sections are weakly parsed, infer compact skill lists from whole text.
  const inferredSkills =
    skills.length > 0
      ? skills
      : Array.from(text.matchAll(/\b(JavaScript|TypeScript|Python|Java|C\+\+|React|Node(?:\.js)?|AWS|Docker|Kubernetes|SQL|PostgreSQL|MongoDB|Git)\b/gi)).map(
          (m) => m[0]
        );

  const dedupedSkills = Array.from(new Set(inferredSkills));

  const projectLines = sections["projects"] || [];
  const projects: NonNullable<ResumeData["projects"]> = [];
  let currentProject: { name: string; description: string; bullets: string[]; link?: string } | null = null;
  const flushCurrentProject = () => {
    if (!currentProject) return;
    const name = currentProject.name.trim();
    const description = currentProject.description.trim();
    const link = currentProject.link?.trim();
    if (!name) {
      currentProject = null;
      return;
    }
    projects.push({
      name,
      description,
      bullets: currentProject.bullets.length > 0 ? currentProject.bullets : linesToBullets(description),
      ...(link ? { link } : {}),
    });
    currentProject = null;
  };

  for (const rawLine of projectLines) {
    const hadBullet = /^[-•*●▪◦·]\s*/.test(rawLine);
    const line = rawLine.replace(/^[-•*●▪◦·]\s*/, "").trim();
    if (!line) continue;

    const urlMatch = line.match(/https?:\/\/\S+/i);
    const url = urlMatch?.[0];
    const lineWithoutUrl = (url ? line.replace(url, "") : line).replace(/\s+/g, " ").trim();
    if (!lineWithoutUrl && url) {
      if (!currentProject) currentProject = { name: "Project", description: "", bullets: [] };
      if (!currentProject.link) currentProject.link = url;
      continue;
    }

    const split = lineWithoutUrl.match(/^(.{2,80}?)(?:\s[-–—|:]\s)(.+)$/);
    const looksLikeTitleOnly =
      lineWithoutUrl.length <= 90 &&
      /^[A-Za-z0-9][A-Za-z0-9 &+/#().,_'’-]*$/.test(lineWithoutUrl) &&
      !/[.!?]$/.test(lineWithoutUrl);

    const startsNewProject = Boolean(split) || (!currentProject && hadBullet && looksLikeTitleOnly);

    if (startsNewProject) {
      flushCurrentProject();
      if (split) {
        currentProject = {
          name: split[1].trim(),
          description: split[2].trim(),
          bullets: [split[2].trim()].filter(Boolean),
          ...(url ? { link: url } : {}),
        };
      } else {
        currentProject = {
          name: lineWithoutUrl.slice(0, 90).trim(),
          description: "",
          bullets: [],
          ...(url ? { link: url } : {}),
        };
      }
      continue;
    }

    if (!currentProject) {
      currentProject = {
        name: lineWithoutUrl.slice(0, 90).trim(),
        description: "",
        bullets: [],
        ...(url ? { link: url } : {}),
      };
      continue;
    }

    if (hadBullet) {
      currentProject.bullets.push(lineWithoutUrl);
      currentProject.description = currentProject.bullets.join("\n");
    } else {
      currentProject.description = currentProject.description
        ? `${currentProject.description} ${lineWithoutUrl}`
        : lineWithoutUrl;
    }

    if (url && !currentProject.link) currentProject.link = url;
  }

  flushCurrentProject();

  return {
    name,
    headline,
    email: emailMatch?.[0] || "",
    phone: phoneMatch?.[0]?.trim() || "",
    location: "",
    links: urlMatches.slice(0, 5).map((u) => ({ label: u.replace(/^https?:\/\//, "").split("/")[0], url: u })),
    summary,
    experience,
    education,
    skills: dedupedSkills,
    projects,
  };
};

const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sub, loading: subLoading } = useSubscription(user?.id);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [title, setTitle] = useState("Untitled resume");
  const [data, setData] = useState<ResumeData>(EMPTY_RESUME);
  const [template, setTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [resumeId, setResumeId] = useState<string | undefined>(id);
  const [jobDescription, setJobDescription] = useState("");
  const [strictMode, setStrictMode] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [boostLoading, setBoostLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [suggestionLoading, setSuggestionLoading] = useState<string | null>(null);
  const [jdBulletMatches, setJdBulletMatches] = useState<JdBulletMatch[]>([]);
  const [bulletDiff, setBulletDiff] = useState<BulletDiffItem[]>([]);
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const importFromFile = async (file: File) => {
    if (file.size > 5_000_000) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const text = await fileToText(file);
      if (!text || text.length < 30) {
        toast({ title: "Couldn't extract text", description: "Try a different file.", variant: "destructive" });
        return;
      }

      let parsed: Partial<ResumeData> | null = null;
      try {
        const response = await resumeApi.parseUpload(text);
        if (response.success && response.data?.resumeData) {
          parsed = adaptResumeData(response.data.resumeData);
        }
      } catch {
        parsed = null;
      }

      if (!parsed) {
        parsed = parseResumeText(text);
      }

      setData((prev) => ({ ...prev, ...parsed }));
      if (!title || title === "Untitled resume") setTitle(file.name.replace(/\.[^.]+$/, ""));
      toast({
        title: "Resume imported",
        description: `Parsed ${text.length.toLocaleString()} chars and mapped fields for editing.`,
      });
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || "Could not parse file", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    if (!id || !user) { setLoading(false); return; }
    setBulletDiff([]);
    setLastScannedAt(null);
    (async () => {
      try {
        const response = await resumeApi.get(id);
        if (!response.success || !response.data) {
          toast({ title: "Resume not found", variant: "destructive" });
          navigate("/dashboard");
          return;
        }
        const row = response.data;
        setTitle(row.title);
        setTemplate(normalizeTemplate(row.template));
        setData(adaptResumeData(row.resumeData));
        setAiResult((row.aiResult as AiResult) || null);
        setJobDescription((row.jobDescription as string) || "");
      } catch {
        toast({ title: "Resume not found", variant: "destructive" });
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, navigate]);

  const isPro = sub?.plan === "pro";

  useEffect(() => {
    if (subLoading) return;
    if (!isPro && isPremiumTemplate(template)) {
      setTemplate(DEFAULT_TEMPLATE);
      toast({ title: "Pro template locked", description: "Upgrade to Pro to use premium templates." });
    }
  }, [isPro, subLoading, template]);

  const selectTemplate = (nextTemplate: TemplateId) => {
    if (isPremiumTemplate(nextTemplate) && !isPro) {
      toast({ title: "Pro template", description: "Upgrade to Pro to unlock premium resume templates." });
      return;
    }
    setTemplate(nextTemplate);
  };

  useEffect(() => {
    if (!scanLoading) return;
    setScanProgress(8);
    const timer = window.setInterval(() => {
      setScanProgress((p) => Math.min(p + Math.floor(Math.random() * 8 + 4), 92));
    }, 220);
    return () => window.clearInterval(timer);
  }, [scanLoading]);

  useEffect(() => {
    if (!aiResult) {
      setJdBulletMatches([]);
      return;
    }
    setJdBulletMatches(extractJdBulletMatches(data, aiResult.keywords));
  }, [aiResult, data]);

  // Live ATS — recomputes instantly on every edit (deterministic, no AI call)
  const liveAts = useMemo(() => computeAts(data, jobDescription, aiResult), [data, jobDescription, aiResult]);

  const runMagicScan = async () => {
    if (!user) return;
    if (jobDescription.trim().length < 80) {
      toast({ title: "Add more JD details", description: "Paste at least 80 characters from the target job description." });
      return;
    }

    const resumeText = resumeToPlainText(data);
    const beforeScanData = data;
    if (resumeText.length < 120) {
      toast({ title: "Resume too short", description: "Add more resume content before running the JD scan." });
      return;
    }

    setScanLoading(true);
    setScanProgress(12);

    try {
      const response = await resumeApi.rewrite(resumeText, jobDescription);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to rewrite resume");
      }

      const result = response.data.aiResult as AiResult;
      const adapted = adaptResumeData(result.resumeData);
      setData(adapted);
      setAiResult({ ...result, resumeData: adapted });
      setJdBulletMatches(extractJdBulletMatches(adapted, result.keywords || []));
      setBulletDiff(buildBulletDiff(beforeScanData, adapted));
      setScanProgress(100);
      setLastScannedAt(new Date().toISOString());

      toast({
        title: "Magic scan complete",
        description: "JD-aligned bullets and strict AI optimizations were applied to your resume.",
      });
    } catch (e: any) {
      toast({ title: "Magic scan failed", description: e?.message || "AI scan failed", variant: "destructive" });
    } finally {
      window.setTimeout(() => {
        setScanLoading(false);
        setScanProgress(0);
      }, 350);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const sourceText = resumeToPlainText(data);
    const templateToSave = !isPro && isPremiumTemplate(template) ? DEFAULT_TEMPLATE : template;
    const payload = {
      title,
      sourceText,
      jobDescription,
      resumeData: data,
      template: templateToSave,
      aiResult: aiResult as any,
      atsScore: aiResult?.atsScore ?? null,
      optimizedScore: aiResult?.optimizedScore ?? null,
    };

    try {
      if (resumeId) {
        const response = await resumeApi.update(resumeId, payload);
        if (!response.success) throw new Error(response.message);
        toast({ title: "Saved" });
      } else {
        const response = await resumeApi.create(payload);
        if (!response.success) throw new Error(response.message);
        setResumeId(response.data!._id);
        navigate(`/editor/${response.data!._id}`, { replace: true });
        toast({ title: "Saved" });
      }
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await exportNodeToPdf(previewRef.current, `${title.replace(/[^a-z0-9]/gi, "_") || "resume"}.pdf`);
      toast({ title: "PDF downloaded" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const updateExp = (idx: number, patch: Partial<ResumeData["experience"][number]>) =>
    setData((d) => ({ ...d, experience: d.experience.map((e, i) => (i === idx ? { ...e, ...patch } : e)) }));

  const addExp = () =>
    setData((d) => ({ ...d, experience: [...d.experience, { company: "", title: "", location: "", start_date: "", end_date: "Present", bullets: [""] }] }));

  const updateEdu = (idx: number, patch: Partial<ResumeData["education"][number]>) =>
    setData((d) => ({ ...d, education: d.education.map((e, i) => (i === idx ? { ...e, ...patch } : e)) }));

  const addEdu = () =>
    setData((d) => ({ ...d, education: [...d.education, { school: "", degree: "", end_date: "" }] }));

  const updateProject = (idx: number, patch: Partial<NonNullable<ResumeData["projects"]>[number]>) =>
    setData((d) => ({
      ...d,
      projects: (d.projects || []).map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));

  const addProject = () =>
    setData((d) => ({
      ...d,
      projects: [...(d.projects || []), { name: "", description: "", bullets: [""], link: "" }],
    }));

  const applySuggestionPrompt = async (suggestion: string) => {
    if (!user) return;
    if (!isPro) {
      toast({ title: "Pro prompt", description: "Upgrade to Pro to apply JD suggestion prompts." });
      return;
    }
    if (!jobDescription.trim()) {
      toast({ title: "Add a JD first", description: "Suggestion prompts need the target job description." });
      return;
    }

    const beforeSuggestionData = data;
    setSuggestionLoading(suggestion);
    try {
      const response = await resumeApi.applySuggestion(resumeId, data, jobDescription, suggestion);
      if (!response.success || !response.data?.suggestionResult) {
        throw new Error(response.message || "Failed to apply suggestion");
      }

      const result = response.data.suggestionResult as AiResult;
      const adapted = adaptResumeData(result.resumeData);
      setData(adapted);
      setAiResult((prev) => ({
        ...(prev || result),
        ...result,
        resumeData: adapted,
        suggestions: result.suggestions || prev?.suggestions || [],
      }));
      setBulletDiff(buildBulletDiff(beforeSuggestionData, adapted));
      setLastScannedAt(new Date().toISOString());
      toast({ title: "Suggestion applied", description: "Ai expanded the resume around that prompt." });
    } catch (e: any) {
      toast({ title: "Suggestion failed", description: e?.message || "Could not apply prompt", variant: "destructive" });
    } finally {
      setSuggestionLoading(null);
    }
  };

  const applyAtsBoost = (next: ResumeData) => {
    setData(next);
    requestAnimationFrame(() => {
      previewScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  if (loading) {
    return (
      <div className="editor-glass-theme min-h-screen bg-transparent">
        <AppHeader active="editor" />
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  return (
    <div className="editor-glass-theme min-h-screen bg-transparent">
      <AppHeader active="editor" />
      <main className="container py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="text-lg font-display font-semibold max-w-md" placeholder="Resume title" />
          <div className="flex gap-2 flex-wrap">
            <label className="inline-flex">
              <Button variant="outline" disabled={importing} asChild>
                <span className="cursor-pointer">
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {importing ? "Importing..." : "Upload resume"}
                </span>
              </Button>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importFromFile(e.target.files[0])}
                disabled={importing}
              />
            </label>
            <Button variant="outline" onClick={() => navigate("/cover-letter", { state: { resumeId } })}>
              <Mail className="w-3.5 h-3.5" /> Cover letter
            </Button>
            <Button variant="outline" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </Button>
            <Button variant="hero" onClick={exportPdf} disabled={exporting}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Download PDF
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Original ATS</div>
            <div className="text-2xl font-display font-bold mb-2">
              {aiResult?.atsScore ?? "—"}<span className="text-sm text-muted-foreground"> / 100</span>
            </div>
            <Progress value={aiResult?.atsScore ?? 0} />
            <div className="text-[10px] text-muted-foreground mt-2">
              {aiResult ? "Score before AI optimization" : "Run Magic Scan to capture baseline"}
            </div>
          </Card>
          <Card className="p-4 border-accent/40 shadow-card bg-card">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs uppercase tracking-wider text-accent flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Live Optimized ATS
              </div>
              <Badge variant="outline" className="text-[9px] uppercase tracking-wide border-accent/50 text-accent">
                {liveAts.grade}
              </Badge>
            </div>
            <div className="text-2xl font-display font-bold mb-2 text-foreground">
              {liveAts.score}<span className="text-sm text-muted-foreground font-normal"> / 100</span>
            </div>
            <Progress value={liveAts.score} className="h-2 bg-secondary" />
            <div className="text-[10px] text-muted-foreground mt-2">{liveAts.band}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top keywords</div>
            <div className="flex flex-wrap gap-1">
              {(aiResult?.keywords ?? []).slice(0, 8).map((k, i) => (
                <Badge key={i} variant="outline" className="text-[10px] gap-1">
                  {k.presentInResume ? <CheckCircle2 className="w-2.5 h-2.5 text-accent" /> : <AlertCircle className="w-2.5 h-2.5 text-muted-foreground" />}
                  {k.term}
                </Badge>
              ))}
              {(!aiResult || aiResult.keywords.length === 0) && (
                <span className="text-[11px] text-muted-foreground">Run Magic Scan to extract JD keywords.</span>
              )}
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: editor — fixed height, internal scroll */}
          <Card className="min-w-0 p-4 h-[calc(100vh-260px)] min-h-[560px] flex flex-col overflow-hidden">
            <Tabs defaultValue="basics" className="flex flex-col h-full overflow-hidden">
              <TabsList className="grid grid-cols-4 sm:grid-cols-8 h-auto mb-3 shrink-0 gap-1 [&_[role=tab]]:px-2 [&_[role=tab]]:text-[11px]">
                <TabsTrigger value="basics">Basics</TabsTrigger>
                <TabsTrigger value="exp">Experience</TabsTrigger>
                <TabsTrigger value="edu">Education</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
                <TabsTrigger value="scanner" className="gap-1">
                  <Wand2 className="w-3 h-3" /> Scanner
                </TabsTrigger>
                <TabsTrigger value="ats" className="gap-1">
                  <ShieldCheck className="w-3 h-3" /> ATS
                  <Badge variant="outline" className="ml-0.5 text-[9px] px-1 py-0 h-4 leading-none border-accent/40 text-accent">
                    {liveAts.score}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-y-auto pr-2 -mr-2">

              <TabsContent value="basics" className="space-y-3 m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Full name</Label><Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} maxLength={80} /></div>
                  <div><Label>Headline</Label><Input value={data.headline} onChange={(e) => setData({ ...data, headline: e.target.value })} maxLength={120} placeholder="Senior Software Engineer" /></div>
                  <div><Label>Email</Label><Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} maxLength={255} /></div>
                  <div><Label>Phone</Label><Input value={data.phone || ""} onChange={(e) => setData({ ...data, phone: e.target.value })} maxLength={40} /></div>
                  <div className="sm:col-span-2"><Label>Location</Label><Input value={data.location || ""} onChange={(e) => setData({ ...data, location: e.target.value })} maxLength={120} /></div>
                </div>
                <div>
                  <Label>Professional summary</Label>
                  <Textarea value={data.summary} onChange={(e) => setData({ ...data, summary: e.target.value })} className="min-h-[100px]" maxLength={1000} />
                </div>
              </TabsContent>

              <TabsContent value="exp" className="space-y-4 m-0">
                {data.experience.map((exp, i) => (
                  <Card key={i} className="p-4 space-y-2 bg-amber-500/5 border-amber-300/20 shadow-card">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-semibold text-muted-foreground">Experience #{i + 1}</div>
                      <Button size="icon" variant="ghost" onClick={() => setData({ ...data, experience: data.experience.filter((_, x) => x !== i) })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input placeholder="Company" value={exp.company} onChange={(e) => updateExp(i, { company: e.target.value })} maxLength={120} />
                      <Input placeholder="Title" value={exp.title} onChange={(e) => updateExp(i, { title: e.target.value })} maxLength={120} />
                      <Input placeholder="Start date" value={exp.start_date} onChange={(e) => updateExp(i, { start_date: e.target.value })} maxLength={40} />
                      <Input placeholder="End date" value={exp.end_date} onChange={(e) => updateExp(i, { end_date: e.target.value })} maxLength={40} />
                      <Input className="sm:col-span-2" placeholder="Location" value={exp.location || ""} onChange={(e) => updateExp(i, { location: e.target.value })} maxLength={120} />
                    </div>
                    <Label className="text-xs">Bullets (one per line)</Label>
                    <Textarea value={exp.bullets.join("\n")} onChange={(e) => updateExp(i, { bullets: e.target.value.split("\n").filter(Boolean) })} className="min-h-[120px] text-xs" />
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addExp}><Plus className="w-3.5 h-3.5" /> Add experience</Button>
              </TabsContent>

              <TabsContent value="edu" className="space-y-4 m-0">
                {data.education.map((edu, i) => (
                  <Card key={i} className="p-4 space-y-2 bg-amber-500/5 border-amber-300/20 shadow-card">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-semibold text-muted-foreground">Education #{i + 1}</div>
                      <Button size="icon" variant="ghost" onClick={() => setData({ ...data, education: data.education.filter((_, x) => x !== i) })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input placeholder="School" value={edu.school} onChange={(e) => updateEdu(i, { school: e.target.value })} maxLength={160} />
                      <Input placeholder="Degree" value={edu.degree} onChange={(e) => updateEdu(i, { degree: e.target.value })} maxLength={160} />
                      <Input placeholder="Start" value={edu.start_date || ""} onChange={(e) => updateEdu(i, { start_date: e.target.value })} maxLength={40} />
                      <Input placeholder="End / Year" value={edu.end_date} onChange={(e) => updateEdu(i, { end_date: e.target.value })} maxLength={40} />
                      <Input className="sm:col-span-2" placeholder="Details (GPA, honors)" value={edu.details || ""} onChange={(e) => updateEdu(i, { details: e.target.value })} maxLength={200} />
                    </div>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addEdu}><Plus className="w-3.5 h-3.5" /> Add education</Button>
              </TabsContent>

              <TabsContent value="skills" className="space-y-3 m-0">
                <Label>Skills (comma-separated)</Label>
                <Textarea value={data.skills.join(", ")} onChange={(e) => setData({ ...data, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="min-h-[120px]" />
              </TabsContent>

              <TabsContent value="projects" className="space-y-4 m-0">
                {(data.projects || []).map((project, i) => (
                  <Card key={i} className="p-4 space-y-2 bg-amber-500/5 border-amber-300/20 shadow-card">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-semibold text-muted-foreground">Project #{i + 1}</div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setData({ ...data, projects: (data.projects || []).filter((_, x) => x !== i) })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Project name"
                        value={project.name}
                        onChange={(e) => updateProject(i, { name: e.target.value })}
                        maxLength={120}
                      />
                      <Input
                        placeholder="Project link (optional)"
                        value={project.link || ""}
                        onChange={(e) => updateProject(i, { link: e.target.value })}
                        maxLength={255}
                      />
                    </div>
                    <Label className="text-xs">Bullets (one per line)</Label>
                    <Textarea
                      value={projectBulletLines(project).join("\n")}
                      onChange={(e) => {
                        const bullets = linesToBullets(e.target.value);
                        updateProject(i, { bullets, description: bullets.join("\n") });
                      }}
                      className="min-h-[100px] text-xs"
                      maxLength={1200}
                    />
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addProject}><Plus className="w-3.5 h-3.5" /> Add project</Button>
              </TabsContent>

              <TabsContent value="style" className="space-y-3 m-0">
                <Label>Template</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${template === t.id ? "border-accent bg-accent/5 shadow-glow" : "border-border hover:border-accent/40"}`}
                    >
                      <div className="mb-2">
                        <TemplateThumbnail id={t.id} />
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-medium text-sm leading-tight">{t.label}</div>
                        {t.premium && (
                          <Badge variant={isPro ? "secondary" : "outline"} className="text-[10px] gap-1 uppercase tracking-wide">
                            <Crown className="w-2.5 h-2.5" /> Pro
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                      {t.premium && !isPro && <div className="text-[11px] text-accent mt-1">Upgrade to unlock</div>}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="scanner" className="space-y-3 m-0">
                <Card className="p-4 bg-amber-500/5 border-amber-300/20 shadow-card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <Wand2 className="w-4 h-4 text-accent" /> Magic JD Scanner
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Scan your full resume against the target JD and apply strict AI optimization.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor="strict-mode" className="text-xs">Strict</Label>
                      <Switch id="strict-mode" checked={strictMode} onCheckedChange={setStrictMode} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Target Job Description</Label>
                    <Textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="min-h-[160px] text-xs mt-1"
                      placeholder="Paste the full JD to scan, match keywords, and strictly optimize role-specific bullets..."
                    />
                  </div>
                  {aiResult?.suggestions && aiResult.suggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Suggested prompts
                        </div>
                        <Badge variant={isPro ? "secondary" : "outline"} className="text-[10px] gap-1 uppercase tracking-wide">
                          <Crown className="w-2.5 h-2.5" /> Pro
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {aiResult.suggestions.slice(0, 6).map((suggestion, i) => (
                          <button
                            key={`${suggestion}-${i}`}
                            type="button"
                            onClick={() => applySuggestionPrompt(suggestion)}
                            disabled={suggestionLoading !== null}
                            className={`jd-prompt-chip inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-[11px] leading-snug transition ${
                              isPro
                                ? "border-accent/40 bg-accent/10 text-foreground hover:border-accent hover:bg-accent/20"
                                : "border-border bg-background/50 text-muted-foreground"
                            }`}
                            style={{ animationDelay: `${i * 110}ms` }}
                            title={isPro ? "Apply this Groq prompt" : "Upgrade to Pro to apply prompts"}
                          >
                            {suggestionLoading === suggestion ? (
                              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 shrink-0 text-accent" />
                            )}
                            <span className="line-clamp-2">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                      {!isPro && (
                        <div className="text-[11px] text-muted-foreground">
                          Pro users can click a prompt to have Groq write more around that suggestion.
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="hero" size="sm" onClick={runMagicScan} disabled={scanLoading}>
                      {scanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      {scanLoading ? "Scanning and optimizing..." : "Run Magic Scan"}
                    </Button>
                    {lastScannedAt && (
                      <span className="text-[11px] text-muted-foreground">Last scan: {new Date(lastScannedAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                  {scanLoading && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-muted-foreground">Analyzing resume vs JD...</div>
                      <Progress value={scanProgress} />
                    </div>
                  )}
                  {jdBulletMatches.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">JD-related bullets</div>
                      <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
                        {jdBulletMatches.map((match, i) => (
                          <div key={`${match.keyword}-${i}`} className="rounded-md border border-border bg-background p-2">
                            <div className="text-[11px] text-accent font-medium mb-1">{match.keyword} · {match.importance}</div>
                            <div className="text-xs text-foreground leading-relaxed">{match.bullet}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="ats" className="m-0">
                <AtsPanel
                  data={data}
                  jobDescription={jobDescription}
                  aiResult={aiResult}
                  onApplyBoost={applyAtsBoost}
                  onBoostingChange={setBoostLoading}
                />
              </TabsContent>
              </div>
            </Tabs>
          </Card>

          {/* RIGHT: live preview — matching card height, internal scroll */}
          <Card className="min-w-0 relative h-[calc(100vh-260px)] min-h-[560px] flex flex-col overflow-hidden bg-secondary/40">
            {(scanLoading || boostLoading || suggestionLoading) && (
              <div className="magic-scan-overlay pointer-events-none absolute inset-0 z-20">
                <div className="magic-scan-grid" />
                <div className="magic-scan-line" />
                <div className="absolute top-3 right-3 text-[11px] px-2 py-1 rounded bg-zinc-950/80 text-cyan-200 border border-cyan-300/30">
                  {suggestionLoading ? "Applying Groq prompt..." : boostLoading ? "ATS boost in progress..." : "AI JD scan in progress..."}
                </div>
              </div>
            )}
            <div className="shrink-0 px-4 py-3 border-b border-border bg-background/70 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-display font-semibold">Live Preview</div>
                  <div className="text-[11px] text-muted-foreground">Letter size resume view</div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{template.replace(/_/g, " ")}</Badge>
              </div>
            </div>
            <div ref={previewScrollRef} className="flex-1 overflow-auto p-3 flex justify-center items-stretch">
              <ResumePreview data={data} template={template} fillHeight />
            </div>
          </Card>
        </div>

        <div className="fixed left-[-10000px] top-0 pointer-events-none" aria-hidden="true">
          <ResumePreview ref={previewRef} data={data} template={template} />
        </div>

        {lastScannedAt && (
          <Card className="p-5 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-display font-semibold">Before vs After Bullet Diff</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{bulletDiff.length} changes</Badge>
            </div>

            {bulletDiff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bullet-level edits were needed in the latest AI scan.</p>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                {bulletDiff.map((diff, index) => (
                  <div key={`${diff.roleLabel}-${index}`} className="rounded-lg border border-amber-300/20 bg-amber-500/5 p-3 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="text-xs font-semibold text-muted-foreground">{diff.roleLabel}</div>
                      <Badge variant={diff.status === "updated" ? "secondary" : "outline"} className="text-[10px] uppercase tracking-wide">
                        {statusLabel[diff.status]}
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-2">
                      <div className="rounded-md border border-border bg-background/60 p-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Before</div>
                        <p className="text-xs leading-relaxed text-foreground">{diff.before || "-"}</p>
                      </div>

                      <div className="rounded-md border border-accent/40 bg-accent/5 p-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">After</div>
                        <p className="text-xs leading-relaxed text-foreground">{diff.after || "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default Editor;
