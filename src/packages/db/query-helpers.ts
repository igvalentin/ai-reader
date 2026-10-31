/**
 * Reusable query helpers for repositories.
 *
 * These are thin adapters around the Supabase builder that hide the
 * `{ data, error }` shape and translate errors through `toDbError`,
 * so repository methods read like plain async functions.
 */
import type { PostgrestSingleResponse } from "@supabase/postgrest-js";
import { DbError, toDbError } from "./errors";

/**
 * Awaits a Supabase query builder and unwraps the `data` field,
 * throwing a normalized DbError on failure.
 */
export async function unwrap<T>(query: PromiseLike<PostgrestSingleResponse<T>>): Promise<T> {
  const { data, error } = await query;
  if (error) throw toDbError(error);
  return data as T;
}

/**
 * Same as `unwrap` but returns `null` when no row is found instead of
 * throwing. Use with `.maybeSingle()` where absence is expected.
 */
export async function unwrapMaybe<T>(
  query: PromiseLike<PostgrestSingleResponse<T | null>>,
): Promise<T | null> {
  const { data, error } = await query;
  if (error) {
    const normalized = toDbError(error);
    if (normalized.code === "not_found") return null;
    throw normalized;
  }
  return data;
}

/**
 * Enforces a non-null result. Use for `.single()` calls where the
 * caller expects exactly one row (throws DbError("not_found") otherwise).
 */
export async function unwrapRequired<T>(
  query: PromiseLike<PostgrestSingleResponse<T | null>>,
  entity: string,
): Promise<T> {
  const value = await unwrapMaybe(query);
  if (value == null) throw new DbError("not_found", `${entity} not found`);
  return value;
}

export interface PageOptions {
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * Applies range + count("exact") to any Supabase query so a
 * repository can return typed pagination without repeating math.
 * Pass a builder that already has `.select("*", { count: "exact" })`.
 */
export async function paginate<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  { page = 1, pageSize = 25 }: PageOptions = {},
): Promise<Paged<T>> {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  const { data, error, count } = (await query.range(from, to)) as {
    data: T[] | null;
    error: unknown;
    count: number | null;
  };
  if (error) throw toDbError(error);
  const rows = (data ?? []) as T[];
  const total = count ?? 0;
  return {
    rows,
    page: safePage,
    pageSize: safeSize,
    total,
    hasMore: from + rows.length < total,
  };
}
