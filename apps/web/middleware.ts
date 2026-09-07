import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
const PUBLIC = ["/login", "/auth/signout"];
export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-agentes-return-path", req.nextUrl.pathname + req.nextUrl.search);
  const next = () => { requestHeaders.set("cookie", req.cookies.toString()); return NextResponse.next({ request: { headers: requestHeaders } }); };
  let res = next();
  const sb = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: (all) => { for (const { name, value } of all) req.cookies.set(name, value); res = next(); for (const { name, value, options } of all) res.cookies.set(name, value, options); } },
  });
  const { data: { user } } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  if (!user && !PUBLIC.includes(path)) { const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = ""; url.searchParams.set("next", path + req.nextUrl.search); return NextResponse.redirect(url); }
  // Una sesión puede pertenecer a alguien revocado en app_users. No redirigir login → Hoy
  // solo por tener sesión: requireMember lo devolvería aquí y produciría un bucle.
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
