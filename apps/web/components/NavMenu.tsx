import type { ComponentType, AnchorHTMLAttributes } from "react";
import { NAV_GROUPS, isNavActive, navigationHref, type NavigationRole } from "@/lib/nav-context";

export type NavigationLink = ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
const PlainLink: NavigationLink = props => <a {...props} />;
const ICON: Record<string, string> = {
  hoy: "M3 11.5 12 4l9 7.5V20h-6v-6H9v6H3z", bitacora: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  cuenta: "M4 19h16M6 15l4-5 3 3 5-7", anuncios: "M4 5h16v14H4zM4 15l4-4 3 3 3-4 6 5M15 9h.01",
  analisis: "M9 3h6l1 3h3v15H5V6h3zM9 13l2 2 4-5", experimentos: "M9 3h6M10 3v6l-5 9v3h14v-3l-5-9V3M8 15h8",
};
/** Presentación compartida por Next y laboratorio; ocultar un enlace no concede ni revoca permisos. */
export function NavMenu({ pathname, search, role, Link = PlainLink }: { pathname: string; search: string; role: NavigationRole; Link?: NavigationLink }) {
  const link = (href: string, label: string, icon?: string) => <Link key={href} href={navigationHref(href, pathname, search)} aria-current={isNavActive(href, pathname) ? "page" : undefined} className={`shell-nav-link ${isNavActive(href, pathname) ? "ui-nav-active" : ""}`}>
    {icon && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[icon]} /></svg>}{label}
  </Link>;
  const administration = ["/configuracion", "/usuarios", "/estado"].includes(pathname);
  return <nav aria-label="Secciones" className="shell-nav">
    {NAV_GROUPS.map(group => <div key={group.label} className="shell-nav-group"><p className="shell-nav-heading">{group.label}</p>
      {group.items.map(item => <div key={item.href}>{link(item.href, item.label, item.icon)}
        {item.href === "/hoy" && <div className="shell-subnav">{link("/decisiones", "Decisiones")}</div>}
        {item.href === "/cuenta" && <div className="shell-subnav">{link("/horarios", "Horarios")}</div>}
      </div>)}
    </div>)}
    <details key={`${administration}`} open={administration || undefined} className="shell-admin"><summary>Administración</summary><div>
      {link("/configuracion", role === "admin" ? "Configuración" : "Configuración · lectura")}
      {role === "admin" && link("/usuarios", "Usuarios")}
      {link("/estado", "Estado del sistema")}
    </div></details>
  </nav>;
}
