import React, { createContext, useEffect, useState } from "react";

// Type definitions for theme mode and color themes
type ColorMode = "system" | "light" | "dark" | "high-contrast" | "reduced-motion" | "soft";
type ColorTheme = "default" | "everyst" | "blue" | "purple" | "forest" | "amber" | "teal" | "rose" | "crimson" | "emerald" | "indigo" | "slate" | "sunset" | "ocean";
type ColorScheme = "light" | "dark"; // Actual applied light/dark mode

type ThemeContextType = {
  colorMode: ColorMode;
  colorTheme: ColorTheme;
  setColorMode: (mode: ColorMode) => void;
  setColorTheme: (theme: ColorTheme) => void;
  colorScheme: ColorScheme; // Actual applied light/dark based on system or user preference
};

export const ThemeContext = createContext<ThemeContextType>({
  colorMode: "system",
  colorTheme: "default",
  setColorMode: () => {},
  setColorTheme: () => {},
  colorScheme: "light",
});

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  // Determine initial color mode based on user preference or system setting
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    // Check if mode is saved in localStorage
    const savedMode = localStorage.getItem("colorMode") as ColorMode;
    if (["system", "light", "dark", "high-contrast", "reduced-motion", "soft"].includes(savedMode)) {
      return savedMode;
    }
    return "system";
  });

  // Determine initial color theme
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    // Check if theme is saved in localStorage
    const savedTheme = localStorage.getItem("colorTheme") as ColorTheme;
    if (["default", "everyst", "blue", "purple", "forest", "amber", "teal", "rose", "crimson", "emerald", "indigo", "slate", "sunset", "ocean"].includes(savedTheme)) {
      return savedTheme;
    }
    return "default";
  });

  // Track system preference separately
  const [systemPreference, setSystemPreference] = useState<ColorScheme>(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  // Derive the actual color scheme based on mode and system preference
  const colorScheme: ColorScheme = colorMode === "system" 
    ? systemPreference 
    : (colorMode === "dark" ? "dark" : "light");

  // Apply theme to document when it changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // First, remove all theme classes
    root.classList.remove("dark", "light", "high-contrast", "reduced-motion", "soft");
    root.classList.remove("theme-everyst", "theme-blue", "theme-purple", "theme-forest", "theme-amber", "theme-teal", "theme-rose", 
      "theme-crimson", "theme-emerald", "theme-indigo", "theme-slate", "theme-sunset", "theme-ocean");
    
    // Apply color scheme class (light/dark)
    if (colorScheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
    
    // Apply special mode classes
    if (colorMode === "high-contrast") {
      root.classList.add("high-contrast");
    } else if (colorMode === "reduced-motion") {
      root.classList.add("reduced-motion");
    } else if (colorMode === "soft") {
      root.classList.add("soft");
    }
    
    // Apply theme color classes
    if (colorTheme !== "default") {
      root.classList.add(`theme-${colorTheme}`);
    }
    
    // Save preferences to localStorage
    localStorage.setItem("colorMode", colorMode);
    localStorage.setItem("colorTheme", colorTheme);
  }, [colorMode, colorTheme, colorScheme]);

  // Add event listener for system theme change
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      setSystemPreference(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      colorMode, 
      colorTheme, 
      setColorMode, 
      setColorTheme, 
      colorScheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
