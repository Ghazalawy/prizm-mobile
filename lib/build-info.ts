// This file is OVERWRITTEN by the CI build (.github/workflows/build-and-deploy.yml,
// the "Inject build metadata" step). The "dev" values below are only used when
// running locally via `expo start`. Do not edit by hand.

export const BUILD_TIME    = "dev";
export const BUILD_SHA     = "dev";
export const BUILD_VERSION = "1.0.0-dev";

/**
 * Per-module gating flags. A tab only appears in the bottom bar when its flag
 * is true. Flip to true ONLY when that module's native screens are complete —
 * never expose half-built UI to staff. Order here roughly matches the rebuild
 * roadmap.
 */
export const BUILD_FLAGS = {
  tasksNative:           false,  // Phase 1a
  projectsNative:        false,  // Phase 1b
  customersNative:       false,  // Phase 2
  invoicesNative:        false,  // Phase 2
  tendersNative:         false,  // Phase 3
  opportunitiesNative:   false,  // Phase 3
  purchaseNative:        false,  // Phase 4
  materialsNative:       false,  // Phase 4
  leadsNative:           false,  // Phase 5
  ticketsNative:         false,  // Phase 5
  calendarNative:        false,  // Phase 5
  notificationsNative:   false,  // Phase 5
} as const;
