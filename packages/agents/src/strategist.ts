/**
 * Fase 4 · Estratega en modo semi (infraestructura). La lógica pura vive en core (`strategist.ts`); aquí solo se lee y
 * se escribe la base.
 *  - `strategistWatch` corre en TODAS las pasadas del collector: evalúa los disparadores del freno de emergencia.
 *  - `strategistPass` corre solo en la pasada que llega con el día anterior cerrado (hay insights del último día cerrado
 *    y aún no hay pasada de ese día): expira pendientes, genera candidatos con las reglas vigentes, evalúa candados en
 *    fila, registra propuestas (pendientes o descartadas con razón) y deja huella en la bitácora como actor agente aunque
 *    no proponga nada. Aprobar en semi solo cambia el estado; nadie escribe en Meta hasta la Fase 4b.
 */
import { runPass, evaluateDecisionRules, activeRules, expirePending, brakeTriggers, uuidV5, toZoned, type Rule, type LockContext, type CeilingCheck, type PassProposal, type DecisionEntity, type DecisionInsight } from "@agentes-meta/core";
import { fetchAll, type Db } from "@agentes-meta/db";

type Acc = { id: string; name: string; timezone_name: string };
const addDays = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Activa el freno si no lo está: fila en emergency_brakes + alerta crítica. Nunca lo libera (eso es a mano, por admin). */
export async function engageBrake(db: Db, accountId: string, by: string, reason: string): Promise<boolean> {
  const { data: cur } = await db.from("emergency_brakes").select("active").eq("account_id", accountId).maybeSingle();
  if (cur?.active) return false;
  const { error } = await db.from("emergency_brakes").upsert({ account_id: accountId, active: true, engaged_by: by, engaged_at: new Date().toISOString(), engage_reason: reason, released_by: null, released_at: null, release_reason: null, updated_at: new Date().toISOString() }, { onConflict: "account_id" });
  if (error) throw new Error(error.message);
  await db.from("alerts").insert({ account_id: accountId, kind: "emergency_brake", severity: "critical", message: `Freno de emergencia activado (${by}): ${reason}. Se libera solo a mano, por un administrador, con razón.`, payload: { by, reason, hint: "Revisar la causa, corregirla en Meta o en Configuración y liberar el freno desde Hoy (solo administradores)." } });
  return true;
}

/** Cada pasada: vigila y alerta. Disparadores automáticos del freno. */
export async function strategistWatch(db: Db, acc: Acc, o: { accountStatus: number | null; ceiling: CeilingCheck | null; candidates?: number; proposalWriteFailed?: boolean; log: (m: string) => void }): Promise<string[]> {
  const { data: prof } = await db.from("account_profiles").select("max_actions_per_day").eq("account_id", acc.id).maybeSingle();
  const reasons = brakeTriggers({ spendTodayPartial: o.ceiling?.spend_today_partial ?? null, ceiling: o.ceiling?.ceiling ?? null, candidates: o.candidates ?? 0, maxPerPass: Number(prof?.max_actions_per_day ?? 5), proposalWriteFailed: !!o.proposalWriteFailed, accountStatus: o.accountStatus });
  if (reasons.length && (await engageBrake(db, acc.id, "sistema", reasons.join("; ")))) o.log(`  ⛔ freno de emergencia: ${reasons.join("; ")}`);
  return reasons;
}

export async function strategistPass(db: Db, acc: Acc, o: { ceiling: CeilingCheck | null; accountStatus: number | null; log: (m: string) => void }): Promise<Record<string, unknown>> {
  const now = new Date(); const nowIso = now.toISOString();
  const today = toZoned(now, acc.timezone_name).date, lastClosed = addDays(today, -1);
  // solo la pasada que llega con el día anterior cerrado, una vez por día
  const [{ count: closedRows, error: closedError }, { data: done, error: doneError }] = await Promise.all([
    db.from("insights_daily").select("*", { count: "exact", head: true }).eq("account_id", acc.id).eq("level", "campaign").eq("date", lastClosed).eq("is_closed_day", true),
    db.from("agent_runs").select("id").eq("agent", "strategist").eq("account_id", acc.id).eq("status", "ok").filter("stats->>day", "eq", lastClosed).limit(1),
  ]);
  if (closedError || doneError) return { error: "No se pudo verificar la lectura cerrada o la pasada anterior." };
  if (!closedRows) return { skipped: `sin insights cerrados del ${lastClosed}: esta pasada solo vigila` };
  if (done?.length) return { skipped: `la pasada del ${lastClosed} ya corrió` };

  const { data: run, error: runError } = await db.from("agent_runs").insert({ agent: "strategist", account_id: acc.id, triggered_by: "collector" }).select("id").single();
  if (runError || !run) return { error: "No se pudo registrar el inicio de la pasada." };
  const t0 = Date.now();
  try {
    const [{ data: prof, error: profileError }, { data: brake, error: brakeError }, { data: ruleRows }, { data: pending }, { count: reviewed, error: entityError }] = await Promise.all([
      db.from("account_profiles").select("mode,dry_run,whitelist_campaign_ids,max_budget_change_pct,max_cumulative_change_pct,cumulative_window_days,cooldown_hours,max_actions_per_day").eq("account_id", acc.id).maybeSingle(),
      db.from("emergency_brakes").select("active").eq("account_id", acc.id).maybeSingle(),
      fetchAll<Rule & { version: number }>(() => db.from("rules").select("id,name,action,condition,params,status,mode,valid_from,valid_to,version").eq("account_id", acc.id).order("id")).then(data => ({ data })),
      fetchAll<{ id: string; created_at: string }>(() => db.from("proposals").select("id,created_at").eq("account_id", acc.id).eq("status", "pendiente")).then(data => ({ data })),
      db.from("entities").select("*", { count: "exact", head: true }).eq("account_id", acc.id).eq("effective_status", "ACTIVE"),
    ]);
    if (profileError || brakeError || entityError || !prof) throw new Error("Lectura incompleta de los controles del estratega.");
    // 1. pendientes no decididas antes de esta pasada → expiradas
    const expired = expirePending((pending ?? []) as { id: string; created_at: string }[], nowIso);
    for (let i = 0; i < expired.length; i += 200) { const { error } = await db.from("proposals").update({ status: "expirada", decided_at: nowIso, decision_reason: "Venció el plazo de revisión; si sigue aplicando, se vuelve a proponer." }).in("id", expired.slice(i, i + 200)).eq("status", "pendiente").lte("expires_at", nowIso); if (error) throw new Error(error.message); }
    // 2. Solo reglas estructuradas de revisión y cuentas explícitamente simuladas; nunca activa ejecución real.
    const rules = activeRules((ruleRows ?? []) as Rule[], today);
    const mode = (prof?.mode ?? "off") as "off" | "semi" | "auto";
    const [entities, insights] = await Promise.all([
      fetchAll<DecisionEntity>(() => db.from("entities").select("id,name,level,campaign_id,effective_status,daily_budget,snapshot_at").eq("account_id", acc.id).order("id")),
      fetchAll<DecisionInsight>(() => db.from("insights_daily").select("entity_id,date,spend,purchases,purchase_value,is_closed_day,fetched_at").eq("account_id", acc.id).gte("date", addDays(today, -14)).lte("date", lastClosed).order("entity_id").order("date")),
    ]);
    const evaluation = evaluateDecisionRules(mode === "semi" && prof.dry_run === true ? rules.filter(r => r.params.review_only === true) : [], {
      today, now: nowIso, entities: entities.map(e => ({ ...e, daily_budget: e.daily_budget === null ? null : Number(e.daily_budget) })),
      insights: insights.map(r => ({ ...r, spend: r.spend === null ? null : Number(r.spend), purchases: Number(r.purchases ?? 0), purchase_value: Number(r.purchase_value ?? 0) })),
    });
    const seenCampaigns = new Set<string>();
    const candidates = evaluation.candidates.filter(c => { const key = c.campaign_id ?? c.entity_id; if (seenCampaigns.has(key)) return false; seenCampaigns.add(key); return true; }).map(c => ({ ...c, evidence: [...c.evidence, { ref: "RULE_VERSION", label: "Versión de la regla", value: ruleRows.find(r => r.id === c.rule_id)!.version }] }));
    // 3. contexto de candados (cambios de presupuesto previos sobre las entidades candidatas, persona o agente)
    const ids = [...new Set(candidates.map(c => c.entity_id))];
    const windowDays = Number(prof?.cumulative_window_days ?? 7);
    const recent = ids.length ? await fetchAll<{ object_id: string; started_at: string; details: unknown; actor_kind: string }>(() => db.from("change_groups").select("object_id,started_at,details,actor_kind").eq("account_id", acc.id).eq("kind", "budget").in("object_id", ids).gte("started_at", new Date(now.getTime() - Math.max(windowDays * 86400_000, Number(prof?.cooldown_hours ?? 72) * 3600_000)).toISOString())) : [];
    const ctx: LockContext = {
      now: nowIso, brakeActive: !!brake?.active, lastClosedAvailable: true,
      whitelist: (prof?.whitelist_campaign_ids as string[] | null) ?? [],
      maxChangePct: Number(prof?.max_budget_change_pct ?? 20), maxCumulativePct: Number(prof?.max_cumulative_change_pct ?? 35), cumulativeWindowDays: windowDays, cooldownHours: Number(prof?.cooldown_hours ?? 72), maxPerPass: Number(prof?.max_actions_per_day ?? 5),
      ceiling: o.ceiling ? { ceiling: o.ceiling.ceiling, over_spend: o.ceiling.over_spend, over_committed: o.ceiling.over_committed, budget_pct: o.ceiling.budget_pct, spend_pct: o.ceiling.spend_pct } : null,
      recentChanges: recent.map(r => ({ entity_id: r.object_id as string, at: r.started_at as string, pct: (r.details as { budget?: { pct?: number } } | null)?.budget?.pct ?? null, actor_kind: r.actor_kind as "person" | "agent" | "meta" | "rule" })),
    };
    const result = runPass({ candidates, ctx, entitiesReviewed: reviewed ?? 0 });
    // 4. propuestas: primero la fila (write-ahead), pendiente o descartada con la razón del candado
    let writeFailed = false;
    const expiresAt = new Date(now.getTime() + 24 * 3600_000).toISOString();
    const rows = result.proposals.map((p: PassProposal) => ({ account_id: acc.id, rule_id: p.rule_id, rule_name: p.rule_name, run_id: run!.id, entity_id: p.entity_id, entity_level: p.entity_level, entity_name: p.entity_name, campaign_id: p.campaign_id, action: p.action, before_value: p.before, after_value: p.after, evidence: p.evidence, locks: p.locks, status: p.blocked ? "descartada" : "pendiente", blocked_by: p.blocked_by, decision_reason: p.blocked ? p.locks.filter(l => !l.ok).map(l => `${l.lock}: ${l.reason}`).join(" · ") : null, expires_at: p.blocked ? null : expiresAt }));
    if (rows.length) { const { error } = await db.from("proposals").upsert(rows.map(p => ({ ...p, id: uuidV5(`decision-v1|${acc.id}|${p.rule_id}|${ruleRows.find(r => r.id === p.rule_id)!.version}|${p.entity_id}|${today}`) })), { onConflict: "id", ignoreDuplicates: true }); if (error) { writeFailed = true; o.log(`  ✖ no se pudo registrar propuestas: ${error.message}`); } }
    // 5. freno: disparadores con lo que pasó en esta pasada
    const brakeReasons = await strategistWatch(db, acc, { accountStatus: o.accountStatus, ceiling: o.ceiling, candidates: candidates.length, proposalWriteFailed: writeFailed, log: o.log });
    // 6. huella en la bitácora como actor agente, aunque no haya propuesto nada
    const summary = `${mode === "off" ? "Modo apagado. " : ""}${result.summary}${expired.length ? ` · ${expired.length} propuesta(s) previa(s) expiradas` : ""}`;
    const sid = uuidV5(`session|${acc.id}|strategist|${nowIso}`);
    const { error: se } = await db.from("change_sessions").upsert({ id: sid, account_id: acc.id, actor_id: "strategist", actor_name: "Estratega", actor_kind: "agent", started_at: nowIso, ended_at: nowIso, kind: "other", significance: "minor", resets_learning: false, summary, campaign_ids: [], group_count: 0, event_count: 0, counts: { groups: 0, events: 0, byLevel: {} } }, { onConflict: "id" });
    if (se) throw new Error(se.message);
    const stats = { day: lastClosed, mode, rules: rules.length, reviewed: reviewed ?? 0, candidates: candidates.length, exclusions: evaluation.exclusions, accepted: result.accepted, blocked: result.blocked, expired: expired.length, brake: brakeReasons.length, ms: Date.now() - t0 };
    if (writeFailed) throw new Error("fallo al registrar propuestas");
    await db.from("agent_runs").update({ status: "ok", finished_at: new Date().toISOString(), stats }).eq("id", run!.id);
    o.log(`  ⚙ estratega: ${summary}`);
    return stats;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("agent_runs").update({ status: "failed", finished_at: new Date().toISOString(), error: msg }).eq("id", run!.id);
    await db.from("alerts").insert({ account_id: acc.id, kind: "strategist_failed", severity: "warning", message: `Falló la pasada del estratega: ${msg}` });
    return { error: msg };
  }
}
