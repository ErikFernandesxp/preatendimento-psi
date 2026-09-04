"use client";

// Evita que a Vercel tente pré-renderizar esta página no build
// (o cliente Supabase só existe em tempo de execução).
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function EsqueciSenhaPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (resetError) {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Recuperar senha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Informe seu e-mail para receber o link de redefinição.
        </p>

        {sent ? (
          <p className="mt-6 text-sm text-emerald-700">
            Se o e-mail existir em nossa base, um link de redefinição foi enviado.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">
              Enviar link
            </Button>
          </form>
        )}

        <Link href="/login" className="mt-4 inline-block text-sm text-slate-500 hover:underline">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
