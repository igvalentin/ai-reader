import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, type Row } from "@/packages/db";
import { useAuth } from "./use-auth";

export type Profile = Row<"profiles">;

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery<Profile | null>({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await db.from("profiles").select("id, display_name, avatar_url, created_at, updated_at").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "display_name" | "avatar_url">>) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await db.from("profiles").upsert({ id: user.id, ...patch }).select("id, display_name, avatar_url, created_at, updated_at").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
