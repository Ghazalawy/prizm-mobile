import { I18nManager, TextStyle } from "react-native";

// ── Prizm brand colors ──────────────────────────────────────────────────

export const colors = {
  primary: "#E65100",
  primaryLight: "#FF6D00",
  primaryDark: "#BF360C",
  primaryBg: "#FFF3E0",
  primaryBgLight: "#FFF8E1",

  success: "#15803D",
  successBg: "#F0FDF4",
  warning: "#B45309",
  warningBg: "#FFFBEB",
  error: "#DC2626",
  errorBg: "#FEF2F2",
  info: "#0369A1",
  infoBg: "#E0F2FE",

  approved: "#1D4ED8",
  approvedBg: "#EFF6FF",
  draft: "#92400E",
  draftBg: "#FFFBEB",
  active: "#15803D",
  activeBg: "#F0FDF4",

  white: "#FFFFFF",
  black: "#0F172A",
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1E293B",
  slate900: "#0F172A",
} as const;

// ── Status mapping ──────────────────────────────────────────────────────

export const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  "1": { label: "Active", color: colors.active, bg: colors.activeBg },
  "0": { label: "Draft", color: colors.draft, bg: colors.draftBg },
  "2": { label: "Approved", color: colors.approved, bg: colors.approvedBg },
};

export function statusBadge(status: string | number) {
  const s = String(status);
  return STATUS_MAP[s] ?? { label: `Status ${s}`, color: colors.slate600, bg: colors.slate100 };
}

// ── Typography ──────────────────────────────────────────────────────────

export const typography = {
  h1: { fontSize: 28, fontWeight: "800" as const, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: "700" as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: "600" as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  captionBold: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16 },
  tiny: { fontSize: 10, fontWeight: "500" as const, lineHeight: 14 },
};

// ── Spacing ─────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Compact density scale for information-dense mobile layouts. */
export const density = {
  comfortable: {
    cardPadding: 16,
    sectionGap: 16,
    rowHeight: 56,
    minTouch: 44,
    statTileHeight: 140,
  },
  compact: {
    cardPadding: 12,
    sectionGap: 12,
    rowHeight: 52,
    minTouch: 44,
    statTileHeight: 96,
  },
} as const;

export type DensityMode = keyof typeof density;

// ── Radius ──────────────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
} as const;

// ── Shadows ─────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

// ── RTL helpers ─────────────────────────────────────────────────────────

export function rtlAwareStyle(style: Record<string, any>): Record<string, any> {
  if (!I18nManager.isRTL) return style;
  const flipped: Record<string, any> = { ...style };
  if ("marginLeft" in style) {
    flipped.marginRight = style.marginLeft;
    delete flipped.marginLeft;
  }
  if ("marginRight" in style) {
    flipped.marginLeft = style.marginRight;
    delete flipped.marginRight;
  }
  if ("paddingLeft" in style) {
    flipped.paddingRight = style.paddingLeft;
    delete flipped.paddingLeft;
  }
  if ("paddingRight" in style) {
    flipped.paddingLeft = style.paddingRight;
    delete flipped.paddingRight;
  }
  return flipped;
}

export const autoTextDir: TextStyle = { writingDirection: "auto" };
