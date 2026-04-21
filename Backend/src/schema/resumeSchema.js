const { z } = require("zod");

const dateSchema = z
  .object({
    month: z.number().int().min(1).max(12).nullable().optional(),
    year: z.number().int().min(1950).max(2100),
    present: z.boolean().optional()
  })
  .optional();

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url()
});

const profileSchema = z.object({
  fullName: z.string().default(""),
  title: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  summary: z.string().default(""),
  links: z.array(linkSchema).default([])
});

const experienceSchema = z.object({
  id: z.string().min(1),
  company: z.string().default(""),
  role: z.string().default(""),
  location: z.string().default(""),
  startDate: dateSchema,
  endDate: dateSchema,
  bullets: z.array(z.string()).default([])
});

const educationSchema = z.object({
  id: z.string().min(1),
  institution: z.string().default(""),
  degree: z.string().default(""),
  field: z.string().default(""),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  highlights: z.array(z.string()).default([])
});

const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  stack: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
  link: z.string().url().optional().or(z.literal(""))
});

const skillSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string()).default([])
});

const certificationSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(""),
  issuer: z.string().default(""),
  year: z.number().int().min(1950).max(2100).nullable().optional()
});

const resumeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  profile: profileSchema,
  experience: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  projects: z.array(projectSchema).default([]),
  skills: z.array(skillSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  metadata: z
    .object({
      createdAt: z.string(),
      updatedAt: z.string()
    })
    .optional()
});

const defaultResume = {
  schemaVersion: "1.0",
  profile: {
    fullName: "",
    title: "",
    email: "candidate@example.com",
    phone: "",
    location: "",
    summary: "",
    links: []
  },
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: []
};

function normalizeResumeInput(input) {
  return {
    ...defaultResume,
    ...input,
    profile: {
      ...defaultResume.profile,
      ...(input?.profile || {})
    },
    experience: Array.isArray(input?.experience)
      ? input.experience.map((item) => ({
          ...item,
          bullets: Array.isArray(item.bullets)
            ? item.bullets.filter(Boolean)
            : []
        }))
      : [],
    education: Array.isArray(input?.education) ? input.education : [],
    projects: Array.isArray(input?.projects)
      ? input.projects.map((item) => ({
          ...item,
          stack: Array.isArray(item.stack) ? item.stack : [],
          bullets: Array.isArray(item.bullets) ? item.bullets : []
        }))
      : [],
    skills: Array.isArray(input?.skills) ? input.skills : [],
    certifications: Array.isArray(input?.certifications)
      ? input.certifications
      : []
  };
}

module.exports = {
  resumeSchema,
  defaultResume,
  normalizeResumeInput
};
