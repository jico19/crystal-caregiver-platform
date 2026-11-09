import type { ReactNode } from "react";

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-control border border-border bg-card p-8 max-md:p-6">
      {children}
    </div>
  );
}
