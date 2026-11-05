import { apiClient } from './client';

export interface Subscription {
  _id: string;
  userId: string;
  plan: 'free' | 'pro';
  resumesUsed: number;
  coverLettersUsed: number;
  currentPeriodEnd: string;
}

export const subscriptionApi = {
  get: () => apiClient.get<Subscription>('/subscription'),

  update: (plan: 'free' | 'pro') =>
    apiClient.put<Subscription>('/subscription', { plan }),
};
