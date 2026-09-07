import { Chip } from "./Chip";
import { presentResult, resultPercent, RESULT_HORIZONS, type Win } from "@/lib/results";
import { money } from "@/lib/hoy-view";

export function SessionResults({ wins, currency }: { wins: Win[]; currency: string }) {
  if (!wins.length) return <p className="text-sm text-muted">Todavía sin días completos para medir.</p>;
  return <div className="grid gap-3 md:grid-cols-3">{RESULT_HORIZONS.map(horizon => {
    const w = wins.find(w => w.horizon === horizon);
    const result = presentResult(w ? [w] : []);
    const number = (v: number | null | undefined, decimals = 0) => v == null ? "—" : Number(v).toFixed(decimals);
    return <div key={horizon} className="rounded-xl border border-line bg-paper p-3 text-sm">
      <h3 className="mb-2 font-semibold">{{ "72h": "72 h", "7d": "7 días", "14d": "14 días" }[horizon]}</h3>
      <Chip tone={result.tone}>{result.label}</Chip>
      {w && <><p className="mt-2 text-xs text-muted">{result.detail}</p>
        <dl className="mt-3 space-y-2 tnum">
          <div><dt>ROAS de lo tocado</dt><dd>{number(w.metrics_before?.roas, 2)} → {number(w.metrics_after?.roas, 2)}</dd></div>
          <div><dt>Compras</dt><dd>{number(w.metrics_before?.purchases)} → {number(w.metrics_after?.purchases)}</dd></div>
          <div><dt>Gasto</dt><dd>{money(w.metrics_before?.spend ?? null, currency)} → {money(w.metrics_after?.spend ?? null, currency)}</dd></div>
        </dl>
        {w.delta?.control_roas_pct != null && <p className="mt-3">Resto de la cuenta: ROAS {resultPercent(w.delta.control_roas_pct)}</p>}
        {w.caveats?.map(c => <p key={c} className="mt-2 text-amber">{c}</p>)}
      </>}
    </div>;
  })}</div>;
}
