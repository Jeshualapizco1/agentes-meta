"use client";
import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { Button } from "./Button";
import { Brand } from "./Brand";

/** Solo estructura: la membresía se verifica en servidor y cada acción conserva su propia guarda. */
export function AppShell({ children, navigation, email, role, pathname, brandHref = "/hoy", demo = false }: {
  children: ReactNode; navigation: ReactNode; email: string; role: "admin" | "buyer"; pathname: string; brandHref?: string; demo?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => { dialog.current?.close(); setOpen(false); };
  const keepFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex="0"]')].filter(el => {
      const closedDetails = el.closest("details:not([open])");
      return el.getClientRects().length > 0 && (!closedDetails || el === closedDetails.querySelector("summary"));
    });
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  useEffect(() => { dialog.current?.close(); setOpen(false); }, [pathname]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const resize = () => { if (query.matches) { dialog.current?.close(); setOpen(false); } };
    query.addEventListener("change", resize); return () => query.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);
  const session = <div className="shell-session"><span className="shell-nav-heading">{role === "admin" ? "Administrador" : "Operador"}{demo ? " · demo" : ""}</span><p>{email}</p>
    {demo ? <p className="text-xs text-muted">Sin sesión ni servicios reales</p> : <form action="/auth/signout" method="post"><Button type="submit" variant="ghost">Cerrar sesión</Button></form>}
  </div>;
  return <div className="app-shell">
    <aside className="shell-sidebar"><Brand href={brandHref} />{navigation}{session}</aside>
    <div className="shell-workspace">
      <header className="shell-mobile-bar"><Brand href={brandHref} /><Button ref={trigger} aria-haspopup="dialog" aria-controls="mobile-navigation" aria-expanded={open} onClick={() => { dialog.current?.showModal(); setOpen(true); }}>Menú</Button></header>
      <div className="shell-context-line"><span>{demo ? "Laboratorio · datos ficticios" : "Espacio de trabajo"}</span><span>Hora CDMX</span></div>
      <main id="contenido" tabIndex={-1}>{children}</main>
    </div>
    <dialog ref={dialog} id="mobile-navigation" aria-labelledby="mobile-navigation-title" className="shell-dialog" onKeyDown={keepFocus} onClose={() => { setOpen(false); if (trigger.current?.getClientRects().length) trigger.current.focus(); }} onCancel={() => setOpen(false)} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}>
      <div className="shell-dialog-heading"><h2 id="mobile-navigation-title">Navegación</h2><Button autoFocus onClick={close}>Cerrar menú</Button></div>
      <div onClick={e => { if ((e.target as Element).closest("a")) close(); }}>{navigation}</div>{session}
    </dialog>
  </div>;
}
