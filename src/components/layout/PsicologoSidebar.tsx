// Caminho no projeto: src/components/layout/PsicologoSidebar.tsx

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Stethoscope,
  Bell,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/psicologo/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/psicologo/pacientes", label: "Pacientes", icon: Users },
  { href: "/psicologo/atividades", label: "Atividades", icon: ClipboardList },
  { href: "/psicologo/pre-atendimento", label: "Pré-atendimento", icon: Stethoscope },
  { href: "/psicologo/notificacoes", label: "Notificações", icon: Bell },
  { href: "/psicologo/configuracoes", label: "Configurações", icon: Settings },
];

// A logo e o nome já aparecem na TopBar - a sidebar fica só com a
// navegação, sempre neutra, para não competir com a marca.
export function PsicologoSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-stone-200 bg-white transition-transform duration-200 ease-out",
        "md:static md:z-auto md:h-auto md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex justify-end px-3 pt-3 md:hidden">
        <button onClick={onClose} aria-label="Fechar menu" className="text-stone-400">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-2 md:pt-6">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-[var(--button-bg,#EA5A45)] text-[var(--button-fg,#fff)] shadow-[var(--shadow-soft)]"
                  : "text-stone-600 hover:bg-stone-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
