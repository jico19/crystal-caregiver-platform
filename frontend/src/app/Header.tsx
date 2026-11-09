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
      <header className="flex min-h-24 items-center justify-between gap-6 border-b border-[#d8dfd6] bg-[#faf9f5] px-[max(24px,6vw)] py-6 max-md:items-start max-md:gap-4 max-md:px-6 max-md:py-5">
        <a
          className="absolute left-5 -top-[100px] focus:top-3 focus:z-[5] focus:bg-white focus:p-3"
          href="#main"
        >
          Skip to content
        </a>
        <Link
          className="font-serif text-[25px] font-semibold tracking-[-0.8px] no-underline max-md:whitespace-nowrap max-md:text-[22px]"
          to="/"
        >
          Crystal Care
          <span className="mt-[5px] block font-sans text-xs tracking-[1px] max-md:text-[10px]">
            Multi-state home care
          </span>
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-6 max-md:gap-3.5 [&>a:first-child]:max-md:hidden"
          aria-label="Main navigation"
        >
          <Link to="/states/FL">Caregiver opportunities</Link>
          {session.data ? (
            <>
              <Link to="/portal">Your portal</Link>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-transparent px-[22px] py-3 font-semibold text-[#27543f] transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] hover:text-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-[3px] focus-visible:outline-[#907246] focus-visible:outline-offset-4"
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
