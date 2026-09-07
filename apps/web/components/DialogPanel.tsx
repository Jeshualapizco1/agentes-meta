"use client";
import { useEffect, useId, useRef, type ReactNode, type KeyboardEvent } from "react";
import { IconButton } from "./Button";

/** Modal de detalle: foco contenido, cierre nativo y devolución al control que lo abrió. */
export function DialogPanel({ open, title, description, onClose, children }: {
  open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!open || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => {
      element.close(); document.body.style.overflow = overflow;
      if (previous?.isConnected && previous.getClientRects().length) previous.focus();
      else document.getElementById("contenido")?.focus();
    };
  }, [open]);
  const containFocus = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex="0"]')].filter(el => {
      const closed = el.closest("details:not([open])");
      return el.getClientRects().length > 0 && (!closed || el === closed.querySelector("summary"));
    });
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); items.at(-1)?.focus(); }
    else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0]?.focus(); }
  };
  return <dialog ref={ref} className="hoy-dialog" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}
    onKeyDown={containFocus} onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); }}>
    <header className="hoy-dialog-header"><div><p className="hoy-eyebrow">REVISIÓN CON EVIDENCIA</p><h2 id={`${id}-title`}>{title}</h2>{description && <p id={`${id}-description`} className="mt-2 text-sm text-muted">{description}</p>}</div>
      <IconButton autoFocus label="Cerrar panel" icon="×" onClick={onClose} />
    </header>
    <div className="hoy-dialog-body">{children}</div>
  </dialog>;
}
