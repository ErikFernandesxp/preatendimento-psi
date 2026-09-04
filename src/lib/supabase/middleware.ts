import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Atualiza a sessão do Supabase a cada requisição e protege rotas.
 * Regras:
 *  - Não autenticado tentando acessar /psicologo/* ou /paciente/* -> /login
 *  - Autenticado tentando acessar /login ou /cadastro -> dashboard do seu papel
 *  - Autenticado com papel "patient" tentando acessar /psicologo/* -> /paciente/inicio
 *  - Autenticado com papel "psychologist" tentando acessar /paciente/* -> /psicologo/dashboard
 *
 * A proteção real dos dados acontece via RLS no banco; isto é apenas
 * uma camada de UX/roteamento.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/cadastro");
  const isPsicologoRoute = path.startsWith("/psicologo");
  const isPacienteRoute = path.startsWith("/paciente");

  if (!user && (isPsicologoRoute || isPacienteRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "psychologist" ? "/psicologo/dashboard" : "/paciente/inicio";
    return NextResponse.redirect(url);
  }

  if (user && (isPsicologoRoute || isPacienteRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (isPsicologoRoute && profile?.role !== "psychologist") {
      const url = request.nextUrl.clone();
      url.pathname = "/paciente/inicio";
      return NextResponse.redirect(url);
    }
    if (isPacienteRoute && profile?.role !== "patient") {
      const url = request.nextUrl.clone();
      url.pathname = "/psicologo/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
