import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          const clientError = error.status >= 400 && error.status < 500;
          if (clientError || error.code === "INVALID_RESPONSE") return false;
        }
        return failureCount < 2;
      },
    },
  },
});
