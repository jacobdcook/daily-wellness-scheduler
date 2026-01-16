"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

// Accent palette (Tailwind color families)
export const accentColors = {
  blue: { name: "Blue", class: "blue" },
  indigo: { name: "Indigo", class: "indigo" },
  violet: { name: "Violet", class: "violet" },
  purple: { name: "Purple", class: "purple" },
  fuchsia: { name: "Fuchsia", class: "fuchsia" },
  pink: { name: "Pink", class: "pink" },
  rose: { name: "Rose", class: "rose" },
  red: { name: "Red", class: "red" },
  orange: { name: "Orange", class: "orange" },
  amber: { name: "Amber", class: "amber" },
  yellow: { name: "Yellow", class: "yellow" },
  lime: { name: "Lime", class: "lime" },
  green: { name: "Green", class: "green" },
  emerald: { name: "Emerald", class: "emerald" },
  teal: { name: "Teal", class: "teal" },
  cyan: { name: "Cyan", class: "cyan" },
  sky: { name: "Sky", class: "sky" },
  slate: { name: "Slate", class: "slate" },
  gray: { name: "Gray", class: "gray" },
  zinc: { name: "Zinc", class: "zinc" },
  neutral: { name: "Neutral", class: "neutral" },
  stone: { name: "Stone", class: "stone" },
} as const;

export type AccentColor = keyof typeof accentColors;
export type SurfaceStyle = "soft" | "glass" | "contrast";
export type UIDensity = "spacious" | "cozy" | "compact";

interface ThemeContextShape {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  surfaceStyle: SurfaceStyle;
  setSurfaceStyle: (style: SurfaceStyle) => void;
  density: UIDensity;
  setDensity: (density: UIDensity) => void;
}

const ThemeContext = createContext<ThemeContextShape | undefined>(undefined);

const getStoredValue = <T extends string>(key: string, fallback: T, allowed?: Set<T>): T => {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key) as T | null;
  if (stored && (!allowed || allowed.has(stored))) {
    return stored;
  }
  return fallback;
};

const setDocumentDataset = (key: string, value: string) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset[key] = value;
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState<AccentColor>(() =>
    getStoredValue<AccentColor>("accent-color", "blue", new Set(Object.keys(accentColors) as AccentColor[]))
  );
  const [surfaceStyle, setSurfaceStyleState] = useState<SurfaceStyle>(() =>
    getStoredValue<SurfaceStyle>("surface-style", "soft", new Set(["soft", "glass", "contrast"]))
  );
  const [density, setDensityState] = useState<UIDensity>(() =>
    getStoredValue<UIDensity>("ui-density", "spacious", new Set(["spacious", "cozy", "compact"]))
  );

  // Update document + storage when preferences change
  useEffect(() => {
    setDocumentDataset("accent", accentColor);
    if (typeof window !== "undefined") {
      localStorage.setItem("accent-color", accentColor);
    }
  }, [accentColor]);

  useEffect(() => {
    setDocumentDataset("surface", surfaceStyle);
    if (typeof window !== "undefined") {
      localStorage.setItem("surface-style", surfaceStyle);
    }
  }, [surfaceStyle]);

  useEffect(() => {
    setDocumentDataset("density", density);
    if (typeof window !== "undefined") {
      localStorage.setItem("ui-density", density);
    }
  }, [density]);

  const contextValue: ThemeContextShape = {
    accentColor,
    setAccentColor: setAccentColorState,
    surfaceStyle,
    setSurfaceStyle: setSurfaceStyleState,
    density,
    setDensity: setDensityState,
  };

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
    </NextThemesProvider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  const { theme, setTheme, systemTheme } = useTheme();

  if (context === undefined) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }

  return {
    ...context,
    theme,
    setTheme,
    systemTheme,
    isDark: theme === "dark" || (theme === "system" && systemTheme === "dark"),
  };
}

