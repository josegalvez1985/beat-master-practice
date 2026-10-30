import { useSyncExternalStore } from "react";
import { StyleSheet } from "react-native";

// Stage theme: charcoal + amber cymbal light (dark), warm paper + deep amber (light).
// Every color is a CSS variable, so switching theme only swaps the variables: no re-render.

const palettes = {
  dark: {
    // Warm neutral scale by elevation: background < card (surface 1) < muted < secondary.
    background: "#0f0b09",
    foreground: "#f8f5ef",
    card: "#181310",
    primary: "#f9a129",
    primaryForeground: "#180f09",
    secondary: "#2d2621",
    secondaryForeground: "#f1eee9",
    muted: "#221b17",
    mutedForeground: "#a69d91",
    accent: "#da534f",
    destructive: "#e62b34",
    success: "#5fd38d",
    highlight: "#ffaf1d",
    border: "#2e2620",
    input: "#3d342d",
    ring: "#f9a129",
    // Selected option: amber edge + soft tint (solid amber is for the main action only).
    selected: "rgba(249, 161, 41, 0.12)",
    panel: "#181310",
    bar: "rgba(15, 11, 9, 0.92)",
    backdrop: "rgba(0, 0, 0, 0.7)",
    shadow: "0 16px 40px -28px rgba(0, 0, 0, 0.9)",
    etapaCalentamiento: "#fb923c",
    etapaTecnica: "#60a5fa",
    etapaRepertorio: "#f9a129",
    etapaTeoria: "#a78bfa",
    etapaTarea: "#4ade80",
    // Sheet music is always drawn on paper, in both themes.
    paper: "#fffdf8",
    paperInk: "#1c1714",
  },
  light: {
    background: "#faf7f2",
    foreground: "#1c1714",
    card: "#ffffff",
    primary: "#b45309",
    primaryForeground: "#ffffff",
    secondary: "#ede5da",
    secondaryForeground: "#2b2520",
    muted: "#f3ede5",
    mutedForeground: "#6b6158",
    accent: "#c2413d",
    destructive: "#c81e28",
    success: "#15803d",
    highlight: "#c2570c",
    border: "#e6ded3",
    input: "#d6ccbf",
    ring: "#b45309",
    selected: "rgba(180, 83, 9, 0.08)",
    panel: "#ffffff",
    bar: "rgba(250, 247, 242, 0.92)",
    backdrop: "rgba(28, 23, 20, 0.45)",
    shadow: "0 1px 2px rgba(60, 40, 20, 0.05), 0 16px 40px -28px rgba(60, 40, 20, 0.3)",
    etapaCalentamiento: "#c2410c",
    etapaTecnica: "#1d4ed8",
    etapaRepertorio: "#b45309",
    etapaTeoria: "#6d28d9",
    etapaTarea: "#15803d",
    paper: "#ffffff",
    paperInk: "#1c1714",
  },
} as const;

type Token = keyof typeof palettes.dark;

const cssVar = (token: string) =>
  `--pulso-${token.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}`;

export const colors = Object.fromEntries(
  Object.keys(palettes.dark).map((token) => [token, `var(${cssVar(token)})`]),
) as { readonly [K in Token]: string };

export const gradients = {
  amber: ["#ffaf1d", "#e9622e"] as const,
  stage: ["rgba(249, 161, 41, 0.10)", "rgba(249, 161, 41, 0)"] as const,
};

// Three radii: small controls 8, cards and inputs 12, big panels 20.
export const radius = {
  sm: 8,
  md: 12,
  lg: 12,
  xl: 20,
  "2xl": 20,
} as const;

export const fonts = {
  // Bebas Neue (all caps): brand, big numbers and the login poster line only.
  display: "BebasNeue_400Regular",
  // Titles in sentence case: condensed like a concert poster, but easy to read.
  heading: "BarlowSemiCondensed_600SemiBold",
  headingBold: "BarlowSemiCondensed_700Bold",
  sans: "Barlow_400Regular",
  medium: "Barlow_500Medium",
  semibold: "Barlow_600SemiBold",
  bold: "Barlow_700Bold",
} as const;

export const shared = StyleSheet.create({
  // Translucent card surface.
  panel: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: colors.shadow,
  },
});

// --- Theme preference: "sistema" follows the device; saved per browser. ---

export type Tema = "sistema" | "claro" | "oscuro";

const STORAGE_KEY = "pulso-tema";
const listeners = new Set<() => void>();
const media = window.matchMedia("(prefers-color-scheme: light)");

function leerTema(): Tema {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "claro" || value === "oscuro" ? value : "sistema";
  } catch {
    return "sistema";
  }
}

let tema = leerTema();

function aplicarTema() {
  const modo =
    tema === "sistema" ? (media.matches ? "light" : "dark") : tema === "claro" ? "light" : "dark";
  document.documentElement.dataset.theme = modo;
  document.documentElement.style.colorScheme = modo;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", palettes[modo].background);
}

export function setTema(next: Tema) {
  tema = next;
  try {
    if (next === "sistema") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage: the choice lasts until the page is closed.
  }
  aplicarTema();
  listeners.forEach((listener) => listener());
}

export function useTema() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => tema,
  );
}

// The variables for both palettes, injected once before the first render.
const style = document.createElement("style");
style.id = "pulso-tema";
style.textContent = (["dark", "light"] as const)
  .map(
    (modo) =>
      `:root[data-theme="${modo}"]{${Object.entries(palettes[modo])
        .map(([token, value]) => `${cssVar(token)}:${value};`)
        .join("")}}`,
  )
  .join("\n");
// Visible keyboard focus everywhere, and no motion for people who ask for less.
style.textContent += `
:focus-visible { outline: 2px solid var(${cssVar("ring")}); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}`;
document.head.appendChild(style);
media.addEventListener("change", () => tema === "sistema" && aplicarTema());
aplicarTema();
