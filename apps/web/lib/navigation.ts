const LOCAL_ORIGIN = "https://app.example.invalid";

export function pageHref(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  return `${path}${query.size ? `?${query}` : ""}`;
}
/** Retorno de detalle limitado a vistas de origen, sin redirecciones externas ni otro detalle anidado. */
export function sessionReturnPath(value: unknown, account: string): string {
  const fallback = `/bitacora?${new URLSearchParams({ account })}`;
  const safe = safeInternalPath(value, fallback);
  const url = new URL(safe, LOCAL_ORIGIN);
  if (!["/hoy", "/bitacora", "/cuenta", "/analisis", "/experimentos"].includes(url.pathname)) return fallback;
  if (url.searchParams.has("account") && url.searchParams.get("account") !== account) return fallback;
  return safe;
}
export function sessionHref(id: string, account: string, returnTo: string): string {
  return `/sesion/${encodeURIComponent(id)}?${new URLSearchParams({ account, returnTo: sessionReturnPath(returnTo, account) })}`;
}

/** Devuelve una ruta local; nunca una URL externa ni una ruta de protocolo relativo. */
export function safeInternalPath(value: unknown, fallback = "/hoy"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, LOCAL_ORIGIN);
    const path = decodeURIComponent(url.pathname);
    if (url.origin !== LOCAL_ORIGIN || path.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(path)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
