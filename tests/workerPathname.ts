import { normalizeWorkerPathname } from "../src/http/normalizePathname";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WORKER_PATHNAME_FAIL:${label}`);
  passed++;
}

ok(normalizeWorkerPathname("/") === "/", "root_is_preserved");
ok(normalizeWorkerPathname("/api/daily-insight/status") === "/api/daily-insight/status", "canonical_route_is_unchanged");
ok(normalizeWorkerPathname("/api/daily-insight/status/") === "/api/daily-insight/status", "single_trailing_slash_is_removed");
ok(normalizeWorkerPathname("/daily-insight-story///") === "/daily-insight-story", "multiple_trailing_slashes_are_removed");

console.log(`WORKER_PATHNAME ${passed}/4 PASS`);
