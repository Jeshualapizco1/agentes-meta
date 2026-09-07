/** Diagnóstico de solo lectura: usa el mismo adaptador que la pantalla protegida. */
import { db } from "../apps/web/lib/db";
import { evaluateWorkspace, loadDecisionWorkspace } from "../apps/web/lib/decision-workspace";

async function main() {
  const { data: accounts, error } = await db().from("accounts").select("id,name").eq("enabled", true).order("name");
  if (error) throw new Error("No se pudo consultar la lista de cuentas habilitadas.");
  for (const account of accounts ?? []) {
    const workspace = await loadDecisionWorkspace(account.id);
    const evaluation = evaluateWorkspace(workspace);
    console.log(JSON.stringify({
      account: account.name,
      today: workspace.source.today,
      mode: workspace.profile.mode,
      simulation: workspace.profile.dry_run,
      entities: workspace.source.entities.length,
      insightRows: workspace.source.insights.length,
      opportunities: workspace.opportunities.map(o => ({ campaign: o.entityName, signal: o.title, days: o.reading.available, from: o.reading.from, to: o.reading.to })),
      structuredRules: workspace.rules.filter(r => r.status === "activa" && r.condition?.version === 1).length,
      candidates: evaluation.proposals.length,
      blocked: evaluation.proposals.filter(p => p.blocked).length,
      recordedDecisions: workspace.reviews.length,
    }));
  }
}
main().catch(() => { console.error("Falló la lectura completa de decisiones; no se realizó ninguna escritura."); process.exitCode = 1; });
