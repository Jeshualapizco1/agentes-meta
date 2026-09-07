import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { listAuthUsers } from "@/lib/admin";
import { createUser, removeUser } from "@/app/usuarios/actions";
import { Chip } from "@/components/Chip";
import { fmtDay, fmtTime } from "@/lib/format";
import { Card } from "@/components/Card";
export const dynamic = "force-dynamic";
export const metadata = { title: "Usuarios" };

export default async function Usuarios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; const me = await requireAdmin("/usuarios"); const sb = db();
  const [{ data: users }, auth] = await Promise.all([sb.from("app_users").select("*").order("email"), listAuthUsers().catch(() => [])]);
  const byEmail = new Map(auth.map(u => [u.email?.toLowerCase(), u]));
  return (
    <div className="flex flex-col gap-6">
      <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Administración</p><h1 className="text-3xl font-bold tracking-tight">Usuarios del equipo</h1></div>
      {p.ok && <p className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">Usuario {p.ok} listo. Ya puede entrar con su contraseña.</p>}
      {p.error && <p className="rounded-xl bg-crit-soft px-3 py-2 text-sm text-crit">{p.error}</p>}
      <Card>
        <h2 className="mb-1 font-semibold">Dar de alta o cambiar contraseña</h2>
        <p className="mb-3 text-xs text-muted">Si el correo ya existe, solo se actualiza la contraseña y el rol. Los administradores gestionan usuarios y configuración; los media buyers ven todo y anotan razones.</p>
        <form action={createUser} className="grid gap-2 sm:grid-cols-5">
          <input name="name" placeholder="Nombre" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="correo@aromante.mx" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <input name="password" type="password" required minLength={8} autoComplete="new-password" aria-label="Contraseña nueva (mínimo 8 caracteres)" placeholder="contraseña (mín. 8)" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
          <select name="role" className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"><option value="buyer">Media buyer</option><option value="admin">Administrador</option></select>
          <button className="btn-accent px-3 py-2 text-sm font-semibold text-on-accent">Guardar</button>
        </form>
      </Card>
      <Card>
        <table className="w-full text-sm"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th>Correo</th><th>Nombre</th><th>Rol</th><th>Acceso</th><th>Último ingreso</th><th></th></tr></thead><tbody>
          {(users ?? []).map(u => { const a = byEmail.get(u.email); return (
            <tr key={u.email} className="border-t border-line"><td className="py-2 font-mono text-[13px]">{u.email}</td><td>{u.name ?? a?.email?.split("@")[0]}</td><td><Chip tone={u.role === "admin" ? "ok" : "neutral"}>{u.role === "admin" ? "Administrador" : "Media buyer"}</Chip></td><td>{a ? <Chip tone="ok">con contraseña</Chip> : <Chip tone="amber">sin cuenta aún</Chip>}</td><td className="font-mono text-[12px] text-muted">{a?.last_sign_in_at ? `${fmtDay(a.last_sign_in_at)} ${fmtTime(a.last_sign_in_at)}` : "nunca"}</td>
              <td className="text-right">{u.email !== me.email?.toLowerCase() && <form action={removeUser}><input type="hidden" name="email" value={u.email} /><button className="text-xs text-crit hover:underline">Quitar acceso</button></form>}</td></tr>); })}
        </tbody></table>
      </Card>
    </div>
  );
}
