import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
export const metadata = { title: "Agentes Meta · Bitácora", description: "Bitácora de cambios en Meta Ads" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap" /></head>
      <body className="min-h-screen">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
            <Link href="/bitacora" className="font-serif text-xl font-semibold">Agentes Meta</Link>
            <nav className="flex gap-4 text-sm text-muted">
              <Link href="/bitacora" className="hover:text-ink">Bitácora</Link>
              <Link href="/estado" className="hover:text-ink">Estado del sistema</Link>
            </nav>
            <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-muted">Hora CDMX</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
