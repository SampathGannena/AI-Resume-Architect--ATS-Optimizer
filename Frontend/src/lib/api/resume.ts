import { apiClient } from './client';

export type Keyword = { term: string; importance: 'critical' | 'high' | 'medium'; presentInResume?: boolean };

export type ResumeData = {
  basics?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
  };
  experience?: Array<{
    company?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    graduationDate?: string;
  }>;
  skills?: string[];
  projects?: Array<{
    name?: string;
    description?: string;
    bullets?: string[];
    link?: string;
  }>;
};

export type AiResult = {
  atsScore?: number;
  optimizedScore?: number;
  keywords?: Keyword[];
  missingKeywords?: string[];
  resumeData?: ResumeData;
  suggestions?: string[];
  fixedSections?: Record<string, string>;
  addedKeywords?: string[];
  boostScore?: number;
  explanation?: string;
  content?: string;
  opening?: string;
  body?: string;
  closing?: string;
};

export interface Resume {
  _id: string;
  userId: string;
  title: string;
  sourceText?: string;
  jobDescription?: string;
  resumeData: ResumeData;
  template: string;
  atsScore: number;
  optimizedScore: number;
  aiResult?: AiResult;
  createdAt: string;
  updatedAt: string;
}

export interface RewriteResponse {
  resume: Resume;
  aiResult: AiResult;
}

export interface ParseUploadResponse {
  resumeData: ResumeData;
}

export const resumeApi = {
  list: () => apiClient.get<Resume[]>('/resumes'),

  get: (id: string) => apiClient.get<Resume>(`/resumes/${id}`),

  create: (data: Partial<Resume>) => apiClient.post<Resume>('/resumes', data),

  update: (id: string, data: Partial<Resume>) =>
    apiClient.put<Resume>(`/resumes/${id}`, data),

  delete: (id: string) => apiClient.delete<{ message: string }>(`/resumes/${id}`),

  rewrite: (resumeText: string, jobDescription: string) =>
    apiClient.post<RewriteResponse>('/resumes/rewrite', { resumeText, jobDescription }),

  parseUpload: (resumeText: string) =>
    apiClient.post<ParseUploadResponse>('/resumes/parse-upload', { resumeText }),

  boostAts: (resumeId: string, resumeText: string, missingKeywords: string[], jobDescription: string) =>
    apiClient.post<{ resume: Resume; boostResult: AiResult }>('/resumes/boost-ats', {
      resumeId,
      resumeText,
      missingKeywords,
      jobDescription,
    }),

  applySuggestion: (resumeId: string | undefined, resumeData: unknown, jobDescription: string, suggestion: string) =>
    apiClient.post<{ resume?: Resume; suggestionResult: AiResult }>('/resumes/apply-suggestion', {
      resumeId,
      resumeData,
      jobDescription,
      suggestion,
    }),
};
