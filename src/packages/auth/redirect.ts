import { searchSchema } from "@/packages/imobiliare/schemas";

/** Only existing, same-origin ImoIndex destinations may follow sign-in. */
export function authDestination(redirect?: string) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\")) return { to: "/" as const };
  const url = new URL(redirect, "https://imoindex.invalid");
  if (url.pathname === "/cautari-salvate") {
    const criteria = searchSchema.safeParse(Object.fromEntries(url.searchParams));
    return { to: "/cautari-salvate" as const, search: criteria.success ? criteria.data : searchSchema.parse({}) };
  }
  if (url.pathname === "/admin") return { to: "/admin" as const };
  return { to: "/" as const };
}