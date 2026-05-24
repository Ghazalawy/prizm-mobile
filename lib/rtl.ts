import type { TextStyle } from "react-native";

/**
 * Per-string RTL detection.
 *
 * Why not I18nManager.forceRTL(true)? That flips the ENTIRE app layout
 * (including the bottom tabs, drawers, and gesture directions) and
 * requires a full restart to take effect. For a mixed-content CRM where
 * a single staff list has English and Arabic names side-by-side, that's
 * the wrong default — we want each text field to render in its own
 * natural direction.
 *
 * Instead: detect Arabic on a per-string basis and apply
 * `writingDirection: "rtl"` + `textAlign: "right"` to that specific
 * <Text>. React Native respects writingDirection on Android and iOS,
 * and Arabic glyphs lay out correctly inside a left-aligned container
 * because Unicode bidi handles the actual glyph shaping.
 */

// Covers Arabic + Arabic Supplement + Arabic Extended-A + Arabic Presentation
// Forms A & B. Misses purely Hebrew/Syriac (Prizm doesn't use those).
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function isArabic(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  return ARABIC_RE.test(value);
}

/**
 * Returns the style fragment to spread onto a <Text> so it lays out
 * RTL when the content is Arabic, LTR otherwise. Use like:
 *
 *   <Text style={[styles.title, rtlTextStyle(item.title)]}>
 *     {item.title}
 *   </Text>
 */
export function rtlTextStyle(value: unknown): TextStyle | undefined {
  if (!isArabic(value)) return undefined;
  return { writingDirection: "rtl", textAlign: "right" };
}
