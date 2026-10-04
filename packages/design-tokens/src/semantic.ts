import {
  elevation,
  fontSizes,
  fontWeights,
  lineHeights,
  opacity,
  palette,
  radii,
  sizes,
  spacing
} from "./primitives.js";

export const lightColors = {
  background: palette.slate50,
  surface: palette.white,
  surfaceMuted: palette.slate100,
  text: palette.slate900,
  textMuted: palette.slate600,
  border: palette.slate200,
  borderStrong: palette.slate300,
  primary: palette.teal700,
  primaryPressed: palette.teal800,
  primarySoft: palette.teal50,
  onPrimary: palette.white,
  success: palette.green700,
  successSoft: palette.green50,
  warning: palette.amber700,
  warningSoft: palette.amber50,
  danger: palette.red700,
  dangerSoft: palette.red50,
  focus: palette.blue600,
  overlay: "rgba(15, 23, 42, 0.48)"
} as const;

export const darkColors = {
  background: "#08111F",
  surface: palette.slate900,
  surfaceMuted: palette.slate800,
  text: palette.slate50,
  textMuted: palette.slate300,
  border: palette.slate700,
  borderStrong: palette.slate600,
  primary: palette.teal300,
  primaryPressed: palette.teal200,
  primarySoft: palette.teal900,
  onPrimary: "#052F2B",
  success: "#4ADE80",
  successSoft: "#11351F",
  warning: "#FBBF24",
  warningSoft: "#422006",
  danger: "#F87171",
  dangerSoft: "#450A0A",
  focus: "#60A5FA",
  overlay: "rgba(2, 6, 23, 0.72)"
} as const;

export const themes = {
  light: {
    scheme: "light",
    colors: lightColors,
    spacing,
    radii,
    fontSizes,
    lineHeights,
    fontWeights,
    sizes,
    opacity,
    elevation
  },
  dark: {
    scheme: "dark",
    colors: darkColors,
    spacing,
    radii,
    fontSizes,
    lineHeights,
    fontWeights,
    sizes,
    opacity,
    elevation
  }
} as const;

export type AppTheme = (typeof themes)[keyof typeof themes];
export type ThemeScheme = keyof typeof themes;
