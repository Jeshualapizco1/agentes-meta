/**
 * Fase 3 · Narrativa del reporte semanal con Claude. El modelo NO calcula nada: recibe el paquete de evidencia
 * (números ya hechos por core) y solo redacta. Reglas: "coincidió con", nunca "causó"; no inventar cifras.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { WeeklyEvidence } from "@agentes-meta/core";

export const NARRATIVE_MODEL = "claude-opus-5";
const SYSTEM = `Eres el analista semanal de paid media de Aromante (fragancias para hombres, México). Redactas en español, para el media buyer y el dueño.
Recibes un paquete de evidencia en JSON con números ya calculados por código determinista. Reglas que no se negocian:
- Usa únicamente cifras del paquete. No inventes, no estimes, no redondees más allá de lo que trae. Si un dato no está, dilo.
- Habla de correlación: "coincidió con", "después de X se vio Y". Nunca "causó", "gracias a", "provocó".
- Respeta el nivel de confianza de cada veredicto (high/medium/low/insufficient) y el estado (pending/preliminary/mature). Lo preliminar se presenta como preliminar.
- Cada oración que contenga una cifra termina con la referencia de la fila de evidencia de donde sale, entre corchetes: [T] totales de la semana, [T-1] semana previa, [O] objetivos del perfil, [S3] la sesión con ref S3, [C2] la campaña con ref C2. Una cifra sin referencia no se escribe. No combines filas para derivar cifras nuevas (nada de sumar, restar ni promediar).
- Si una evaluación trae \`caveats\`, la salvedad se dice junto al veredicto con sus propias palabras (p. ej. presupuesto compartido: el control no es independiente).
- Sé concreto y breve. Nada de introducciones ni cierres de cortesía.
Formato (Markdown sencillo, títulos con ##):
## Resumen de la semana  (3-5 líneas: gasto, ROAS, CPA vs. semana previa y vs. objetivos del perfil)
## Qué cambios coincidieron con mejoras
## Qué cambios coincidieron con deterioros
## Sin evidencia todavía  (cambios pendientes o con pocas compras, en una línea cada uno)
## Campañas  (mejores y peores por ROAS con su gasto y compras)
## Para la próxima semana  (2-4 observaciones accionables, siempre como "revisar" o "considerar", nunca como orden; el estratega llega después)`;

export async function writeWeeklyNarrative(evidence: WeeklyEvidence, accountName: string, apiKey: string): Promise<{ text: string; model: string }> {
  const client = new Anthropic({ apiKey });
  const res = await client.beta.messages.create({
    model: NARRATIVE_MODEL, max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    output_config: { effort: "medium" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Cuenta: ${accountName}. Periodo: ${evidence.period.start} a ${evidence.period.end} (semana previa ${evidence.previous.start} a ${evidence.previous.end}).\n\nPaquete de evidencia:\n${JSON.stringify(evidence)}` }],
  });
  if (res.stop_reason === "refusal") throw new Error(`Claude declinó redactar: ${res.stop_details?.explanation ?? "sin explicación"}`);
  const text = res.content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  if (!text) throw new Error("Claude devolvió una respuesta vacía");
  return { text, model: res.model };
}
