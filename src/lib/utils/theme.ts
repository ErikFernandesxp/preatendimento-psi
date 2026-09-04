import type { CSSProperties } from "react";

// "page_bg" virou "topbar_bg": em vez de colorir a tela inteira (que
// quebra a legibilidade com qualquer cor forte), a cor de marca agora
// fica só na barra superior - uma faixa estreita, então funciona com
// qualquer tom. Sidebar e conteúdo continuam sempre em branco/neutro.
export interface ThemeSettings {
  topbar_bg?: string;
  section_bg?: string;
  button_bg?: string;
}

export const DEFAULT_THEME: Required<ThemeSettings> = {
  topbar_bg: "#ffffff",
  section_bg: "#ffffff",
  button_bg: "#0f172a",
};

/**
 * Retorna preto ou branco - o que tiver mais contraste contra a cor
 * de fundo informada (fórmula de luminância relativa). Usado para o
 * texto/ícones em cima de cores escolhidas livremente (botões, barra
 * superior).
 */
export function getContrastColor(hex: string): "#0f172a" | "#ffffff" {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Fundo claro -> texto escuro; fundo escuro -> texto branco.
  return luminance > 0.45 ? "#0f172a" : "#ffffff";
}

/**
 * Monta as CSS custom properties aplicadas no wrapper do AppShell.
 * Tudo que usa `bg-[var(--topbar-bg)]` etc. lê daqui em tempo real.
 */
export function themeCssVars(theme: ThemeSettings | null | undefined): CSSProperties {
  const merged = { ...DEFAULT_THEME, ...(theme ?? {}) };
  return {
    ["--topbar-bg" as string]: merged.topbar_bg,
    ["--topbar-fg" as string]: getContrastColor(merged.topbar_bg),
    ["--section-bg" as string]: merged.section_bg,
    ["--button-bg" as string]: merged.button_bg,
    ["--button-fg" as string]: getContrastColor(merged.button_bg),
  } as CSSProperties;
}
