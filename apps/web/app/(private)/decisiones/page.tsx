import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadDecisionWorkspace, evaluateWorkspace } from "@/lib/decision-workspace";
import { DataState } from "@/components/DataState";
import { DecisionDesk } from "@/components/decisiones/DecisionDesk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Decisiones" };
export default async function Decisions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const member = await requireMember("/decisiones");
  const params = await searchParams;
  const read = await db().from("accounts").select("id,name").eq("enabled", true).order("name");
  if (read.error) return <DataState kind="error" title="No pudimos cargar las cuentas" description="Actualiza para intentar de nuevo." />;
  const accounts = read.data ?? [];
  const account = params.account ? accounts.find(a => a.id === params.account) : accounts[0];
  if (!account) return <DataState kind="empty" title="Selecciona una cuenta disponible" description="No se consultaron decisiones de otra cuenta." action={<a href="/decisiones" className="ui-button ui-button-secondary">Volver a seleccionar</a>} />;
  try {
    const w = await loadDecisionWorkspace(account.id);
    return <DecisionDesk key={account.id} accounts={accounts} account={w.account} admin={member.appRole === "admin"} profile={w.profile} opportunities={w.opportunities} rules={w.rules} reviews={w.reviews} evaluation={evaluateWorkspace(w)} today={w.source.today} />;
  } catch {
    return <DataState kind="error" title="No hay una lectura completa para decidir" description="No se sustituyeron errores por ceros. Revisa la conexión y el perfil de esta cuenta; después actualiza." action={<a href={`/configuracion?account=${account.id}`} className="ui-button ui-button-secondary">Revisar configuración</a>} />;
  }
}
