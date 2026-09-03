-- La app usa la llave secreta solo en el servidor; la llave pública (en el navegador, para Auth) no debe leer nada.
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
