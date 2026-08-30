/**
 * Semantic design tokens for Sealed Invoices Mobile.
 *
 * Synced from the web artifact's index.css (artifacts/sealed-invoices):
 * paper near-white background, dark navy ink, wax-seal amber accent.
 * HSL values from the web tokens converted to hex.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#21242C",
    tint: "#0F1729",

    // Core surfaces — "paper"
    background: "#FAFAFA",
    foreground: "#21242C",

    // Cards / elevated surfaces
    card: "#FFFFFF",
    cardForeground: "#21242C",

    // Primary action color — ink navy (buttons, links, active states)
    primary: "#0F1729",
    primaryForeground: "#FFFFFF",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#F4F5F7",
    secondaryForeground: "#21242C",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#F4F5F7",
    mutedForeground: "#676F7E",

    // Accent highlights
    accent: "#EFF1F4",
    accentForeground: "#21242C",

    // Destructive actions / error states
    destructive: "#EF4444",
    destructiveForeground: "#FFFFFF",

    // Borders and input outlines
    border: "#E2E4E9",
    input: "#E2E4E9",

    // Brand extras — the wax seal
    seal: "#B45309",
    sealSoft: "#FDF1E3",
    sealForeground: "#7C3A06",

    // Status tones
    success: "#15803D",
    successSoft: "#DCFCE7",
    warningSoft: "#FEF3C7",
    warningForeground: "#92400E",
    destructiveSoft: "#FEE2E2",
  },

  // Border radius (in px). Synced from the web artifact's --radius (0.5rem).
  radius: 8,
};

export default colors;
