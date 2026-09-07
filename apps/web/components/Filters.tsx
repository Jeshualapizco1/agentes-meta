import { DateRange } from "./DateRange";
import { resolveRange } from "@/lib/range";
type Account = { id: string; name: string };
export function Filters({ accounts, actors, params }: { accounts: Account[]; actors: string[]; params: Record<string, string | undefined> }) {
  const range = resolveRange(params, 14);
  const clean = new URLSearchParams();
  if (params.account) clean.set("account", params.account);
  if (range.custom) { clean.set("from", range.from); clean.set("to", range.to); } else clean.set("days", String(range.days));
  const cur = { account: params.account ?? "", actor: params.actor ?? "", sig: params.sig ?? "decisions", days: params.days ?? "14" };
  return (
    <form key={JSON.stringify(params)} className="card flex flex-wrap items-end gap-4 p-4" method="get">
      <label className="flex flex-col gap-1 text-xs text-muted">Cuenta
        <select name="account" defaultValue={cur.account} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink">
          <option value="">Todas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
      <label className="flex flex-col gap-1 text-xs text-muted">Responsable
        <select name="actor" defaultValue={cur.actor} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink">
          <option value="">Todos</option>{actors.map(a => <option key={a} value={a}>{a === "Estratega" ? "Estratega (agente)" : a === "Meta" ? "Meta (sistema)" : a}</option>)}
        </select></label>
      <label className="flex flex-col gap-1 text-xs text-muted">Mostrar
        <select name="sig" defaultValue={cur.sig} className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink">
          <option value="decisions">Decisiones (mayores y menores)</option>
          <option value="major">Solo mayores</option>
          <option value="all">Todo, incluido sistema</option>
        </select></label>
      <DateRange days={range.days} from={params.from} to={params.to} />
      <button className="btn-accent px-3 py-1.5 text-sm font-semibold text-on-accent">Filtrar</button>
      <a href={`/bitacora?${clean}`} className="ui-button ui-button-ghost ml-auto self-center">Limpiar responsable y tipo</a>
    </form>
  );
}
