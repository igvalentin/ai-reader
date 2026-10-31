import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: "section" | "header" | "footer" | "main";
}

export function Section({ children, className, as: Tag = "section" }: SectionProps) {
  return <Tag className={cn("py-16 sm:py-24", className)}>{children}</Tag>;
}
