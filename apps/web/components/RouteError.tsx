"use client";
import { useEffect, useState } from "react";
import { DataState } from "./DataState";
import { Button } from "./Button";
export function RouteError({ reset }: { reset: () => void }) {
  const [loginHref, setLoginHref] = useState("/login");
  useEffect(() => { if (window.location.pathname !== "/login") setLoginHref(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); }, []);
  return <DataState kind="error" title="No pudimos abrir esta vista" description="No se confirmó la carga de datos. Puedes reintentar o volver a iniciar sesión; no se enviará ninguna acción de negocio." action={<div className="flex flex-wrap gap-2"><Button onClick={reset}>Reintentar carga</Button><a className="ui-button ui-button-secondary" href={loginHref}>Iniciar sesión</a></div>} />;
}
