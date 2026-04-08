// API Configuration
// The original Manus sandbox URL was: https://prizmcrm-aywhhmka.manus.space
// This caused 405 errors because the sandbox is no longer running.
// Update this to point to your actual Prizm CRM API server.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://ms.prizm-energy.com";

export const TRPC_URL = `${API_BASE_URL}/api/trpc`;
export const AUTH_URL = `${API_BASE_URL}/api/auth`;
export const OAUTH_URL = `${API_BASE_URL}/api/oauth`;
