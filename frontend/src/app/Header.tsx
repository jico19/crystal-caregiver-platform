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
      <header>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Link className="brand" to="/">
          Crystal Care
          <span>Multi-state home care</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/states/FL">Caregiver opportunities</Link>
          {session.data ? (
            <>
              <Link to="/portal">Your portal</Link>
              <button
                className="secondary"
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
