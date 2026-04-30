import { apiClient } from './client';

export interface CoverLetter {
  _id: string;
  userId: string;
  resumeId?: string;
  title: string;
  content: string;
  tone: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResponse {
  coverLetter: CoverLetter;
  aiResult: {
    content: string;
    opening: string;
    body: string;
    closing: string;
  };
}

export const coverLetterApi = {
  list: () => apiClient.get<CoverLetter[]>('/cover-letters'),

  get: (id: string) => apiClient.get<CoverLetter>(`/cover-letters/${id}`),

  create: (data: Partial<CoverLetter>) =>
    apiClient.post<CoverLetter>('/cover-letters', data),

  update: (id: string, data: Partial<CoverLetter>) =>
    apiClient.put<CoverLetter>(`/cover-letters/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ message: string }>(`/cover-letters/${id}`),

  generate: (resumeId: string | null, jobDescription: string, tone: string) =>
    apiClient.post<GenerateResponse>('/cover-letters/generate', {
      resumeId,
      jobDescription,
      tone,
    }),
};
