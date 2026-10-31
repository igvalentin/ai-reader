import { useMemo, useState, type ReactNode } from "react";
import { Users, ShieldCheck, Building2, Globe, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type AdminSection = "imobiliare" | "surse" | "duplicate" | "users" | "roles";

interface Item {
  id: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: Item[] = [
  { id: "imobiliare", label: "Index imobiliar", icon: Building2 },
  { id: "surse", label: "Surse", icon: Globe },
  { id: "duplicate", label: "Duplicate", icon: Copy },
  { id: "users", label: "Utilizatori", icon: Users },
  { id: "roles", label: "Roluri", icon: ShieldCheck },
];

interface AdminShellProps {
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  render: (section: AdminSection) => ReactNode;
}

/** Responsive admin layout — sidebar on desktop, top scroll on mobile. */
export function AdminShell({ section, onSectionChange, render }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = useMemo(() => ITEMS.find((i) => i.id === section) ?? ITEMS[0], [section]);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Mobile section picker */}
      <div className="flex items-center justify-between lg:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
          <h1 className="font-display text-2xl text-foreground">{current.label}</h1>
        </div>
        <Button variant="outline"
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground"
        >
          {mobileOpen ? "Close" : "Sections"}
        </Button>
      </div>

      <aside
        className={cn(
          "lg:sticky lg:top-20 lg:h-fit lg:w-56 lg:shrink-0",
          mobileOpen ? "block" : "hidden lg:block",
        )}
      >
        <nav aria-label="Admin sections" className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card p-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <Button variant="ghost"
                key={item.id}
                type="button"
                onClick={() => {
                  onSectionChange(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "flex justify-start items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 hidden lg:block">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
          <h1 className="font-display text-3xl text-foreground">{current.label}</h1>
        </div>
        {render(section)}
      </div>
    </div>
  );
}
