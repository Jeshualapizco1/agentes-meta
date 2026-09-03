import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
const PUBLIC = ["/login", "/auth/signout"];
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: (all) => { for (const { name, value } of all) req.cookies.set(name, value); res = NextResponse.next({ request: req }); for (const { name, value, options } of all) res.cookies.set(name, value, options); } },
  });
  const { data: { user } } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  if (!user && !PUBLIC.some(p => path.startsWith(p))) { const url = req.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", path); return NextResponse.redirect(url); }
  if (user && path === "/login") { const url = req.nextUrl.clone(); url.pathname = "/bitacora"; url.search = ""; return NextResponse.redirect(url); }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
