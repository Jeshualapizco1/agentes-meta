import { DataState } from "./DataState";
import { InvalidRangeError } from "@/lib/range";
export function InvalidPeriod({ path, account }: { path: string; account?: string }) {
  const query = new URLSearchParams(); if (account) query.set("account", account);
  return <DataState kind="error" title="Revisa el periodo" description={new InvalidRangeError().message} action={<a className="ui-button ui-button-secondary" href={`${path}${query.size ? `?${query}` : ""}`}>Restablecer periodo</a>} />;
}
