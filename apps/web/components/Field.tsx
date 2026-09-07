import type { InputHTMLAttributes, ReactNode } from "react";
export function Field({ id, label, help, error, unit, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & {
  id: string; label: string; help?: string; error?: string; unit?: string;
}) {
  const describedBy = [props["aria-describedby"], help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ");
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={id} className="text-sm font-semibold">{label}{unit && <span className="ml-2 text-xs font-normal text-muted">{unit}</span>}</label>
    <input {...props} id={id} className={`ui-input ${className}`} aria-describedby={describedBy || undefined} aria-invalid={error ? true : props["aria-invalid"]} />
    {help && <p id={`${id}-help`} className="text-xs leading-relaxed text-muted">{help}</p>}
    {error && <p id={`${id}-error`} className="text-sm text-crit">{error}</p>}
  </div>;
}
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <fieldset className="min-w-0 border-t border-line pt-5">
    <legend className="pr-3 text-base font-semibold">{title}</legend>
    {description && <p className="mb-5 text-sm text-muted">{description}</p>}{children}
  </fieldset>;
}
