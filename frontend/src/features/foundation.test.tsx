import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AccountPage from "./auth/AccountPage";
import PortalPage from "./portal/PortalPage";
import { api } from "../api/client";
import { useSession } from "./auth/session";

vi.mock("./auth/session", () => ({ useSession: vi.fn() }));
const session = vi.mocked(useSession);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(element: React.ReactNode, path = "/") {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/portal/:role" element={element} />
          <Route path="/" element={element} />
          <Route path="/login" element={<h1>Login destination</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockSession(value: object) {
  session.mockReturnValue(value as ReturnType<typeof useSession>);
}

test("login sends only email and password and displays server failure", async () => {
  const post = vi.spyOn(api, "post").mockRejectedValue(new Error("failure"));
  mount(<AccountPage mode="login" />);

  await userEvent.type(screen.getByLabelText("Email"), "synthetic@demo.example");
  await userEvent.type(screen.getByLabelText("Password"), "demo-test-password");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

  expect(post).toHaveBeenCalledWith("auth/login/", {
    email: "synthetic@demo.example",
    password: "demo-test-password",
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
});

test("protected portal waits for session", () => {
  mockSession({ isPending: true });
  mount(<PortalPage />, "/portal/client");

  expect(screen.getByRole("status")).toHaveTextContent("Loading");
});

test("expired session redirects to login", async () => {
  mockSession({ data: null, isPending: false });
  mount(<PortalPage />, "/portal/client");

  expect(await screen.findByRole("heading", { name: "Login destination" })).toBeInTheDocument();
});

test("caregiver cannot navigate into administrator shell", () => {
  mockSession({
    data: { roles: ["caregiver"], branches: [], email: "demo@demo.example" },
  });
  mount(<PortalPage />, "/portal/super-admin");

  expect(screen.getByRole("heading", { name: "Access denied" })).toBeInTheDocument();
});

test("client empty state shows only own portal and no public state filter", async () => {
  mockSession({
    data: { roles: ["client"], branches: [], email: "demo@demo.example" },
  });
  vi.spyOn(api, "get").mockResolvedValue({ data: { count: 0, results: [] } });
  mount(<PortalPage />, "/portal/client");

  expect(await screen.findByText("No accessible records.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Filter accessible records by state")).not.toBeInTheDocument();
});
