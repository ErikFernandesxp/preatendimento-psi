"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export function FieldLabel({
  children,
  required,
  hint,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {children}
        {required && (
          <span className="ml-0.5 text-rose-500" aria-label="Campo obrigatório">
            *
          </span>
        )}
      </label>

      {hint && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            aria-label="O que é isso?"
            className="flex h-4 w-4 items-center justify-center rounded-full text-slate-300 hover:text-slate-500"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {open && (
            <div className="absolute left-0 top-6 z-20 w-60 rounded-lg border border-slate-200 bg-white p-2.5 text-xs leading-relaxed text-slate-600 shadow-lg">
              {hint}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
