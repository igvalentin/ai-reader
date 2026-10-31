/** Only existing, same-origin destinations may follow sign-in. */
export function authDestination(redirect?: string) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\")) return { to: "/" as const };
  const url = new URL(redirect, "https://ai-reader.invalid");
  if (url.pathname === "/admin") return { to: "/admin" as const };
  return { to: "/" as const };
}