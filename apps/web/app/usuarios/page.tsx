import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { listAuthUsers } from "@/lib/admin";
import { createUser, removeUser } from "./actions";
import { Chip } from "@/components/Chip";
import { fmtDay, fmtTime } from "@/lib/format";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function Usuarios({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams; const me = await requireUser("/usuarios"); const sb = db();
  const { data: mine } = await sb.from("app_users").select("role").eq("email", me.email!.toLowerCase()).maybeSingle();
  if (mine?.role !== "admin") redirect("/bitacora");
  const [{ data: users }, auth] = await Promise.all([sb.from("app_users").select("*").order("email"), listAuthUsers().catch(() => [])]);
  const byEmail = new Map(auth.map(u => [u.email?.toLowerCase(), u]));
  return (
    <div className="flex flex-col gap-6">
      <div><p className="font-mono text-[11px] uppercase tracking-wider text-muted">Administración</p><h1 className="font-serif text-3xl font-medium">Usuarios del equipo</h1></div>
      {p.ok && <p className="rounded bg-accent-soft px-3 py-2 text-sm text-accent">Usuario {p.ok} listo. Ya puede entrar con su contraseña.</p>}
      {p.error && <p className="rounded bg-crit-soft px-3 py-2 text-sm text-crit">{decodeURIComponent(p.error)}</p>}
      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="mb-1 font-semibold">Dar de alta o cambiar contraseña</h2>
        <p className="mb-3 text-xs text-muted">Si el correo ya existe, solo se actualiza la contraseña y el rol. Los administradores gestionan usuarios y configuración; los media buyers ven todo y anotan razones.</p>
        <form action={createUser} className="grid gap-2 sm:grid-cols-5">
          <input name="name" placeholder="Nombre" className="rounded border border-line bg-paper px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="correo@aromante.mx" className="rounded border border-line bg-paper px-3 py-2 text-sm" />
          <input name="password" type="text" required minLength={8} placeholder="contraseña (mín. 8)" className="rounded border border-line bg-paper px-3 py-2 text-sm" />
          <select name="role" className="rounded border border-line bg-paper px-3 py-2 text-sm"><option value="buyer">Media buyer</option><option value="admin">Administrador</option></select>
          <button className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white">Guardar</button>
        </form>
      </section>
      <section className="rounded-md border border-line bg-surface p-5">
        <table className="w-full text-sm"><thead><tr className="text-left font-mono text-[11px] uppercase text-muted"><th>Correo</th><th>Nombre</th><th>Rol</th><th>Acceso</th><th>Último ingreso</th><th></th></tr></thead><tbody>
          {(users ?? []).map(u => { const a = byEmail.get(u.email); return (
            <tr key={u.email} className="border-t border-line"><td className="py-2 font-mono text-[13px]">{u.email}</td><td>{u.name ?? a?.email?.split("@")[0]}</td><td><Chip tone={u.role === "admin" ? "ok" : "neutral"}>{u.role}</Chip></td><td>{a ? <Chip tone="ok">con contraseña</Chip> : <Chip tone="amber">sin cuenta aún</Chip>}</td><td className="font-mono text-[12px] text-muted">{a?.last_sign_in_at ? `${fmtDay(a.last_sign_in_at)} ${fmtTime(a.last_sign_in_at)}` : "nunca"}</td>
              <td className="text-right">{u.email !== me.email?.toLowerCase() && <form action={removeUser}><input type="hidden" name="email" value={u.email} /><button className="text-xs text-crit hover:underline">eliminar</button></form>}</td></tr>); })}
        </tbody></table>
      </section>
    </div>
  );
}
