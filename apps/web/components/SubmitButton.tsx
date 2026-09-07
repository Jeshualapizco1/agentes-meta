"use client";
import { useFormStatus } from "react-dom";
import { Button } from "./Button";
export function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="primary" pending={pending} pendingLabel={pendingLabel} className="mt-2">{children}</Button>;
}
