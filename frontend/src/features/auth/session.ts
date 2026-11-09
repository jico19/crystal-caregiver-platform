import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { api } from "../../api/client";
import type { Session } from "../../api/types";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return (await api.get<Session>("auth/me/")).data;
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          error.response?.data?.error?.code === "not_authenticated"
        ) {
          return null;
        }
        throw error;
      }
    },
  });
}
