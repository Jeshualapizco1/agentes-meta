"use client";
import { RouteError } from "@/components/RouteError";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="contenido" tabIndex={-1} className="mx-auto max-w-2xl p-6"><RouteError reset={reset} /></main>; }
