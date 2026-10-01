/** Keep one canonical Worker route while accepting accidental trailing slashes. */
export function normalizeWorkerPathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}
