import { DataState } from "@/components/DataState";
export default function NotFound() { return <DataState kind="empty" title="No encontramos este recurso" description="Comprueba el enlace o vuelve a la bitácora." action={<a href="/bitacora" className="ui-button ui-button-secondary">Ir a Bitácora</a>} />; }
