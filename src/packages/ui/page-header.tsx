import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-accent-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {description}
        </p>
      ) : null}
    </div>
  );
}
