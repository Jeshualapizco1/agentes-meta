import { signIn } from "./actions";
import { Card } from "@/components/Card";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  return (
    <Card as="div" className="mx-auto mt-16 max-w-md !p-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Acceso</p>
      <h1 className="text-2xl font-bold tracking-tight">Entrar a la bitácora</h1>
      <p className="mt-1 text-sm text-muted">Usuario y contraseña del equipo. Si no tienes cuenta, pídesela a un administrador.</p>
      {p.error && <p className="mt-4 rounded-xl bg-crit-soft px-3 py-2 text-sm text-crit">{decodeURIComponent(p.error)}</p>}
      <form action={signIn} className="mt-4 flex flex-col gap-2">
        <input type="hidden" name="next" value={p.next ?? "/hoy"} />
        <input name="email" type="email" required autoComplete="username" placeholder="tu@aromante.mx" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="contraseña" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
        <button className="btn-accent px-3 py-2 text-sm font-semibold text-white">Entrar</button>
      </form>
    </Card>
  );
}
