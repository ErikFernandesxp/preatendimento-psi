"use client";

import { useState } from "react";
import { PsicologoSidebar } from "./PsicologoSidebar";
import { PacienteSidebar } from "./PacienteSidebar";
import { TopBar } from "./TopBar";
import { themeCssVars, type ThemeSettings } from "@/lib/utils/theme";

// Estrutura: barra superior de ponta a ponta (com a logo) e, abaixo
// dela, sidebar + conteúdo lado a lado. Sidebar e conteúdo são sempre
// brancos/neutros - só a barra superior e os botões recebem a cor
// personalizada, então uma escolha de cor forte nunca quebra a tela
// inteira.
export function AppShell({
  variant,
  children,
  theme,
  logoUrl,
  workspaceName,
}: {
  variant: "psicologo" | "paciente";
  children: React.ReactNode;
  theme?: ThemeSettings | null;
  logoUrl?: string | null;
  workspaceName?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col" style={themeCssVars(theme)}>
      <TopBar logoUrl={logoUrl} workspaceName={workspaceName} onMenuClick={() => setOpen(true)} />

      <div className="flex min-h-0 flex-1">
        {variant === "psicologo" ? (
          <PsicologoSidebar open={open} onClose={() => setOpen(false)} />
        ) : (
          <PacienteSidebar open={open} onClose={() => setOpen(false)} />
        )}

        {open && (
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            aria-hidden="true"
          />
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
