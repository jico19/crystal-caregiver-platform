import type { ReactNode } from "react";

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[5px] border border-[#d2dacf] bg-white p-8 max-md:p-6">
      {children}
    </div>
  );
}
