import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
type Variant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; pending?: boolean; pendingLabel?: string; ref?: Ref<HTMLButtonElement>;
};
/** No envía formularios por accidente: los consumidores de acciones deben indicar type="submit". */
export function Button({ variant = "secondary", pending = false, pendingLabel = "Procesando…", disabled, type = "button", className = "", children, ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined}
    className={`ui-button ${variant === "primary" ? "btn-accent" : `ui-button-${variant}`} ${className}`}>
    {pending && <span className="ui-spinner" aria-hidden="true" />}{pending ? pendingLabel : children}
  </button>;
}
export function IconButton({ label, icon, ...props }: Omit<ButtonProps, "children" | "aria-label"> & { label: string; icon: ReactNode }) {
  return <Button {...props} aria-label={label} title={label} className={`ui-button-icon ${props.className ?? ""}`}><span aria-hidden="true">{icon}</span></Button>;
}
