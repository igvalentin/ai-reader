import { describe, expect, it } from "vitest";
import { authDestination } from "./redirect";

describe("ImoIndex sign-in destinations", () => {
  it("retains saved-search price criteria", () => {
    expect(authDestination("/cautari-salvate?minPrice=80000&maxPrice=160000")).toMatchObject({ to: "/cautari-salvate", search: { minPrice: 80000, maxPrice: 160000 } });
  });
  it("rejects external and deleted destinations", () => {
    for (const path of ["https://example.com", "//example.com", "/\\example.com", "/account", "/saved"]) expect(authDestination(path)).toEqual({ to: "/" });
  });
  it("allows the existing administrator destination", () => {
    expect(authDestination("/admin")).toEqual({ to: "/admin" });
  });
});