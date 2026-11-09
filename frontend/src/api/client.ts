import axios from "axios";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000 },
  },
});

export const api = axios.create({
  baseURL: "/api/v1/",
  withCredentials: true,
});

let csrfToken = "";

export async function bootstrapCSRF() {
  const { data } = await api.get<{ csrfToken: string }>("auth/csrf/");
  csrfToken = data.csrfToken;
}

api.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes(config.method ?? "get")) {
    if (!csrfToken) await bootstrapCSRF();
    config.headers.set("X-CSRFToken", csrfToken);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data?.csrfToken) csrfToken = response.data.csrfToken;
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const code = error.response.data?.error?.code;
      if (code === "not_authenticated") {
        queryClient.clear();
        queryClient.setQueryData(["session"], null);
      }
      if (code === "csrf_failed") csrfToken = "";
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "The server could not be reached. Try again.";

    const details = error.response.data?.error?.details;
    if (typeof details === "string") return details;
    if (Array.isArray(details)) return details.join(" ");
    if (details && typeof details === "object") {
      return Object.entries(details)
        .map(([key, value]) => {
          const prefix = key === "detail" || key === "non_field_errors" ? "" : `${key}: `;
          const message = Array.isArray(value) ? value.join(" ") : value;
          return `${prefix}${message}`;
        })
        .join(" ");
    }
    return "This request could not be completed.";
  }
  return "Something went wrong. Try again.";
}
