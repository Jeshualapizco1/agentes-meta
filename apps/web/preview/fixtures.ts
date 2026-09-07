// Valores sintéticos, sin cuentas, IDs ni resultados de clientes reales.
export const period = "31 ago–6 sep 2026 · ejemplo de 7 días";
export const series = [2.5, 2.9, 2.7, 3.4, 3.1, 3.6, 3.8].map((value, index) => ({
  date: index === 0 ? "2026-08-31" : `2026-09-0${index}`, value, closed: true,
}));
export const movements = [
  { campaign: "Colección Horizonte", detail: "Campaña de ejemplo · presupuesto diario", value: "$1,200 → $1,350", status: "pending" },
  { campaign: "Esenciales / remarketing", detail: "Campaña de ejemplo · registro de simulación", value: "$640 → $580", status: "simulated" },
  { campaign: "Lanzamiento de temporada", detail: "Campaña de ejemplo · respuesta no confirmada", value: "$900 → $990", status: "unconfirmed" },
] as const;
