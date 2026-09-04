import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso em Client Components ("use client").
 * Usa a chave anônima (anon key) — a segurança real é garantida
 * pelas políticas de Row Level Security no banco, nunca pelo frontend.
 *
 * Observação: não aplicamos o genérico `Database` aqui de propósito.
 * O tipo escrito à mão em `src/types/database.types.ts` não bate 100%
 * com o formato interno que o supabase-js espera (isso é resolvido
 * automaticamente ao gerar os tipos reais com
 * `supabase gen types typescript`), e forçar o genérico manualmente
 * fazia o TypeScript inferir `never` nos inserts/updates em todo o app.
 * Troque por `createBrowserClient<Database>(...)` assim que os tipos
 * gerados pela CLI estiverem em uso.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
