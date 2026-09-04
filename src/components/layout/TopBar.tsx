"use client";

import { Menu } from "lucide-react";

export function TopBar({
  logoUrl,
  workspaceName,
  onMenuClick,
}: {
  logoUrl?: string | null;
  workspaceName?: string | null;
  onMenuClick: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/5 bg-[var(--topbar-bg,#fff)] px-4 md:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="text-[var(--topbar-fg,#0f172a)] md:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {logoUrl ? (
        // Altura travada em 36px - a logo nunca cresce além disso,
        // não importa o tamanho do arquivo original.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={workspaceName ?? "Logo"}
          className="h-9 w-auto max-w-[180px] object-contain"
        />
      ) : (
        <p className="text-base font-semibold" style={{ color: "var(--topbar-fg, #0f172a)" }}>
          {workspaceName ?? "Pré-Atendimento"}
        </p>
      )}
    </header>
  );
}
