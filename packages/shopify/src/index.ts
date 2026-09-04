/**
 * Cliente mínimo de la Admin API de Shopify (GraphQL): reintentos en throttling y red, paginación por cursor,
 * errores tipados. Solo lectura. La app personalizada necesita los permisos read_orders, read_all_orders (historial
 * de más de 60 días) y read_customers.
 */
export class ShopifyApiError extends Error {
  constructor(public readonly status: number | undefined, message: string, public readonly code?: string) { super(message); }
  get isAuth() { return this.status === 401 || this.status === 403 || this.code === "ACCESS_DENIED"; }
  get isThrottled() { return this.status === 429 || this.code === "THROTTLED" || this.code === "MAX_COST_EXCEEDED"; }
}

export interface ShopifyClientOptions { domain: string; token: string; version?: string; maxRetries?: number; log?: (msg: string) => void }

/** Pedido tal como lo devuelve la consulta ORDER_FIELDS. Montos en la moneda de la tienda. */
export interface ShopifyOrder {
  id: string; name: string; createdAt: string; test: boolean; cancelledAt: string | null; displayFinancialStatus: string | null;
  subtotalPriceSet: { shopMoney: { amount: string } };          // después de descuentos, antes de envío
  totalDiscountsSet: { shopMoney: { amount: string } };
  totalRefundedSet: { shopMoney: { amount: string } };          // reembolsos acumulados a la fecha de consulta
  totalPriceSet: { shopMoney: { amount: string } };             // incluye envío
  customer: { id: string; orders: { nodes: { id: string }[] } } | null;  // orders(first:1, CREATED_AT) = su primer pedido
}

const ORDER_FIELDS = `id name createdAt test cancelledAt displayFinancialStatus
  subtotalPriceSet { shopMoney { amount } } totalDiscountsSet { shopMoney { amount } } totalRefundedSet { shopMoney { amount } } totalPriceSet { shopMoney { amount } }
  customer { id orders(first: 1, sortKey: CREATED_AT) { nodes { id } } }`;

export class ShopifyClient {
  readonly domain: string;
  private readonly url: string;
  constructor(private readonly o: ShopifyClientOptions) {
    this.domain = o.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.url = `https://${this.domain}/admin/api/${o.version ?? "2025-07"}/graphql.json`;
  }

  async graphql<T = unknown>(query: string, variables: Record<string, unknown> = {}, attempt = 0): Promise<T> {
    const retry = async (why: string, waitMs: number) => {
      if (attempt >= (this.o.maxRetries ?? 4)) throw new ShopifyApiError(undefined, `Shopify: ${why} (sin más reintentos)`);
      this.o.log?.(`shopify: ${why}, reintento en ${waitMs / 1000}s`);
      await new Promise(r => setTimeout(r, waitMs));
      return this.graphql<T>(query, variables, attempt + 1);
    };
    let res: Response;
    try {
      res = await fetch(this.url, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": this.o.token }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(90_000) });
    } catch (e) { return retry(`red: ${(e as Error).message}`, 5_000 * 2 ** attempt); }
    if (res.status === 429) return retry("rate limit HTTP 429", 10_000 * (attempt + 1));
    if (res.status === 401 || res.status === 403) throw new ShopifyApiError(res.status, `Token de Shopify inválido o sin permisos (HTTP ${res.status})`);
    if (!res.ok) throw new ShopifyApiError(res.status, `Shopify HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[]; extensions?: { cost?: { throttleStatus?: { currentlyAvailable: number; restoreRate: number } } } };
    if (body.errors?.length) {
      const first = body.errors[0]!; const code = first.extensions?.code;
      const err = new ShopifyApiError(undefined, first.message, code);
      if (err.isThrottled) return retry("throttled", 10_000 * (attempt + 1));
      throw err;
    }
    // si el presupuesto de costo va bajo, esperar un poco antes de la siguiente página
    const t = body.extensions?.cost?.throttleStatus;
    if (t && t.currentlyAvailable < 300) await new Promise(r => setTimeout(r, Math.ceil((300 - t.currentlyAvailable) / Math.max(1, t.restoreRate)) * 1000));
    return body.data as T;
  }

  shop() {
    return this.graphql<{ shop: { name: string; myshopifyDomain: string; ianaTimezone: string; currencyCode: string; taxesIncluded: boolean } }>(`{ shop { name myshopifyDomain ianaTimezone currencyCode taxesIncluded } }`).then(d => d.shop);
  }

  /** Pedidos creados en [since, until) (instantes UTC), sin cancelados. Página de 100 (la subconsulta de cliente cuesta puntos). */
  async orders(since: Date, until: Date): Promise<ShopifyOrder[]> {
    const q = `created_at:>='${since.toISOString()}' created_at:<'${until.toISOString()}' -status:cancelled`;
    const out: ShopifyOrder[] = []; let after: string | null = null;
    for (;;) {
      const d: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: ShopifyOrder[] } } = await this.graphql(
        `query($first: Int!, $after: String, $q: String) { orders(first: $first, after: $after, query: $q, sortKey: CREATED_AT) { pageInfo { hasNextPage endCursor } nodes { ${ORDER_FIELDS} } } }`,
        { first: 100, after, q });
      out.push(...d.orders.nodes);
      if (!d.orders.pageInfo.hasNextPage || !d.orders.pageInfo.endCursor) break;
      after = d.orders.pageInfo.endCursor;
    }
    return out;
  }
}
