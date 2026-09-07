export function Brand({ href = "/hoy" }: { href?: string }) {
  return <a href={href} className="shell-brand"><span className="shell-brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 18 10 6l4 8 2-4 4 8" /></svg></span><span>Agentes Meta<small>INTELIGENCIA OPERATIVA</small></span></a>;
}
