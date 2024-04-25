import crypto from "crypto";

export function normalizeTitle(s: string | null | undefined): string {
  if (!s) return "";
  // lower, trim, collapse internal whitespace, drop leading/trailing punctuation-ish
  const collapsed = s
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  return collapsed.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
}

// Deterministic fingerprint for “class of tasks” in Toggl
export function buildTaskFingerprint(opts: {
  description: string | null | undefined;
  projectId: number | string | null | undefined;
  tagIds: Array<number | string> | null | undefined;
  workspaceId: number | string | null | undefined;
}): string {
  const desc = normalizeTitle(opts.description ?? "");
  const proj = opts.projectId ?? "0";
  const ws = opts.workspaceId ?? "0";
  const tags = (opts.tagIds ?? []).map(String).sort().join(",");
  const raw = `${desc}|${proj}|${tags}|${ws}`;
  return crypto.createHash("sha1").update(raw, "utf8").digest("hex");
}

export function togglIsRunning(duration: number | null | undefined): boolean {
  return typeof duration === "number" && duration < 0;
}

export function parseDateOrNull(x: string | null | undefined): Date | null {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}
