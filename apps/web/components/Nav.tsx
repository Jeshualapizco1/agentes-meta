"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON: Record<string, string> = {
  hoy: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  bitacora: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  cuenta: "M4 19h16M6 15l4-5 3 3 5-7",
  anuncios: "M4 5h16v14H4zM4 15l4-4 3 3 3-4 6 5M15 9h.01",
  horarios: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2",
  analisis: "M9 3h6l1 3h3v15H5V6h3zM9 13l2 2 4-5M12 3v3",
  experimentos: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M8 15h8",
  configuracion: "M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M20 17h0M14 5v4M8 10v4M16 15v4",
  usuarios: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a3 3 0 0 0-2-2.8M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  estado: "M3 12h4l3-7 4 14 3-7h4",
};
export const NAV = [
  { href: "/hoy", label: "Hoy", icon: "hoy" }, { href: "/bitacora", label: "Bitácora", icon: "bitacora", also: ["/sesion"] }, { href: "/cuenta", label: "Cuenta", icon: "cuenta" }, { href: "/anuncios", label: "Anuncios", icon: "anuncios" }, { href: "/analisis", label: "Análisis", icon: "analisis" },
  { href: "/experimentos", label: "Experimentos", icon: "experimentos" }, { href: "/horarios", label: "Horarios", icon: "horarios" }, { href: "/configuracion", label: "Configuración", icon: "configuracion" }, { href: "/usuarios", label: "Usuarios", icon: "usuarios" }, { href: "/estado", label: "Estado del sistema", icon: "estado" },
];

/** Navegación con ícono + texto. El ítem activo lleva fondo en gradiente. `variant="top"` es la versión horizontal para móvil. */
export function Nav({ variant = "side" }: { variant?: "side" | "top" }) {
  const path = usePathname();
  const active = (n: typeof NAV[number]) => path === n.href || path.startsWith(n.href + "/") || (n.also ?? []).some(a => path.startsWith(a));
  return (
    <nav aria-label="Secciones" className={variant === "side" ? "flex flex-col gap-1" : "flex gap-1 overflow-x-auto pb-1"}>
      {NAV.map(n => {
        const on = active(n);
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${on ? "font-semibold text-white" : "text-muted hover:bg-white/5 hover:text-ink"}`}
            style={on ? { background: "var(--gradient-accent)" } : undefined}>
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[n.icon]} /></svg>
            <span className={variant === "top" ? "whitespace-nowrap" : ""}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
