import { Suspense, type ReactNode } from "react";
import { requireMember } from "@/lib/auth";
import { PrivateShell } from "@/components/Nav";
import { DataState } from "@/components/DataState";
export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const member = await requireMember("/hoy");
  // El layout no reemplaza las guardas de cada página/acción; Next puede conservarlo al navegar.
  return <Suspense fallback={<main id="contenido" tabIndex={-1}><DataState kind="loading" /></main>}><PrivateShell email={member.email} role={member.appRole}>{children}</PrivateShell></Suspense>;
}
