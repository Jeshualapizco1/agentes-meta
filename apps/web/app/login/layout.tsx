import type { ReactNode } from "react";
import { AuthShell } from "@/components/AuthShell";
export const metadata = { title: "Iniciar sesión" };
export default function LoginLayout({ children }: { children: ReactNode }) { return <AuthShell>{children}</AuthShell>; }
