import { Chip } from "./Chip";
type Account = { id: string; name: string };
export function Filters({ accounts, actors, params }: { accounts: Account[]; actors: string[]; params: Record<string, string | undefined> }) {
  const f = (k: string, v: string) => { const p = new URLSearchParams(Object.entries(params).filter(([, x]) => x).map(([a, b]) => [a, b!])); if (v) p.set(k, v); else p.delete(k); return `/bitacora?${p}`; };
  const cur = { account: params.account ?? "", actor: params.actor ?? "", sig: params.sig ?? "decisions", days: params.days ?? "14" };
  return (
    <form className="flex flex-wrap items-end gap-4 rounded-md border border-line bg-surface p-4" method="get">
      <label className="flex flex-col gap-1 text-xs text-muted">Cuenta
        <select name="account" defaultValue={cur.account} className="rounded border border-line bg-paper px-2 py-1 text-sm text-ink">
          <option value="">Todas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
      <label className="flex flex-col gap-1 text-xs text-muted">Responsable
        <select name="actor" defaultValue={cur.actor} className="rounded border border-line bg-paper px-2 py-1 text-sm text-ink">
          <option value="">Todos</option>{actors.map(a => <option key={a} value={a}>{a}</option>)}
        </select></label>
      <label className="flex flex-col gap-1 text-xs text-muted">Mostrar
        <select name="sig" defaultValue={cur.sig} className="rounded border border-line bg-paper px-2 py-1 text-sm text-ink">
          <option value="decisions">Decisiones (mayores y menores)</option>
          <option value="major">Solo mayores</option>
          <option value="all">Todo, incluido sistema</option>
        </select></label>
      <label className="flex flex-col gap-1 text-xs text-muted">Periodo
        <select name="days" defaultValue={cur.days} className="rounded border border-line bg-paper px-2 py-1 text-sm text-ink">
          {["7", "14", "30", "90"].map(d => <option key={d} value={d}>Últimos {d} días</option>)}
        </select></label>
      <button className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white">Filtrar</button>
      <a href={f("sig", "")} className="ml-auto self-center"><Chip>limpiar</Chip></a>
    </form>
  );
}
