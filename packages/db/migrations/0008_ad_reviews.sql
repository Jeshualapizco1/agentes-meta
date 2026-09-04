-- Revisiones de anuncios: quién revisó qué anuncio y cuándo (vista Anuncios, contador "sin revisar")
create table if not exists ad_reviews (
  id bigserial primary key,
  ad_id text not null references entities(id),
  account_id text not null references accounts(id),
  reviewed_by text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists ad_reviews_ad_id_idx on ad_reviews(ad_id, created_at desc);
create index if not exists ad_reviews_account_idx on ad_reviews(account_id, created_at desc);
alter table ad_reviews enable row level security;
