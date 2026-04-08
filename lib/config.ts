// Prizm CRM API Configuration
// Backend: Perfex CRM (CodeIgniter) at ms.prizm-energy.com/MS

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://ms.prizm-energy.com";

// REST API base (JWT auth)
export const API_URL = `${BASE_URL}/MS/api`;

// Admin panel base (session auth for AJAX endpoints)
export const ADMIN_URL = `${BASE_URL}/MS/admin`;

// Mobile auth endpoint
export const MOBILE_AUTH_URL = `${BASE_URL}/MS/mobile_auth.php`;
