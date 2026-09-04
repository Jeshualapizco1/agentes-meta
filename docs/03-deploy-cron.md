# Programar el collector (GitHub Actions)

Ya está hecho (2026-09-03): repo https://github.com/Jeshualapizco1/agentes-meta con secretos cargados. Los comandos quedan como referencia (crean un repo privado, suben el código y guardan los secretos cifrados en GitHub):

```bash
cd "/Users/jeshua/agentes Meta"
gh repo create agentes-meta --private --source=. --remote=origin --push
set -a; . ./.env; set +a
gh secret set META_TOKEN_AROMANTE --body "$META_TOKEN_AROMANTE"
gh secret set SUPABASE_URL --body "$SUPABASE_URL"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"
gh secret set SHOPIFY_ADMIN_TOKEN --body "$SHOPIFY_ADMIN_TOKEN"   # Shopify (ver docs/02-accesos.md); sin él el collector omite Shopify y lo dice en stats
gh workflow run collector          # corrida de prueba
gh run list --workflow=collector   # ver estado
```

Horario: 00:17, 06:17, 12:17 y 18:17 CDMX (minuto 17 porque GitHub retrasa o salta los crons en minuto 0; GitHub también desactiva los schedules tras 60 días sin commits). La corrida de 00:00 CDMX es la consolidación diaria que pediste; las otras tres existen para alertas tempranas.
Cuando cambies el token de Meta (vence 2026-11-02), repite solo `gh secret set META_TOKEN_AROMANTE ...`.
