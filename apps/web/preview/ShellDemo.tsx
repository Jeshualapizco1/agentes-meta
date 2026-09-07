import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { AuthShell } from "../components/AuthShell";
import { NavMenu } from "../components/NavMenu";
import { DateRange } from "../components/DateRange";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { MetricCard } from "../components/MetricCard";
import { DataState } from "../components/DataState";
import { navigationHref, PERIOD_ROUTES } from "../lib/nav-context";
import { readRange } from "../lib/range";

/** Usa el mismo shell, menú y fechas que Next, sin importar autenticación ni Server Actions. */
export function ShellDemo() {
  const pathname = window.location.pathname;
  const search = window.location.search;
  const p = Object.fromEntries(new URLSearchParams(search));
  const [role, setRole] = useState<"buyer" | "admin">("buyer");
  const range = readRange(p, PERIOD_ROUTES[pathname] ?? 7);
  const [loginMessage, setLoginMessage] = useState(false);
  if (pathname === "/login") return <><a href="#contenido" className="skip-link">Saltar al contenido</a><AuthShell><Card hero className="!p-6 sm:!p-8"><p className="text-xs text-muted">ACCESO · SOLO DEMOSTRACIÓN</p><h1 className="text-2xl font-bold">Tu operación, en un solo lugar.</h1><p className="mt-3 text-sm text-muted">Formulario sintético. No uses credenciales reales.</p><form className="mt-6 flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setLoginMessage(true); }}><Field id="demo-email" label="Correo electrónico" type="email" autoComplete="off" required /><Field id="demo-password" label="Contraseña" type="password" autoComplete="off" required /><Button type="submit" variant="primary">Entrar al ejemplo</Button></form>{loginMessage && <p role="status" className="mt-4 text-sm text-muted">No se inició sesión. Este ejemplo no envía datos.</p>}</Card></AuthShell></>;
  return <><a href="#contenido" className="skip-link">Saltar al contenido</a><AppShell demo pathname={pathname} email="operador@ejemplo.invalid" role={role} brandHref={navigationHref("/hoy", pathname, search)} navigation={<NavMenu pathname={pathname} search={search} role={role} />}>
    <PageHeader eyebrow="NAVEGACIÓN · VISTA DE ENSAYO" title="Tu espacio de trabajo." description="Las tareas de cada día al frente. El detalle y la administración, a un paso." />
    <Card className="mt-6 !p-5"><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted">Datos ficticios · ninguna acción opera cuentas.</p><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={role === "admin"} onChange={e => setRole(e.target.checked ? "admin" : "buyer")} />Probar vista de administrador</label></div></Card>
    <Card className="mt-5 !p-5"><form method="get" className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-0 flex-col gap-1 text-xs text-muted"><label htmlFor="demo-account">Cuenta</label><select id="demo-account" className="max-w-full border px-3 text-base" name="account" defaultValue={p.account ?? "100"}><option value="100">Horizonte Studio · demo</option><option value="200">Órbita Lab · demo</option></select></div>
      {pathname === "/hoy" ? <p className="text-sm text-muted">Hoy conserva su ventana operativa propia; aquí no hay selector de periodo.</p> : <DateRange days={range?.days ?? 7} from={p.from} to={p.to} />}
      <Button type="submit" variant="primary">Aplicar filtros</Button>
    </form></Card>
    {!range ? <div className="mt-5"><DataState kind="error" title="Revisa el periodo" description="El rango indicado no es válido. Corrige las fechas para continuar." /></div> : <>
      <div className="mt-6 grid gap-4 md:grid-cols-3"><MetricCard label="Inversión de ejemplo" value={24860} format={v => `$${v.toLocaleString("es-MX")}`} period="31 ago–6 sep 2026 · fixture fijo" /><MetricCard label="Compras de ejemplo" value={214} format={v => String(v)} period="31 ago–6 sep 2026 · fixture fijo" /><MetricCard label="ROAS de ejemplo" value={3.42} format={v => v.toFixed(2)} period="31 ago–6 sep 2026 · fixture fijo" /></div>
      <Card hero className="mt-6 !p-6"><p className="text-xs text-meta">CONTEXTO DE NAVEGACIÓN</p><h2 className="mt-2 text-xl font-semibold">Cada pantalla conserva lo que necesita.</h2><p className="mt-3 max-w-2xl text-sm text-muted">Al pasar de Anuncios a Rendimiento se conserva la cuenta y el periodo. Hoy y Aprendizajes no heredan fechas que sus consultas no utilizan.</p><p className="mt-4 text-sm">Ruta: <code>{pathname}</code> · Cuenta solicitada: <span data-testid="requested-account">{p.account ?? "sin especificar"}</span></p><p className="mt-2 text-sm text-muted">Periodo solicitado: <span data-testid="requested-period">{range.label}</span>. Las métricas de arriba son fixtures fijos, no resultados de ese filtro.</p></Card>
    </>}
    <footer className="mt-8 flex flex-wrap gap-4 text-xs text-muted"><a href="/">Catálogo de componentes</a><a href="/login">Ver acceso público de ejemplo</a></footer>
  </AppShell></>;
}
