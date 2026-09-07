import type { ReactNode } from "react";
import { Brand } from "./Brand";
export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="auth-shell"><header><Brand href="/login" /></header><main id="contenido" tabIndex={-1}>{children}</main><footer>Acceso privado del equipo · Agentes Meta</footer></div>;
}
