# Despliegue de la app (Netlify)

- Sitio: https://bitacora-aromante.netlify.app · equipo Netlify "Aromante" (slug `jeshualapizco`) · site id `9a543e76-f3cf-4bc9-b750-38871a198bcb`
- Netlify rechaza subdominios con "meta"; por eso el nombre es `bitacora-aromante`.
- La carpeta enlazada es `apps/web` (tiene su propio `netlify.toml`). Desplegar SIEMPRE desde ahí:

```bash
cd "/Users/jeshua/agentes Meta/apps/web"
CI=1 netlify deploy --build --prod < /dev/null
```
- Variables de entorno en Netlify: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `APP_URL=https://bitacora-aromante.netlify.app`. Cambiarlas con `netlify env:set NOMBRE valor` desde `apps/web`.
- **Supabase Auth (una vez, en el panel):** Authentication → URL Configuration → Site URL `https://bitacora-aromante.netlify.app` y en Redirect URLs agregar `https://bitacora-aromante.netlify.app/auth/callback` y `http://localhost:3000/auth/callback`. Sin esto el enlace mágico regresa a localhost.
- El CLI de Netlify se cuelga con prompts interactivos; usar `CI=1` y `< /dev/null`. El comando `timeout` no existe en macOS.
