import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import JobPage from "../public/JobPage";
import { useSession } from "../auth/session";
import { api } from "../../api/client";
import { ReviewActions } from "./components/ReviewActions";

vi.mock("../auth/session", () => ({ useSession: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("a recoverable extended application failure preserves answers and uses signed-in email", async () => {
  vi.mocked(useSession).mockReturnValue({
    data: { email: "synthetic@demo.example", roles: ["caregiver"], branches: [] },
    isPending: false,
  } as unknown as ReturnType<typeof useSession>);
  vi.spyOn(api, "get").mockResolvedValue({
    data: {
      title: "Synthetic job",
      state_code: "FL",
      description: "Demo only",
      application_form: {
        public_id: "demo-form",
        version_number: 2,
        field_schema: {
          fields: ["experience", "availability"],
          choices: {
            experience: { none: "No prior experience" },
            availability: { weekdays: "Weekdays" },
          },
        },
      },
    },
  });
  const post = vi.spyOn(api, "post").mockRejectedValue(new Error("Synthetic server failure"));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={["/jobs/demo"]}>
        <Routes>
          <Route path="/jobs/:id" element={<JobPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await userEvent.type(await screen.findByLabelText("Synthetic name"), "Synthetic applicant");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Experience" }), "none");
  await userEvent.click(screen.getByLabelText("Weekdays"));
  await userEvent.click(screen.getByRole("checkbox", { name: /Demo data acknowledgement/ }));
  await userEvent.click(screen.getByRole("button", { name: "Submit demo application" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  expect(screen.getByLabelText("Synthetic name")).toHaveValue("Synthetic applicant");
  expect(screen.getByRole("combobox", { name: "Experience" })).toHaveValue("none");
  expect(screen.getByLabelText("Weekdays")).toBeChecked();
  expect(post).toHaveBeenCalledWith(
    "jobs/demo/apply/",
    expect.objectContaining({
      email: "synthetic@demo.example",
      experience: "none",
      availability: ["weekdays"],
    }),
  );
});

test("review rejection requires a reason and preserves it after a server failure", async () => {
  const post = vi.spyOn(api, "post").mockRejectedValue(new Error("Synthetic conflict"));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReviewActions id="demo-version" status="pending" kind="document" />
    </QueryClientProvider>,
  );
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Review decision" }),
    "rejected",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save review" }));
  expect(post).not.toHaveBeenCalled();
  await userEvent.type(screen.getByRole("textbox"), "Synthetic demo reason");
  await userEvent.click(screen.getByRole("button", { name: "Save review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  expect(screen.getByRole("textbox")).toHaveValue("Synthetic demo reason");
  expect(screen.getByRole("button", { name: "Refresh current status" })).toBeVisible();
});
