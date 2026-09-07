import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOTS = ["app", "components", "lib"];
const FORBIDDEN: [string, RegExp][] = [
  ["collector", /\bcollector\b/i], ["analyst", /\banalyst\b/i], ["strategist", /\bstrategist\b/i],
  ["corrida", /\bcorrida\b/i], ["pasada", /\bpasada\b/i], ["dry run", /\bdry[ _]run\b/i],
  ["fetch", /\bfetch\b/i], ["Fase 3/4/4b", /\bfase\s+(?:4b|3|4)\b/i], ["docs/", /docs\//i],
  ["ANTHROPIC_API_KEY", /\bANTHROPIC_API_KEY\b/], ["GitHub", /\bGitHub\b/i], ["migración", /\bmigraci[oó]n\b/i],
  ["JSON", /(?<![/.-])\bJSON\b/i], ["backfill", /\bbackfill\b/i], ["schedule", /\bschedule\b/i], ["cron", /\bcron\b/i],
  ["Supabase", /\bSupabase\b/i], ["PostgREST", /\bPostgREST\b/i], ["piloto", /\bpiloto\b/i],
  ["laboratorio", /\blaboratorio\b/i], ["Codex", /\bCodex\b/i], ["Claude", /\bClaude\b/i],
];

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.toLowerCase() === "lab" || entry.name === "tests" ? [] : files(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\.[^.]+$/.test(entry.name) ? [full] : [];
  });
}

const removeComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const lineAt = (source: string, index: number) => source.slice(source.lastIndexOf("\n", index) + 1, source.indexOf("\n", index) < 0 ? source.length : source.indexOf("\n", index));

function renderedStrings(source: string): { text: string; index: number }[] {
  const found: { text: string; index: number }[] = [];
  for (const match of source.matchAll(/>([^<{;=\n]*[\p{L}\p{N}][^<{;=\n]*)</gu)) found.push({ text: match[1]!, index: match.index! });
  for (const match of source.matchAll(/(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
    const text = match[2]!;
    if (!FORBIDDEN.some(([, pattern]) => pattern.test(text))) continue;
    const line = lineAt(source, match.index!);
    const before = line.slice(0, Math.max(0, match.index! - (source.lastIndexOf("\n", match.index!) + 1)));
    // Excepciones internas documentadas: imports, atributos estructurales, claves y consultas.
    if (/^\s*import\b/.test(line) || /(?:name|href|className|key|value|id|htmlFor)\s*=\s*$/.test(before)) continue;
    if (/\.(?:eq|neq|from|select|in|order|gte|lte|gt|or|filter)\(\s*$/.test(before) || /\.(?:eq|neq|in|or|filter)\(\s*"[^"]*"\s*,\s*$/.test(before) || /(?:===|!==)\s*$/.test(before)) continue;
    if (/\b(?:process\.env|type\s+\w+|interface\s+\w+)\b/.test(line)) continue;
    const rendered = /<(?!\/)/.test(line) || /(?:title|description|label|help|explanation)\s*:\s*$/.test(before) || /\breturn\s*$/.test(before) || /[?:]\s*$/.test(before);
    if (rendered) found.push({ text, index: match.index! });
  }
  return found;
}

describe("guardia de redacción de la interfaz", () => {
  it("no muestra lenguaje técnico fuera de las excepciones documentadas", () => {
    const violations: string[] = [];
    for (const file of ROOTS.flatMap(root => files(join(WEB, root)))) {
      const source = removeComments(readFileSync(file, "utf8"));
      for (const candidate of renderedStrings(source)) {
        // Excepción permitida por la especificación: esta leyenda solo aparece cuando AppShell está en modo demo.
        if (relative(WEB, file).replaceAll("\\", "/") === "components/AppShell.tsx" && candidate.text === "Laboratorio · datos ficticios") continue;
        for (const [term, pattern] of FORBIDDEN) if (pattern.test(candidate.text)) {
          const line = source.slice(0, candidate.index).split("\n").length;
          violations.push(`${relative(WEB, file)}:${line} contiene «${term}» en «${candidate.text.trim()}»`);
        }
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
