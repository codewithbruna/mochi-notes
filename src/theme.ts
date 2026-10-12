import type { AppSettings, PaletteName, ThemeCustomization, ThemeMode } from "./types";
import { accentMap } from "./utils";

type ResolvedTheme = "light" | "dark";

interface ThemeTokens {
  appBackground: string;
  headerBackground: string;
  sidebarBackground: string;
  sidebarActive: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentForeground: string;
}

const palettes: Record<PaletteName, Record<ResolvedTheme, ThemeTokens>> = {
  aurora: {
    light: { appBackground: "#e8f3f4", headerBackground: "#f7fcfc", sidebarBackground: "#43327e", sidebarActive: "#62509f", surfacePrimary: "#fbfefe", surfaceSecondary: "#e1f0f1", borderColor: "#b7d3d7", textPrimary: "#14313a", textSecondary: "#5e737a", accent: "#55cfa9", accentForeground: "#082d32" },
    dark: { appBackground: "#0b252d", headerBackground: "#0d2931", sidebarBackground: "#30275f", sidebarActive: "#584b91", surfacePrimary: "#10323b", surfaceSecondary: "#133b46", borderColor: "#28515c", textPrimary: "#effbf9", textSecondary: "#b7ced2", accent: "#55cfa9", accentForeground: "#08252b" }
  },
  lavender: {
    light: { appBackground: "#f1eef8", headerBackground: "#fbfaff", sidebarBackground: "#49356e", sidebarActive: "#7156a3", surfacePrimary: "#ffffff", surfaceSecondary: "#e9e3f5", borderColor: "#cec2e1", textPrimary: "#30263d", textSecondary: "#756a83", accent: "#a98be8", accentForeground: "#281f3b" },
    dark: { appBackground: "#211a31", headerBackground: "#261e38", sidebarBackground: "#342450", sidebarActive: "#62458c", surfacePrimary: "#302641", surfaceSecondary: "#3b2f51", borderColor: "#594a70", textPrimary: "#f7f0ff", textSecondary: "#cbbfd8", accent: "#bca1f4", accentForeground: "#2c203d" }
  },
  mint: {
    light: { appBackground: "#e7f4ef", headerBackground: "#f8fffc", sidebarBackground: "#225b58", sidebarActive: "#347b73", surfacePrimary: "#ffffff", surfaceSecondary: "#dcefe8", borderColor: "#b5d7cd", textPrimary: "#153935", textSecondary: "#5d7971", accent: "#53c9aa", accentForeground: "#07322c" },
    dark: { appBackground: "#0d2928", headerBackground: "#102f2e", sidebarBackground: "#164744", sidebarActive: "#27736a", surfacePrimary: "#143936", surfaceSecondary: "#194842", borderColor: "#2b625a", textPrimary: "#edfff8", textSecondary: "#b4d3c9", accent: "#71dfbe", accentForeground: "#092b27" }
  },
  autumn: {
    light: { appBackground: "#f6eee4", headerBackground: "#fffaf4", sidebarBackground: "#6a4a3d", sidebarActive: "#9a6951", surfacePrimary: "#fffdf9", surfaceSecondary: "#efe0ce", borderColor: "#d9bfa5", textPrimary: "#432d26", textSecondary: "#83685b", accent: "#d47b55", accentForeground: "#351d16" },
    dark: { appBackground: "#2c211d", headerBackground: "#342720", sidebarBackground: "#563c33", sidebarActive: "#805643", surfacePrimary: "#3b2d26", surfaceSecondary: "#49372e", borderColor: "#725344", textPrimary: "#fff5eb", textSecondary: "#d6bcae", accent: "#e89a70", accentForeground: "#3b2117" }
  },
  minimal: {
    light: { appBackground: "#eef2f5", headerBackground: "#fbfcfd", sidebarBackground: "#3b5265", sidebarActive: "#54748c", surfacePrimary: "#ffffff", surfaceSecondary: "#e2e9ee", borderColor: "#bfced8", textPrimary: "#24343f", textSecondary: "#667983", accent: "#7098b3", accentForeground: "#132c3e" },
    dark: { appBackground: "#1a252d", headerBackground: "#202d36", sidebarBackground: "#334657", sidebarActive: "#4d687d", surfacePrimary: "#293944", surfaceSecondary: "#334752", borderColor: "#526875", textPrimary: "#f0f6f9", textSecondary: "#c0ced6", accent: "#9bbcd1", accentForeground: "#1b303f" }
  }
};

const isColor = (value: string | undefined): value is string => Boolean(value && /^#[0-9a-f]{6}$/i.test(value));

export function resolveTheme(theme: ThemeMode, dark = window.matchMedia("(prefers-color-scheme: dark)").matches): ResolvedTheme {
  return theme === "system" ? (dark ? "dark" : "light") : theme;
}

export function applyThemeTokens(root: HTMLElement, settings: AppSettings, dark?: boolean) {
  const mode = resolveTheme(settings.theme, dark);
  const base = palettes[settings.palette ?? "aurora"][mode];
  const overrides: ThemeCustomization = settings.customPalette ?? {};
  const accent = isColor(settings.customAccent) ? settings.customAccent : isColor(overrides.accent) ? overrides.accent : accentMap[settings.accent] ?? base.accent;
  const tokens = {
    ...base,
    appBackground: isColor(overrides.appBackground) ? overrides.appBackground : base.appBackground,
    headerBackground: isColor(overrides.headerBackground) ? overrides.headerBackground : base.headerBackground,
    sidebarBackground: isColor(overrides.sidebarBackground) ? overrides.sidebarBackground : base.sidebarBackground,
    surfacePrimary: isColor(overrides.surfacePrimary) ? overrides.surfacePrimary : base.surfacePrimary,
    accent
  };

  root.dataset.theme = mode;
  root.dataset.palette = settings.palette ?? "aurora";
  const properties: Record<string, string> = {
    "--app-background": tokens.appBackground,
    "--header-background": tokens.headerBackground,
    "--sidebar-background": tokens.sidebarBackground,
    "--sidebar-active": tokens.sidebarActive,
    "--surface-primary": tokens.surfacePrimary,
    "--surface-secondary": tokens.surfaceSecondary,
    "--border-color": tokens.borderColor,
    "--text-primary": tokens.textPrimary,
    "--text-secondary": tokens.textSecondary,
    "--accent-primary": tokens.accent,
    "--accent-hover": `color-mix(in srgb, ${tokens.accent} 82%, white)`,
    "--accent-foreground": tokens.accentForeground,
    "--focus-ring": tokens.accent,
    "--app-canvas": tokens.appBackground,
    "--app-canvas-raised": tokens.surfaceSecondary,
    "--sidebar-surface": tokens.sidebarBackground,
    "--panel-solid": tokens.surfacePrimary,
    "--panel": tokens.surfacePrimary,
    "--bg": tokens.appBackground,
    "--bg-2": tokens.surfaceSecondary,
    "--border": tokens.borderColor,
    "--text": tokens.textPrimary,
    "--muted": tokens.textSecondary,
    "--accent": tokens.accent
  };
  Object.entries(properties).forEach(([name, value]) => root.style.setProperty(name, value));
}
