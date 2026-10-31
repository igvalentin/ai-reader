/**
 * Typed database client aliases.
 *
 * Every repository imports `db` from this file — never the raw
 * `@/integrations/supabase/client` module — so we can swap the
 * underlying driver (Supabase, PostgREST, direct pg) in one place.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Db = typeof supabase;
export const db: Db = supabase;

export type Schema = Database["public"];
export type Tables = Schema["Tables"];
export type TableName = keyof Tables;

export type Row<T extends TableName> = Tables[T]["Row"];
export type InsertRow<T extends TableName> = Tables[T]["Insert"];
export type UpdateRow<T extends TableName> = Tables[T]["Update"];

export type { Database };
