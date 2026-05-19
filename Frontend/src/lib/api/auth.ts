import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  register: (email: string, password: string, displayName?: string) =>
    apiClient.post<AuthResponse>('/auth/register', { email, password, displayName }),

  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),

  getMe: () => apiClient.get<User>('/auth/me'),

  updateProfile: (displayName?: string, avatarUrl?: string) =>
    apiClient.put<User>('/auth/profile', { displayName, avatarUrl }),

  resetPassword: (email: string) =>
    apiClient.post<{ resetToken: string }>('/auth/reset-password', { email }),

  updatePassword: (password: string) =>
    apiClient.put<{ token: string }>('/auth/update-password', { password }),
};
