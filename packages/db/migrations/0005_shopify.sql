-- Fase 2 · Shopify: qué tienda vende cada cuenta y regla de día cerrado en shopify_daily
alter table accounts add column if not exists shopify_domain text;   -- dominio myshopify de la tienda cuya venta se cruza con la cuenta (null = sin Shopify)
comment on column accounts.shopify_domain is 'Tienda Shopify (dominio myshopify) cuya venta se cruza con esta cuenta. Varias cuentas pueden compartir tienda; el MER se calcula con el gasto de todas.';
alter table shopify_daily add column if not exists is_closed_day boolean not null default false;  -- fecha < hoy en la zona de la tienda
comment on table shopify_daily is 'Un renglón por día en la zona horaria de la tienda. Reembolsos atribuidos a la fecha del pedido. sessions se llena solo si hay fuente (Analítica de Shopify no está en la Admin API).';
update accounts set shopify_domain = 'aromante-4957.myshopify.com' where id = '1703313583465547' and shopify_domain is null;
