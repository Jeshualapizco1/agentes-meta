# Despliegue de la app (Netlify)

- Sitio: https://bitacora-aromante.netlify.app · equipo Netlify "Aromante" (slug `jeshualapizco`) · site id `9a543e76-f3cf-4bc9-b750-38871a198bcb`
- Netlify rechaza subdominios con "meta"; por eso el nombre es `bitacora-aromante`.
- El `netlify.toml` vive en la RAÍZ del repo (base `apps/web`, publish `apps/web/.next`). Desplegar SIEMPRE desde la raíz con el filtro del monorepo; cualquier otra combinación sube los estáticos sin la función servidor y todo responde 404:

```bash
cd "/Users/jeshua/agentes Meta"
CI=1 netlify deploy --prod --filter @agentes-meta/web < /dev/null
```
- Verificar después de cada deploy: `/bitacora` debe responder 307 hacia `/login`. Si responde 200 sin sesión, hay un problema de auth.
- El middleware de Next (edge) NO se ejecuta en Netlify en esta configuración; la protección real es `requireUser()` en cada página (`apps/web/lib/auth.ts`). Toda página nueva con datos debe llamarlo.
- Variables de entorno en Netlify (ya cargadas): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `APP_URL=https://bitacora-aromante.netlify.app`. Cambiarlas con `CI=1 netlify env:set NOMBRE valor --filter @agentes-meta/web < /dev/null` desde la raíz.
- **Supabase Auth (una vez, en el panel):** Authentication → URL Configuration → Site URL `https://bitacora-aromante.netlify.app` y en Redirect URLs agregar `https://bitacora-aromante.netlify.app/auth/callback` y `http://localhost:3000/auth/callback`. Sin esto el enlace mágico regresa a localhost.
- El CLI de Netlify se cuelga con prompts interactivos; usar `CI=1` y `< /dev/null`. El comando `timeout` no existe en macOS.
- **Desde Windows (2026-09-07):** el build "standalone" que exige el runtime de Netlify crea symlinks y falla con `EPERM` si la terminal no es de administrador. Además `pnpm` no está en PATH (solo `corepack pnpm`). Por eso el despliegue se hace en un contenedor Linux con Docker Desktop: `bash scripts/deploy-web-docker.sh` desde la raíz. Clona el repo dentro del contenedor (no toca `node_modules` ni el servidor local) y monta de solo lectura la sesión del CLI (`%APPDATA%\netlify\Config\config.json`); no montar la carpeta completa: trae un `deno` de Windows que rompe el empaquetado de la función edge en Linux. Antes hay que enlazar una vez: `CI=1 netlify link --id 9a543e76-f3cf-4bc9-b750-38871a198bcb --filter @agentes-meta/web`.
- Comprobación sin sesión tras desplegar: `/login` responde 200 con el texto de acceso y `/hoy`, `/bitacora`, `/estado`, `/experimentos` redirigen a `/login`. Con sesión, revisar Hoy, Bitácora, una sesión y Estado de los datos a mano.
