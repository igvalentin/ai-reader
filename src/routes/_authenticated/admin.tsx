import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { buildHead } from "@/packages/seo";
import { AdminShell, useIsAdmin, type AdminSection } from "@/packages/admin";
import { db } from "@/packages/db";

const searchSchema = z.object({
  s: z.enum(["users", "roles"]).optional(),
});

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: searchSchema,
  head: () =>
    buildHead({
      title: "Admin - AI Reader",
      path: "/admin",
      description:
        "Admin panel for AI Reader application.",
      noindex: true,
    }),
  component: AdminPage,
});

function AdminPage() {
  const { s } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { isAdmin, loading } = useIsAdmin();
  const section: AdminSection = s ?? "users";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <h2 className="font-display text-xl text-foreground">Doar pentru administratori</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ai nevoie de rolul <code className="rounded bg-muted px-1 py-0.5">admin</code> pentru a vedea această pagină.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Înapoi acasă
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <AdminShell
        section={section}
        onSectionChange={(next) =>
          navigate({
            search: next === "users" ? {} : { s: next },
            replace: true,
          })
        }
        render={(current) => <SectionRenderer section={current} />}
      />
    </div>
  );
}

function SectionRenderer({ section }: { section: AdminSection }) {
  switch (section) {
    case "users":
      return <UsersSection />;
    case "roles":
      return <RolesSection />;
    default:
      return <UsersSection />;
  }
}

/* -------------------- Users -------------------- */

function UsersSection() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const perPage = 20;

  const query = useQuery({
    queryKey: ["admin-users", q, page],
    queryFn: async () => {
      let builder = db
        .from("profiles")
        .select("id, display_name, avatar_url, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * perPage, page * perPage + perPage - 1);
      if (q.trim()) builder = builder.ilike("display_name", `%${q.trim()}%`);
      const { data, error, count } = await builder;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="grid gap-4">
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(0);
        }}
        placeholder="Caută utilizatori după nume…"
        className="h-11 max-w-sm rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="rounded-xl border border-border/60 bg-card p-4">
        {query.isError ? (
          <p className="text-sm text-muted-foreground">
            Lista de utilizatori nu este disponibilă momentan.
          </p>
        ) : query.isLoading ? (
          <p className="text-sm text-muted-foreground">Se încarcă…</p>
        ) : (query.data?.rows.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Niciun utilizator găsit.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Utilizator</th>
                <th className="py-2 pr-4">Înscris</th>
                <th className="py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.rows ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-4">{u.display_name ?? "—"}</td>
                  <td className="py-2 pr-4">
                    {new Date(u.created_at).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="py-2">
                    <code className="text-xs text-muted-foreground">
                      {u.id.slice(0, 8)}…
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pageCount > 1 ? (
          <div className="mt-4 flex items-center gap-3 text-sm">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-input px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <span>
              {page + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-input px-3 py-1.5 disabled:opacity-50"
            >
              Următor
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------- Roles -------------------- */

function RolesSection() {
  const query = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await db
        .from("user_roles")
        .select("user_id, role, expires_at, granted_at")
        .order("granted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Roluri acordate</h3>
      {query.isError ? (
        <p className="text-sm text-muted-foreground">
          Lista rolurilor nu este disponibilă momentan.
        </p>
      ) : query.isLoading ? (
        <p className="text-sm text-muted-foreground">Se încarcă…</p>
      ) : (query.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun rol acordat încă.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Utilizator</th>
              <th className="py-2 pr-4">Rol</th>
              <th className="py-2 pr-4">Expiră</th>
              <th className="py-2">Acordat</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((r) => (
              <tr key={`${r.user_id}-${r.role}`} className="border-b border-border/40 last:border-0">
                <td className="py-2 pr-4">
                  <code className="text-xs">{r.user_id.slice(0, 8)}…</code>
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={
                      r.role === "admin"
                        ? "rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        : "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {r.role}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {r.expires_at
                    ? new Date(r.expires_at).toLocaleDateString("ro-RO")
                    : "—"}
                </td>
                <td className="py-2">
                  {new Date(r.granted_at).toLocaleDateString("ro-RO")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
