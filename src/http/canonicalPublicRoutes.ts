export const LOKA_CANONICAL_PUBLIC_ROUTES = [
  "/daily-graphic-preview",
  "/daily-insight-lab-preview",
  "/daily-insight-story",
  "/weekly-preview"
] as const;

const LEGACY_PUBLIC_REDIRECTS: Readonly<Record<string, typeof LOKA_CANONICAL_PUBLIC_ROUTES[number]>> = {
  "/": "/daily-graphic-preview",
  "/instagram": "/daily-graphic-preview",
  "/tarnos": "/daily-graphic-preview",
  "/admin": "/daily-insight-lab-preview",
  "/daily-insight-control": "/daily-insight-lab-preview",
  "/daily-insight-op4-gallery": "/daily-insight-lab-preview",
  "/daily-insight-op4-scenario": "/daily-insight-lab-preview",
  "/daily-insight-preview": "/daily-insight-lab-preview",
  "/daily-insight-preview/scenarios": "/daily-insight-lab-preview",
  "/instagram-scenes-preview": "/daily-graphic-preview",
  "/instagram-scenes-preview/frame": "/daily-graphic-preview",
  "/instagram-scenes-preview/studio": "/daily-graphic-preview"
};

/**
 * Phase 1 cleanup: old public entry points are redirected, not deleted.
 * Only GET/HEAD navigation is affected; internal APIs and POST actions remain
 * untouched. A temporary 302 keeps rollback immediate and avoids browser cache.
 */
export function canonicalPublicRedirect(requestUrl: string, method = "GET"): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  const source = new URL(requestUrl);
  const destinationPath = LEGACY_PUBLIC_REDIRECTS[source.pathname];
  if (!destinationPath) return null;

  const destination = new URL(source.origin);
  destination.pathname = destinationPath;
  destination.searchParams.set("city", source.searchParams.get("city") || "tarnos");
  const date = source.searchParams.get("date");
  if (date && destinationPath === "/daily-insight-lab-preview") destination.searchParams.set("date", date);
  return destination.toString();
}

