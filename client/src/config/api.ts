export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
export const API_TIMEOUT = 30000; // 30 seconds

export const API_ENDPOINTS = {
  EVENTS: '/events',
  FIGHTERS: '/fighters',
  ANALYTICS: '/analytics',
} as const; 