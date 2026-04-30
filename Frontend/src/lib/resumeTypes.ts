export type ResumeLink = { label: string; url: string };
export type ResumeExperience = {
  company: string;
  title: string;
  location?: string;
  start_date: string;
  end_date: string;
  bullets: string[];
};
export type ResumeEducation = {
  school: string;
  degree: string;
  start_date?: string;
  end_date: string;
  details?: string;
};
export type ResumeProject = { name: string; description: string; bullets?: string[]; link?: string };

export type ResumeData = {
  name: string;
  headline: string;
  email: string;
  phone?: string;
  location?: string;
  links?: ResumeLink[];
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  projects?: ResumeProject[];
};

export type Keyword = { term: string; importance: "critical" | "high" | "medium"; presentInResume?: boolean };

export type AiResult = {
  atsScore: number;
  optimizedScore: number;
  keywords: Keyword[];
  resumeData: ResumeData;
  suggestions: string[];
};

export const EMPTY_RESUME: ResumeData = {
  name: "",
  headline: "",
  email: "",
  phone: "",
  location: "",
  links: [],
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
};

export const projectBulletLines = (project: ResumeProject): string[] => {
  if (Array.isArray(project.bullets) && project.bullets.length > 0) {
    return project.bullets.map((b) => b.trim()).filter(Boolean);
  }

  return (project.description || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•●▪◦·]\s*/, "").trim())
    .filter(Boolean);
};

export type TemplateId =
  | "modern"
  | "classic"
  | "minimal"
  | "executive"
  | "creative_two_column"
  | "tech"
  | "elegant_serif"
  | "bold_accent"
  | "compact_pro";
