import { Card } from "../Card";
import { Chip } from "../Chip";
import { DataState } from "../DataState";
import { campaignRoasTone, presentCampaignTrend, money, type HoySnapshot } from "@/lib/hoy-view";

export function CampaignReadings({ snapshot }: { snapshot: HoySnapshot }) {
  const section = snapshot.campaigns;
  if (!section) return null;
  const account = snapshot.account;
  return <Card title="Campañas activas · 7 días cerrados">
    {section.state !== "ready" ? <DataState kind={section.state} title="No pudimos leer las campañas" /> : section.data.length ? <>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
        <thead><tr className="text-xs text-muted">{["Campaña", "Gasto", "Compras", "ROAS", "CPA", "Tendencia", "Qué hacer"].map(label => <th key={label} scope="col" className="px-2 py-3">{label}</th>)}</tr></thead>
        <tbody>{section.data.slice(0, 8).map(row => <tr key={row.id} className="border-t border-line">
          <th scope="row" className="max-w-64 px-2 py-3 font-semibold">{row.name}</th>
          <td className="px-2 py-3 tnum">{money(row.spend, account.currency)}</td><td className="px-2 py-3 tnum">{row.purchases}</td>
          <td className="px-2 py-3 tnum">{row.available < 7 ? row.roas?.toFixed(2) ?? "—" : <Chip tone={campaignRoasTone(row)}>{row.roas?.toFixed(2) ?? "—"}</Chip>}</td>
          <td className="px-2 py-3 tnum">{money(row.cpa, account.currency)}</td><td className="px-2 py-3 whitespace-nowrap">{presentCampaignTrend(row)}</td>
          <td className="px-2 py-3">{{ protect: "Proteger inversión", scale: "Potencial de crecimiento", observe: "Observar" }[row.kind]}<a className="mt-1 block text-meta underline" href={`/experimentos?${new URLSearchParams({ account: account.id, campaign: row.id, nuevo: "1" })}`}>Preparar prueba</a></td>
        </tr>)}</tbody>
      </table></div>
      <a href={`/decisiones?account=${account.id}`} className="mt-3 inline-block text-sm text-meta underline">Ver todas</a>
    </> : <p className="text-sm text-muted">No hay campañas activas con inversión en los últimos 7 días cerrados.</p>}
  </Card>;
}
