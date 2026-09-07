import { signIn } from "./actions";
import { Card } from "@/components/Card";
import { SubmitButton } from "@/components/SubmitButton";
import { Field } from "@/components/Field";
import { safeInternalPath } from "@/lib/navigation";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  return (
    <Card as="div" hero className="w-full !p-6 sm:!p-8">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Acceso</p>
      <h1 className="text-2xl font-bold tracking-tight">Tu operación, en un solo lugar.</h1>
      <p className="mt-1 text-sm text-muted">Usuario y contraseña del equipo. Si no tienes cuenta, pídesela a un administrador.</p>
      {p.next && !p.error && <p className="mt-3 text-sm text-muted">Inicia sesión para continuar en la vista que solicitaste.</p>}
      {p.error && <p role="alert" className="mt-4 rounded-xl bg-crit-soft px-3 py-2 text-sm text-crit">{p.error}</p>}
      <form action={signIn} className="mt-4 flex flex-col gap-2">
        <input type="hidden" name="next" value={safeInternalPath(p.next)} />
        <Field id="login-email" label="Correo electrónico" name="email" type="email" required autoComplete="username" placeholder="nombre@empresa.com" />
        <Field id="login-password" label="Contraseña" name="password" type="password" required autoComplete="current-password" />
        <SubmitButton pendingLabel="Verificando acceso…">Entrar</SubmitButton>
      </form>
    </Card>
  );
}
