// Configura Site URL y Redirect URLs de Supabase Auth vía Management API.
// Requiere SUPABASE_ACCESS_TOKEN (token personal: https://supabase.com/dashboard/account/tokens) en .env
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env", "utf8").split("\n").filter(l => l.includes("=") && !l.startsWith("#")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).split("#")[0].trim()]; }));
const ref = env.SUPABASE_PROJECT_REF, token = env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) { console.error("Faltan SUPABASE_PROJECT_REF o SUPABASE_ACCESS_TOKEN en .env"); process.exit(1); }
const site_url = env.APP_URL_PROD ?? "https://bitacora-aromante.netlify.app";
const uri_allow_list = [`${site_url}/auth/callback`, `${site_url}/**`, "http://localhost:3000/auth/callback", "http://localhost:3000/**"].join(",");
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ site_url, uri_allow_list }) });
const body = await res.json();
if (!res.ok) { console.error("Error", res.status, body); process.exit(1); }
console.log("site_url:", body.site_url); console.log("uri_allow_list:", body.uri_allow_list);
