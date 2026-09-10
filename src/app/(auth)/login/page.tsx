// Caminho no projeto: src/app/(auth)/login/page.tsx

"use client";

// Evita que a Vercel tente pré-renderizar esta página no build
// (o cliente Supabase só existe em tempo de execução).
export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    router.push(profile?.role === "psychologist" ? "/psicologo/dashboard" : "/paciente/inicio");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF9F7] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-stone-200/80 bg-white p-8 shadow-[var(--shadow-soft-lg)]">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Entrar</h1>
        <p className="mt-1 text-sm text-stone-500">
          Acesse sua conta de psicólogo ou paciente.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-stone-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 transition-colors focus:border-[#EA5A45] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#EA5A45]/10"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-stone-700">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-900 transition-colors focus:border-[#EA5A45] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#EA5A45]/10"
            />
          </div>

          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-2 border-t border-stone-100 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href="/esqueci-senha" className="text-stone-500 hover:text-stone-900">
            Esqueci minha senha
          </Link>
          <Link href="/cadastro" className="font-semibold text-[#EA5A45] hover:brightness-90">
            Criar conta de psicólogo
          </Link>
        </div>
      </div>
    </div>
  );
}
