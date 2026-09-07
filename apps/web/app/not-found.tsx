import { DataState } from "@/components/DataState";
export default function NotFound() { return <main id="contenido" tabIndex={-1} className="mx-auto max-w-2xl p-6"><DataState kind="empty" title="No encontramos esta página" description="El enlace puede estar incompleto o el recurso ya no está disponible." action={<a href="/hoy" className="ui-button ui-button-secondary">Ir a Hoy</a>} /></main>; }
