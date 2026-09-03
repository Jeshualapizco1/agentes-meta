import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/supabase/server";
export async function GET(req: NextRequest) {
  const url = new URL(req.url); const code = url.searchParams.get("code"); const next = url.searchParams.get("next") ?? "/bitacora";
  if (code) { const sb = await authClient(); const { error } = await sb.auth.exchangeCodeForSession(code); if (!error) return NextResponse.redirect(new URL(next, url.origin)); }
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("El enlace no es válido o ya caducó.")}`, url.origin));
}
