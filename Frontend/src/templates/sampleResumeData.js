export const SAMPLE_RESUME_DATA = {
  profile: {
    fullName: "Diya Agarwal",
    title: "Retail Sales Associate",
    email: "d.agarwal@example.in",
    phone: "+91 11 5555 3345",
    location: "New Delhi, India 110034",
    summary:
      "Customer-focused retail sales professional with strong understanding of retail dynamics, customer service, and revenue-generating communication. 5+ years of experience driving product recommendations and repeat business through precise execution and trust-building interactions.",
    links: []
  },
  experience: [
    {
      id: "exp-sample-1",
      company: "ZARA",
      role: "Retail Sales Associate",
      location: "New Delhi, India",
      bullets: [
        "Increased monthly sales by 10% through upselling and cross-selling strategies tailored to customer intent.",
        "Prevented store losses by identifying and escalating risk signals with attention to detail.",
        "Processed payments and maintained accurate drawer reconciliation across peak traffic windows."
      ]
    },
    {
      id: "exp-sample-2",
      company: "Dunkin Donuts",
      role: "Barista",
      location: "New Delhi, India",
      bullets: [
        "Upsold seasonal beverages and pastries, improving average order value by INR 1500 weekly.",
        "Managed morning rush with 300+ daily customers while sustaining high service consistency.",
        "Trained 15 baristas in smoothie and latte preparation standards and shift handoff routines."
      ]
    }
  ],
  education: [
    {
      id: "edu-sample-1",
      institution: "Oxford Software Institute & Oxford School of English",
      degree: "Diploma in Financial Accounting",
      field: "",
      startYear: null,
      endYear: 2016,
      highlights: []
    }
  ],
  projects: [
    {
      id: "proj-sample-1",
      name: "Retail Service Optimization",
      stack: ["Operations", "Customer Service", "Reporting"],
      bullets: [
        "Built a weekly customer-behavior report that improved inventory positioning and queue service speed."
      ],
      link: ""
    }
  ],
  skills: [
    {
      category: "Core Skills",
      items: [
        "Cash register operation",
        "Sales expertise",
        "Inventory management",
        "POS system operation",
        "Teamwork",
        "Retail merchandising expertise"
      ]
    }
  ],
  certifications: [],
  languages: [
    { name: "Hindi", level: "Native speaker", score: 100 },
    { name: "English", level: "C2", score: 88 },
    { name: "Bengali", level: "B2", score: 72 }
  ]
};

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pickText(userValue, sampleValue) {
  return hasText(userValue) ? userValue : sampleValue;
}

function pickList(userList, sampleList) {
  return Array.isArray(userList) && userList.length ? userList : sampleList;
}

function hasUsefulBullets(bullets) {
  return Array.isArray(bullets) && bullets.some((item) => hasText(item));
}

function hasMeaningfulExperience(exp) {
  if (!exp) return false;
  return (
    hasText(exp.company) ||
    hasText(exp.role) ||
    hasText(exp.location) ||
    hasUsefulBullets(exp.bullets)
  );
}

function mergeExperience(userExperience = []) {
  if (!userExperience.some(hasMeaningfulExperience)) {
    return SAMPLE_RESUME_DATA.experience;
  }

  return userExperience
    .filter(Boolean)
    .map((entry, index) => {
      const sample = SAMPLE_RESUME_DATA.experience[index] ||
        SAMPLE_RESUME_DATA.experience[SAMPLE_RESUME_DATA.experience.length - 1];

      return {
        id: entry.id || sample.id,
        company: pickText(entry.company, sample.company),
        role: pickText(entry.role, sample.role),
        location: pickText(entry.location, sample.location),
        bullets: pickList(
          (entry.bullets || []).filter((bullet) => hasText(bullet)),
          sample.bullets
        )
      };
    });
}

function mergeEducation(userEducation = []) {
  if (!Array.isArray(userEducation) || !userEducation.length) {
    return SAMPLE_RESUME_DATA.education;
  }

  return userEducation
    .filter(Boolean)
    .map((entry, index) => {
      const sample = SAMPLE_RESUME_DATA.education[index] ||
        SAMPLE_RESUME_DATA.education[SAMPLE_RESUME_DATA.education.length - 1];

      return {
        id: entry.id || sample.id,
        institution: pickText(entry.institution, sample.institution),
        degree: pickText(entry.degree, sample.degree),
        field: pickText(entry.field, sample.field),
        startYear: entry.startYear ?? sample.startYear,
        endYear: entry.endYear ?? sample.endYear,
        highlights: pickList(entry.highlights, sample.highlights)
      };
    });
}

function mergeProjects(userProjects = []) {
  if (!Array.isArray(userProjects) || !userProjects.length) {
    return SAMPLE_RESUME_DATA.projects;
  }

  return userProjects
    .filter(Boolean)
    .map((entry, index) => {
      const sample = SAMPLE_RESUME_DATA.projects[index] ||
        SAMPLE_RESUME_DATA.projects[SAMPLE_RESUME_DATA.projects.length - 1];

      return {
        id: entry.id || sample.id,
        name: pickText(entry.name, sample.name),
        stack: pickList((entry.stack || []).filter((item) => hasText(item)), sample.stack),
        bullets: pickList((entry.bullets || []).filter((item) => hasText(item)), sample.bullets),
        link: hasText(entry.link) ? entry.link : sample.link
      };
    });
}

function mergeCertifications(userCerts = []) {
  if (!Array.isArray(userCerts) || !userCerts.length) {
    return SAMPLE_RESUME_DATA.certifications;
  }

  return userCerts.filter(Boolean).map((entry, index) => {
    const sample = SAMPLE_RESUME_DATA.certifications[index] || {
      id: `cert-sample-${index + 1}`,
      name: "",
      issuer: "",
      year: null
    };

    return {
      id: entry.id || sample.id,
      name: pickText(entry.name, sample.name),
      issuer: pickText(entry.issuer, sample.issuer),
      year: entry.year ?? sample.year
    };
  });
}

export function resolveTemplatePreviewData(userData = {}) {
  const profile = userData.profile || {};
  const sampleProfile = SAMPLE_RESUME_DATA.profile;

  const userSkills = Array.isArray(userData.skills)
    ? userData.skills.flatMap((group) => group?.items || []).filter((item) => hasText(item))
    : [];

  return {
    ...SAMPLE_RESUME_DATA,
    ...userData,
    profile: {
      ...sampleProfile,
      ...profile,
      fullName: pickText(profile.fullName, sampleProfile.fullName),
      title: pickText(profile.title, sampleProfile.title),
      email: pickText(profile.email, sampleProfile.email),
      phone: pickText(profile.phone, sampleProfile.phone),
      location: pickText(profile.location, sampleProfile.location),
      summary: pickText(profile.summary, sampleProfile.summary)
    },
    experience: mergeExperience(userData.experience || []),
    education: mergeEducation(userData.education || []),
    projects: mergeProjects(userData.projects || []),
    certifications: mergeCertifications(userData.certifications || []),
    skills: [
      {
        category: "Core Skills",
        items: userSkills.length ? userSkills : SAMPLE_RESUME_DATA.skills[0].items
      }
    ],
    languages: SAMPLE_RESUME_DATA.languages
  };
}
