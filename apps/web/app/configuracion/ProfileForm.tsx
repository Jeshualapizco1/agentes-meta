"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { saveProfileState } from "./actions";
import { Button } from "@/components/Button";
import { DataState } from "@/components/DataState";

export function ProfileForm({ children, canEdit }: { children: ReactNode; canEdit: boolean }) {
  const [state, action, pending] = useActionState(saveProfileState, {});
  const formRef = useRef<HTMLFormElement>(null);
  // React reinicia inputs no controlados al resolver una acción, incluso si devuelve un error de dominio.
  // El reset ocurre durante commit, cuando los eventos sintéticos están suspendidos: usar el evento nativo.
  // El éxito navega a la revisión persistida y remonta el formulario con una nueva key.
  useEffect(() => {
    const form = formRef.current;
    const preserveDraft = (event: Event) => event.preventDefault();
    form?.addEventListener("reset", preserveDraft);
    return () => form?.removeEventListener("reset", preserveDraft);
  }, []);
  return <form ref={formRef} action={action} className="flex flex-col gap-6" aria-busy={pending}>
    <fieldset disabled={!canEdit || pending} className="flex min-w-0 flex-col gap-6">{children}</fieldset>
    {state.error && <DataState kind="error" title="Revisa el guardado" description={state.error} />}
    {canEdit && <Button type="submit" variant="primary" pending={pending} pendingLabel="Guardando configuración…" className="self-start">Guardar configuración</Button>}
  </form>;
}
