import "./globals.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import type { ReactNode } from "react";
export const metadata = { title: { default: "Agentes Meta", template: "%s · Agentes Meta" }, description: "Decisiones, resultados y evidencia para operar Meta Ads." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body><a href="#contenido" className="skip-link">Saltar al contenido</a>{children}</body></html>;
}
