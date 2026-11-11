import { QueryClient } from "@tanstack/react-query";

export const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});
