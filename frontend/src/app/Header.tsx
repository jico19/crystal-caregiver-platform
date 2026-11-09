import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, queryClient } from "../api/client";
import { useSession } from "../features/auth/session";
import { Failure } from "../components/Failure";

export function Header() {
  const session = useSession();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => api.post("auth/logout/"),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["session"], null);
      navigate("/login");
    },
  });

  return (
    <>
      <header className="flex min-h-24 flex-col items-start justify-between gap-4 border-b border-border bg-background px-6 py-5 sm:flex-row sm:items-center md:gap-6 md:px-[max(24px,6vw)] md:py-6">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-5 focus:z-10 focus:bg-card focus:p-3"
          href="#main"
        >
          Skip to content
        </a>
        <Link
          className="font-serif text-[25px] font-semibold tracking-[-0.8px] no-underline max-md:whitespace-nowrap max-md:text-[22px]"
          to="/"
        >
          Crystal Care
          <span className="mt-1.25 block font-sans text-xs tracking-[1px] max-md:text-[10px]">
            Multi-state home care
          </span>
        </Link>
        <nav
          className="flex flex-wrap items-center gap-3.5 sm:justify-end md:gap-6"
          aria-label="Main navigation"
        >
          <Link to="/states/FL">Caregiver opportunities</Link>
          {session.data ? (
            <>
              <Link to="/portal">Your portal</Link>
              <button
                className="button button-outline"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </nav>
      </header>
      <Failure error={logout.error} />
    </>
  );
}
