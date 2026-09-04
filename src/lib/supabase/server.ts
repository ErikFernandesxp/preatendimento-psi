import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e
 * Route Handlers. Lê/escreve os cookies de sessão do Next.js.
 *
 * Observação: o genérico `Database` não é aplicado de propósito — ver
 * o comentário em `src/lib/supabase/client.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component — pode ser ignorado
            // se houver middleware atualizando a sessão.
          }
        },
      },
    }
  );
}

/**
 * Cliente com a service role key. Usado SOMENTE em código de servidor
 * de confiança (route handlers específicos), nunca exposto ao cliente.
 * Ignora RLS — usar com extremo cuidado (ex: criar notificações,
 * gravar audit_log, convidar pacientes).
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
