/**
 * Centralized database error handling.
 *
 * Every repository/service wraps raw Supabase / PostgREST errors into
 * a `DbError` so callers get a stable shape (typed `code`, safe
 * `message`, original `cause`) regardless of the underlying driver.
 */
import type { PostgrestError } from "@supabase/supabase-js";

export type DbErrorCode =
  | "not_found"
  | "conflict"
  | "unauthorized"
  | "forbidden"
  | "validation"
  | "unknown";

export class DbError extends Error {
  readonly code: DbErrorCode;
  readonly cause?: unknown;
  readonly details?: string;

  constructor(code: DbErrorCode, message: string, options: { cause?: unknown; details?: string } = {}) {
    super(message);
    this.name = "DbError";
    this.code = code;
    this.cause = options.cause;
    this.details = options.details;
  }
}

/**
 * Maps PostgREST / Postgres error codes to our stable DbError codes.
 * See https://postgrest.org/en/stable/errors.html and
 * https://www.postgresql.org/docs/current/errcodes-appendix.html.
 */
function mapPostgrestCode(pgCode: string | undefined): DbErrorCode {
  switch (pgCode) {
    case "PGRST116": // No rows returned from `.single()`
    case "PGRST103":
      return "not_found";
    case "23505": // unique_violation
      return "conflict";
    case "23503": // foreign_key_violation
    case "23514": // check_violation
    case "23502": // not_null_violation
    case "22P02": // invalid_text_representation
      return "validation";
    case "42501": // insufficient_privilege
    case "PGRST301":
      return "forbidden";
    default:
      return "unknown";
  }
}

/**
 * Normalizes any thrown / returned value into a DbError. Idempotent:
 * calling it on a DbError returns the same instance.
 */
export function toDbError(err: unknown): DbError {
  if (err instanceof DbError) return err;

  if (err && typeof err === "object" && "message" in err) {
    const pg = err as Partial<PostgrestError> & { message: string };
    return new DbError(mapPostgrestCode(pg.code), pg.message, {
      cause: err,
      details: pg.details ?? pg.hint,
    });
  }

  if (err instanceof Error) return new DbError("unknown", err.message, { cause: err });
  return new DbError("unknown", "Unknown database error", { cause: err });
}

/**
 * Wraps an async operation and rethrows a DbError on failure.
 * Use inside repository methods so every call site returns a
 * predictable error type.
 */
export async function wrapDb<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    throw toDbError(err);
  }
}
