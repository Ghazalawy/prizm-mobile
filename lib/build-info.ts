// This file is OVERWRITTEN by the CI build (.github/workflows/build-and-deploy.yml,
// the "Inject build metadata" step). The "dev" values below are only used when
// running locally via `expo start`. Do not edit by hand.

export const BUILD_TIME: string    = "dev";
export const BUILD_SHA: string     = "dev";
export const BUILD_VERSION: string = "1.0.0-dev";

/**
 * Per-module gating flags. A tab only appears in the bottom bar when its flag
 * is true. Flip to true ONLY when that module's native screens are complete —
 * never expose half-built UI to staff. Order here roughly matches the rebuild
 * roadmap.
 */
export const BUILD_FLAGS = {
  tasksNative:           true,
  projectsNative:        true,
  customersNative:       true,
  leadsNative:           true,
  invoicesNative:        true,
  tendersNative:         false,
  opportunitiesNative:   false,
  purchaseNative:        false,
  materialsNative:       false,
  ticketsNative:         false,
  calendarNative:        false,
  notificationsNative:   false,
} as const;
