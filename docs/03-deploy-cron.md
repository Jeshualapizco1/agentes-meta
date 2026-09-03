# Programar el collector (GitHub Actions)

Corre estos comandos en la raíz del proyecto (crean un repo privado, suben el código y guardan los secretos cifrados en GitHub):

```bash
cd "/Users/jeshua/agentes Meta"
gh repo create agentes-meta --private --source=. --remote=origin --push
set -a; . ./.env; set +a
gh secret set META_TOKEN_AROMANTE --body "$META_TOKEN_AROMANTE"
gh secret set SUPABASE_URL --body "$SUPABASE_URL"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"
gh workflow run collector          # corrida de prueba
gh run list --workflow=collector   # ver estado
```

Horario: 00:00, 06:00, 12:00 y 18:00 CDMX. La corrida de 00:00 CDMX es la consolidación diaria que pediste; las otras tres existen para alertas tempranas.
Cuando cambies el token de Meta (vence 2026-11-02), repite solo `gh secret set META_TOKEN_AROMANTE ...`.
