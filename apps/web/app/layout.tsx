import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
export const metadata = { title: "Agentes Meta · Bitácora", description: "Bitácora de cambios en Meta Ads" };

function Brand() {
  return (
    <Link href="/hoy" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-accent)" }} aria-hidden="true"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 18 10 6l4 8 2-4 4 8" /></svg></span>
      <span className="text-lg font-bold tracking-tight">Agentes Meta</span>
    </Link>
  );
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const session = user && <form action="/auth/signout" method="post" className="flex items-center gap-2 text-xs text-muted"><span className="truncate">{user.email}</span><button className="rounded-lg border border-line px-2 py-0.5 hover:text-ink">salir</button></form>;
  return (
    <html lang="es">
      <head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" /></head>
      <body className="min-h-screen">
        <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-4 lg:px-6">
          <aside className="card sticky top-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col p-4 lg:flex">
            <Brand />
            <div className="mt-6"><Nav /></div>
            <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">Hora CDMX</span>
              {session}
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <header className="card mb-4 flex flex-col gap-3 p-3 lg:hidden">
              <div className="flex items-center gap-3"><Brand /><span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-muted">CDMX</span>{session}</div>
              <Nav variant="top" />
            </header>
            <main className="py-2">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
