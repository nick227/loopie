// The standalone ad-serving service's public base URL — needed client-side only for the "copy
// embed code" snippet (apps/ad-server's v1.js loader). Everything else that talks to ad-server
// does so server-side. See .env.example's AD_SERVER_URL for the backend equivalent.
export const AD_SERVER_URL = import.meta.env.VITE_AD_SERVER_URL ?? 'http://localhost:3002'
