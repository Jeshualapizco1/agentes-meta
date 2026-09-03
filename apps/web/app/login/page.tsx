import { signIn } from "./actions";
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-md rounded-md border border-line bg-surface p-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Acceso</p>
      <h1 className="font-serif text-2xl font-medium">Entrar a la bitácora</h1>
      <p className="mt-1 text-sm text-muted">Usuario y contraseña del equipo. Si no tienes cuenta, pídesela a un administrador.</p>
      {p.error && <p className="mt-4 rounded bg-crit-soft px-3 py-2 text-sm text-crit">{decodeURIComponent(p.error)}</p>}
      <form action={signIn} className="mt-4 flex flex-col gap-2">
        <input type="hidden" name="next" value={p.next ?? "/bitacora"} />
        <input name="email" type="email" required autoComplete="username" placeholder="tu@aromante.mx" className="rounded border border-line bg-paper px-3 py-2 text-sm" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="contraseña" className="rounded border border-line bg-paper px-3 py-2 text-sm" />
        <button className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white">Entrar</button>
      </form>
    </div>
  );
}
