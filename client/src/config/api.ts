export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://introducing-first.onrender.com/api';
export const AUTH_BASE_URL = 'https://auth-k5pw.onrender.com';
export const PICKS_BASE_URL = 'https://introducing-first-1-txrv.onrender.com';
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
    STATUS: "/api/auth/status",
  },
  PICKS: {
    INSERT: '/insertPick',
    GET_PICKS_FOR_EVENT: '/api/v1/getPicksForEvent',
    GET_PICKS_FOR_USER_AND_EVENT: '/api/v1/getPicksForUserAndEvent',
    GET_PICKS_FOR_MATCHUP: '/api/v1/getPicksForMatchup'
  }
} as const;