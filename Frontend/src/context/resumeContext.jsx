import React, { createContext, useContext, useMemo, useReducer } from "react";

const defaultState = {
  resumeId: null,
  isSaving: false,
  lastSavedAt: null,
  magicScan: {
    active: false,
    progress: 0
  },
  data: {
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
    experience: [
      {
        id: "exp-1",
        company: "",
        role: "",
        location: "",
        bullets: [""]
      }
    ],
    education: [
      {
        id: "edu-1",
        institution: "",
        degree: "",
        field: "",
        startYear: null,
        endYear: null,
        highlights: []
      }
    ],
    projects: [
      {
        id: "proj-1",
        name: "",
        stack: [],
        bullets: [""],
        link: ""
      }
    ],
    skills: [
      {
        category: "Core Skills",
        items: []
      }
    ],
    certifications: [
      {
        id: "cert-1",
        name: "",
        issuer: "",
        year: null
      }
    ]
  }
};

function createInitialState() {
  return {
    ...defaultState,
    data: normalizeLoadedResumeData(defaultState.data),
    resumeId: null,
    isSaving: false,
    lastSavedAt: null,
    magicScan: { ...defaultState.magicScan }
  };
}

function normalizeLoadedResumeData(data) {
  const safeData = data || {};

  return {
    ...defaultState.data,
    ...safeData,
    profile: {
      ...defaultState.data.profile,
      ...(safeData.profile || {})
    },
    experience:
      Array.isArray(safeData.experience) && safeData.experience.length
        ? safeData.experience
        : defaultState.data.experience,
    education:
      Array.isArray(safeData.education) && safeData.education.length
        ? safeData.education
        : defaultState.data.education,
    projects:
      Array.isArray(safeData.projects) && safeData.projects.length
        ? safeData.projects
        : defaultState.data.projects,
    skills:
      Array.isArray(safeData.skills) && safeData.skills.length
        ? safeData.skills
        : defaultState.data.skills,
    certifications:
      Array.isArray(safeData.certifications) && safeData.certifications.length
        ? safeData.certifications
        : defaultState.data.certifications
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "RESET_STATE":
      return createInitialState();
    case "SET_RESUME_ID":
      return { ...state, resumeId: action.payload };
    case "SET_SAVING":
      return { ...state, isSaving: action.payload };
    case "SET_LAST_SAVED":
      return { ...state, lastSavedAt: action.payload };
    case "SET_MAGIC_SCAN_STATE":
      return {
        ...state,
        magicScan: {
          ...state.magicScan,
          ...(action.payload && typeof action.payload === "object" ? action.payload : {})
        }
      };
    case "LOAD_RESUME":
      return {
        ...state,
        resumeId: action.payload.id,
        data: normalizeLoadedResumeData(action.payload.data),
        lastSavedAt: action.payload.metadata?.updatedAt || null,
        magicScan: { ...defaultState.magicScan }
      };
    case "UPDATE_PROFILE_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          profile: {
            ...state.data.profile,
            [action.field]: action.value
          }
        }
      };
    case "UPDATE_EXPERIENCE_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          experience: state.data.experience.map((item, idx) =>
            idx === action.index ? { ...item, [action.field]: action.value } : item
          )
        }
      };
    case "UPDATE_EXPERIENCE_BULLET":
      return {
        ...state,
        data: {
          ...state.data,
          experience: state.data.experience.map((item, idx) => {
            if (idx !== action.index) return item;
            const sourceBullets = Array.isArray(item.bullets) && item.bullets.length
              ? item.bullets
              : [""];
            const nextBullets = sourceBullets.map((bullet, bulletIndex) =>
              bulletIndex === action.bulletIndex ? action.value : bullet
            );
            return { ...item, bullets: nextBullets };
          })
        }
      };
    case "ADD_EXPERIENCE_BULLET":
      return {
        ...state,
        data: {
          ...state.data,
          experience: state.data.experience.map((item, idx) =>
            idx === action.index
              ? {
                  ...item,
                  bullets: [
                    ...(Array.isArray(item.bullets) && item.bullets.length ? item.bullets : [""]),
                    ""
                  ]
                }
              : item
          )
        }
      };
    case "REMOVE_EXPERIENCE_BULLET":
      return {
        ...state,
        data: {
          ...state.data,
          experience: state.data.experience.map((item, idx) => {
            if (idx !== action.index) return item;

            const sourceBullets = Array.isArray(item.bullets) && item.bullets.length
              ? item.bullets
              : [""];
            const nextBullets = sourceBullets.filter((_, bulletIndex) => bulletIndex !== action.bulletIndex);

            return {
              ...item,
              bullets: nextBullets.length ? nextBullets : [""]
            };
          })
        }
      };
    case "SET_EXPERIENCE_BULLETS":
      return {
        ...state,
        data: {
          ...state.data,
          experience: state.data.experience.map((item, idx) => {
            if (idx !== action.index) return item;

            const nextBullets = Array.isArray(action.bullets)
              ? action.bullets
                  .map((bullet) => String(bullet || "").trim())
                  .filter(Boolean)
              : [];

            return {
              ...item,
              bullets: nextBullets.length ? nextBullets : [""]
            };
          })
        }
      };
    case "ADD_EXPERIENCE": {
      const nextIndex = state.data.experience.length + 1;
      return {
        ...state,
        data: {
          ...state.data,
          experience: [
            ...state.data.experience,
            {
              id: `exp-${nextIndex}`,
              company: "",
              role: "",
              location: "",
              bullets: [""]
            }
          ]
        }
      };
    }
    case "REMOVE_EXPERIENCE": {
      const nextExperience = state.data.experience.filter((_, idx) => idx !== action.index);
      return {
        ...state,
        data: {
          ...state.data,
          experience: nextExperience.length
            ? nextExperience
            : [
                {
                  id: "exp-1",
                  company: "",
                  role: "",
                  location: "",
                  bullets: [""]
                }
              ]
        }
      };
    }
    case "UPDATE_SKILLS":
      return {
        ...state,
        data: {
          ...state.data,
          skills: [
            {
              category: "Core Skills",
              items: action.payload
            }
          ]
        }
      };
    case "UPDATE_EDUCATION_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          education: state.data.education.map((item, idx) =>
            idx === action.index ? { ...item, [action.field]: action.value } : item
          )
        }
      };
    case "ADD_EDUCATION": {
      const nextIndex = state.data.education.length + 1;
      return {
        ...state,
        data: {
          ...state.data,
          education: [
            ...state.data.education,
            {
              id: `edu-${nextIndex}`,
              institution: "",
              degree: "",
              field: "",
              startYear: null,
              endYear: null,
              highlights: []
            }
          ]
        }
      };
    }
    case "REMOVE_EDUCATION": {
      const nextEducation = state.data.education.filter((_, idx) => idx !== action.index);
      return {
        ...state,
        data: {
          ...state.data,
          education: nextEducation.length
            ? nextEducation
            : [
                {
                  id: "edu-1",
                  institution: "",
                  degree: "",
                  field: "",
                  startYear: null,
                  endYear: null,
                  highlights: []
                }
              ]
        }
      };
    }
    case "UPDATE_PROJECT_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          projects: state.data.projects.map((item, idx) =>
            idx === action.index ? { ...item, [action.field]: action.value } : item
          )
        }
      };
    case "UPDATE_PROJECT_BULLET":
      return {
        ...state,
        data: {
          ...state.data,
          projects: state.data.projects.map((item, idx) => {
            if (idx !== action.index) return item;
            const sourceBullets = Array.isArray(item.bullets) && item.bullets.length
              ? item.bullets
              : [""];
            const nextBullets = sourceBullets.map((bullet, bulletIndex) =>
              bulletIndex === action.bulletIndex ? action.value : bullet
            );
            return { ...item, bullets: nextBullets };
          })
        }
      };
    case "ADD_PROJECT_BULLET":
      return {
        ...state,
        data: {
          ...state.data,
          projects: state.data.projects.map((item, idx) =>
            idx === action.index
              ? {
                  ...item,
                  bullets: [
                    ...(Array.isArray(item.bullets) && item.bullets.length ? item.bullets : [""]),
                    ""
                  ]
                }
              : item
          )
        }
      };
    case "REMOVE_PROJECT_BULLET":
      return {
        ...state,
        data: {
          ...state.data,
          projects: state.data.projects.map((item, idx) => {
            if (idx !== action.index) return item;

            const sourceBullets = Array.isArray(item.bullets) && item.bullets.length
              ? item.bullets
              : [""];
            const nextBullets = sourceBullets.filter((_, bulletIndex) => bulletIndex !== action.bulletIndex);

            return {
              ...item,
              bullets: nextBullets.length ? nextBullets : [""]
            };
          })
        }
      };
    case "SET_PROJECT_BULLETS":
      return {
        ...state,
        data: {
          ...state.data,
          projects: state.data.projects.map((item, idx) => {
            if (idx !== action.index) return item;

            const nextBullets = Array.isArray(action.bullets)
              ? action.bullets
                  .map((bullet) => String(bullet || "").trim())
                  .filter(Boolean)
              : [];

            return {
              ...item,
              bullets: nextBullets.length ? nextBullets : [""]
            };
          })
        }
      };
    case "ADD_PROJECT": {
      const nextIndex = state.data.projects.length + 1;
      return {
        ...state,
        data: {
          ...state.data,
          projects: [
            ...state.data.projects,
            {
              id: `proj-${nextIndex}`,
              name: "",
              stack: [],
              bullets: [""],
              link: ""
            }
          ]
        }
      };
    }
    case "REMOVE_PROJECT": {
      const nextProjects = state.data.projects.filter((_, idx) => idx !== action.index);
      return {
        ...state,
        data: {
          ...state.data,
          projects: nextProjects.length
            ? nextProjects
            : [
                {
                  id: "proj-1",
                  name: "",
                  stack: [],
                  bullets: [""],
                  link: ""
                }
              ]
        }
      };
    }
    case "UPDATE_CERTIFICATION_FIELD":
      return {
        ...state,
        data: {
          ...state.data,
          certifications: state.data.certifications.map((item, idx) =>
            idx === action.index ? { ...item, [action.field]: action.value } : item
          )
        }
      };
    case "ADD_CERTIFICATION": {
      const nextIndex = state.data.certifications.length + 1;
      return {
        ...state,
        data: {
          ...state.data,
          certifications: [
            ...state.data.certifications,
            {
              id: `cert-${nextIndex}`,
              name: "",
              issuer: "",
              year: null
            }
          ]
        }
      };
    }
    case "REMOVE_CERTIFICATION": {
      const nextCertifications = state.data.certifications.filter((_, idx) => idx !== action.index);
      return {
        ...state,
        data: {
          ...state.data,
          certifications: nextCertifications.length
            ? nextCertifications
            : [
                {
                  id: "cert-1",
                  name: "",
                  issuer: "",
                  year: null
                }
              ]
        }
      };
    }
    default:
      return state;
  }
}

const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, createInitialState());
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

export function useResume() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error("useResume must be used within ResumeProvider");
  }
  return context;
}
