import { resolveRange } from "./range";
import { sessionReturnPath } from "./navigation";

export type NavigationRole = "admin" | "buyer";
export const PERIOD_ROUTES: Record<string, number> = { "/bitacora": 14, "/cuenta": 30, "/anuncios": 7, "/horarios": 28 };
const ACCOUNT_ROUTES = new Set(["/hoy", "/decisiones", "/bitacora", "/cuenta", "/anuncios", "/horarios", "/analisis", "/experimentos", "/configuracion"]);
export function navigationHref(destination: string, pathname: string, search: string): string {
  const source = new URLSearchParams(search);
  if (pathname.startsWith("/sesion/") && source.get("account") && source.has("returnTo")) {
    const back = new URL(sessionReturnPath(source.get("returnTo"), source.get("account")!), "https://app.example.invalid");
    if (back.pathname === destination) return back.pathname + back.search;
    // Otros destinos heredan el periodo de origen, pero siempre la cuenta explícita del detalle.
    back.searchParams.set("account", source.get("account")!);
    return navigationHref(destination, back.pathname, back.search);
  }
  if (destination === pathname) return `${destination}${source.size ? `?${source}` : ""}`;
  const out = new URLSearchParams();
  const account = source.get("account");
  if (ACCOUNT_ROUTES.has(destination) && account && /^\d{1,30}$/.test(account)) out.set("account", account);
  // Una pantalla con ventana propia (Hoy, Análisis, etc.) no recibe un selector ficticio.
  if (PERIOD_ROUTES[destination] && PERIOD_ROUTES[pathname]) {
    const p: Record<string, string> = {};
    for (const key of ["days", "from", "to"]) if (source.has(key)) p[key] = source.get(key)!;
    if (pathname === "/horarios" && source.has("weeks") && !Object.keys(p).length) p.days = String(Number(source.get("weeks")) * 7);
    try {
      const range = resolveRange(p, PERIOD_ROUTES[pathname]!);
      if (range.custom) { out.set("from", range.from); out.set("to", range.to); }
      else out.set("days", String(range.days));
    } catch { /* Un periodo inválido no contamina el siguiente destino. */ }
  }
  return `${destination}${out.size ? `?${out}` : ""}`;
}
export const NAV_GROUPS = [
  { label: "Operación", items: [
    { href: "/hoy", label: "Hoy", icon: "hoy" },
    { href: "/experimentos", label: "Pruebas", icon: "experimentos" },
    { href: "/anuncios", label: "Anuncios", icon: "anuncios" },
  ] },
  { label: "Análisis", items: [
    { href: "/cuenta", label: "Rendimiento", icon: "cuenta" },
    { href: "/analisis", label: "Aprendizajes", icon: "analisis" },
    { href: "/bitacora", label: "Bitácora", icon: "bitacora" },
  ] },
] as const;
export function isNavActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/bitacora" && pathname.startsWith("/sesion/"));
}
