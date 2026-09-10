// Caminho no projeto: src/components/ui/Button.tsx

import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  // Lê as CSS vars definidas pelo AppShell (tema do psicólogo). Fora
  // do AppShell (ex: login/cadastro) caem no fallback coral da marca.
  primary:
    "bg-[var(--button-bg,#EA5A45)] text-[var(--button-fg,#fff)] shadow-[var(--shadow-soft)] hover:brightness-95",
  secondary: "bg-[var(--section-bg,#fff)] text-stone-900 border border-stone-200 hover:bg-stone-50",
  ghost: "text-stone-600 hover:bg-stone-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

interface BaseProps {
  variant?: Variant;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...props
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
