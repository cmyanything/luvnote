// Write quotas (the abuse guard behind Turnstile and WRITE_LIMITER). Raise these as the business grows.
// Many Thai mobile users share carrier IPs, so per-IP limits must allow several real customers at once.
export const QUOTAS = {
  sessionsPerIpPerHour: 20,   // R2 upload sessions: one per card created or edited
  sessionsPerDay: 1000,       // all R2 upload sessions across the site
  legacyPerIpPerHour: 20,     // V1/V2 Base64 card creation (fallback path)
  legacyPerDay: 1000,
};
