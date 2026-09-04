import type { RawActivity } from "@agentes-meta/core";

export class MetaApiError extends Error {
  constructor(public readonly code: number | undefined, public readonly subcode: number | undefined, message: string, public readonly fbtrace?: string) { super(message); }
  get isAuth() { return this.code === 190; }
  get isRateLimit() { return this.code === 4 || this.code === 17 || this.code === 32 || this.code === 613; }
}

export interface MetaClientOptions { token: string; version?: string; maxRetries?: number; log?: (msg: string) => void }

/** Cliente mínimo de Graph API: paginación por cursor, reintentos con espera en rate limit, errores tipados. */
export class MetaClient {
  private readonly base: string;
  constructor(private readonly o: MetaClientOptions) { this.base = `https://graph.facebook.com/${o.version ?? "v23.0"}`; }

  async get<T = unknown>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(`${this.base}/${path.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
    url.searchParams.set("access_token", this.o.token);
    return this.fetchJson<T>(url.toString());
  }

  /** POST de escritura (solo lo usa MetaWriter, que solo conoce tres operaciones). Parámetros como formulario. */
  async post<T = unknown>(path: string, params: Record<string, string | number>): Promise<T> {
    const url = `${this.base}/${path.replace(/^\//, "")}`;
    const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), access_token: this.o.token });
    const res = await fetch(url, { method: "POST", body, signal: AbortSignal.timeout(90_000) });
    const json = (await res.json()) as { error?: { code?: number; error_subcode?: number; message?: string; fbtrace_id?: string } } & T;
    if (json.error) throw new MetaApiError(json.error.code, json.error.error_subcode, json.error.message ?? "Meta API error", json.error.fbtrace_id);
    if (!res.ok) throw new MetaApiError(res.status, undefined, `HTTP ${res.status}`);
    return json;
  }

  private async fetchJson<T>(url: string, attempt = 0): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    } catch (e) {
      // error de red / timeout: reintentar con espera creciente
      if (attempt < (this.o.maxRetries ?? 4)) {
        const wait = 5_000 * 2 ** attempt; this.o.log?.(`red: ${(e as Error).message}, reintento en ${wait / 1000}s`);
        await new Promise(r => setTimeout(r, wait)); return this.fetchJson<T>(url, attempt + 1);
      }
      throw e;
    }
    const body = (await res.json()) as { error?: { code?: number; error_subcode?: number; message?: string; fbtrace_id?: string } } & T;
    if (body.error) {
      const err = new MetaApiError(body.error.code, body.error.error_subcode, body.error.message ?? "Meta API error", body.error.fbtrace_id);
      if (err.isRateLimit && attempt < (this.o.maxRetries ?? 4)) {
        const wait = 30_000 * (attempt + 1); this.o.log?.(`rate limit, esperando ${wait / 1000}s`);
        await new Promise(r => setTimeout(r, wait)); return this.fetchJson<T>(url, attempt + 1);
      }
      throw err;
    }
    if (!res.ok) throw new MetaApiError(res.status, undefined, `HTTP ${res.status}`);
    return body;
  }

  /** Recorre todas las páginas (paging.next). */
  async paginate<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T[]> {
    const out: T[] = [];
    let page = await this.get<{ data: T[]; paging?: { next?: string } }>(path, { limit: 500, ...params });
    out.push(...page.data);
    while (page.paging?.next) { page = await this.fetchJson<{ data: T[]; paging?: { next?: string } }>(page.paging.next); out.push(...page.data); }
    return out;
  }

  account(id: string) {
    return this.get<{ id: string; name: string; account_status: number; currency: string; timezone_name: string; timezone_offset_hours_utc: number; amount_spent: string }>(`act_${id}`, { fields: "name,account_status,currency,timezone_name,timezone_offset_hours_utc,amount_spent" });
  }

  /** Un objeto por id (anuncio, ad set o campaña), aunque Meta ya lo haya borrado. Sirve para resolver la campaña de cambios sobre objetos que ya no existen. */
  node(id: string, fields = "id,name,campaign_id,adset_id,status,effective_status") {
    return this.get<{ id: string; name?: string; campaign_id?: string; adset_id?: string; status?: string; effective_status?: string }>(id, { fields });
  }

  /** Estado del token en uso (debug_token). expires_at = 0 significa sin caducidad (System User). */
  debugToken() {
    return this.get<{ data: { is_valid: boolean; expires_at: number; data_access_expires_at?: number; scopes?: string[]; type?: string; error?: { message: string } } }>("debug_token", { input_token: this.o.token }).then(r => r.data);
  }

  activities(accountId: string, sinceUnix: number, untilUnix?: number) {
    return this.paginate<RawActivity>(`act_${accountId}/activities`, {
      fields: "event_time,event_type,actor_id,actor_name,object_id,object_name,object_type,application_id,application_name,extra_data",
      since: sinceUnix, until: untilUnix,
    });
  }

  campaigns(accountId: string) {
    return this.paginate<Record<string, unknown> & { id: string; name: string }>(`act_${accountId}/campaigns`, { fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,bid_strategy,buying_type,created_time,updated_time,start_time,stop_time" });
  }
  adsets(accountId: string) {
    return this.paginate<Record<string, unknown> & { id: string; name: string; campaign_id: string }>(`act_${accountId}/adsets`, { fields: "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,bid_strategy,bid_amount,optimization_goal,billing_event,targeting,adset_schedule,pacing_type,learning_stage_info,created_time,updated_time,start_time,end_time" });
  }
  ads(accountId: string) {
    return this.paginate<Record<string, unknown> & { id: string; name: string; adset_id: string; campaign_id: string }>(`act_${accountId}/ads`, { fields: "id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time,creative{id,name,thumbnail_url}" });
  }
}

export * from "./write.js";
