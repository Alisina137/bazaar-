export const palette = {
  white: "#FFFFFF",
  black: "#0A0D12",
  slate25: "#FCFCFD",
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
  teal50: "#F0FDFA",
  teal100: "#CCFBF1",
  teal200: "#99F6E4",
  teal300: "#5EEAD4",
  teal400: "#2DD4BF",
  teal500: "#14B8A6",
  teal600: "#0D9488",
  teal700: "#0F766E",
  teal800: "#115E59",
  teal900: "#134E4A",
  green50: "#F0FDF4",
  green700: "#15803D",
  amber50: "#FFFBEB",
  amber700: "#B45309",
  red50: "#FEF2F2",
  red700: "#B91C1C",
  blue600: "#2563EB"
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64
} as const;

export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999
} as const;

export const fontSizes = {
  caption: 12,
  label: 14,
  body: 16,
  bodyLarge: 18,
  heading: 22,
  title: 28,
  display: 34
} as const;

export const lineHeights = {
  caption: 16,
  label: 20,
  body: 24,
  bodyLarge: 28,
  heading: 28,
  title: 34,
  display: 40
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700"
} as const;

export const sizes = {
  touchTarget: 48,
  controlHeight: 48,
  controlHeightLarge: 54,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  contentMaxWidth: 680
} as const;

export const opacity = {
  disabled: 0.48,
  pressed: 0.78,
  muted: 0.68
} as const;

export const elevation = {
  card: {
    shadowColor: palette.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  }
} as const;
