import type { Candidate } from "@agentes-meta/core";
export type DecisionFormResult = { ok: boolean; message: string; preview?: { proposals: (Candidate & { blocked: boolean; reasons: string[] })[]; exclusions: { reason: string; entityId: string | null }[]; evaluatedAt: string } };
export const emptyDecisionResult: DecisionFormResult = { ok: false, message: "" };
