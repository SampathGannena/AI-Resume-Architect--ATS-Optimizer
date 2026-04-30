import { apiClient } from './client';

export const billingApi = {
  checkout: () => apiClient.post<{ url: string; sessionId: string }>('/billing/checkout'),
  portal: () => apiClient.post<{ url: string }>('/billing/portal'),
  cancel: () => apiClient.post<{ message: string }>('/billing/cancel'),
};
