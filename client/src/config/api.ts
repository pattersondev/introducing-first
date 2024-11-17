export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://introducing-first.onrender.com/api';
export const AUTH_BASE_URL = 'https://auth-k5pw.onrender.com';
export const API_TIMEOUT = 30000; // 30 seconds

export const API_ENDPOINTS = {
  EVENTS: '/events',
  FIGHTERS: '/fighters',
  ANALYTICS: '/analytics',
  RANKINGS: '/rankings',
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    LOGOUT: "/logout",
    STATUS: "api/auth/status",
  },
} as const;