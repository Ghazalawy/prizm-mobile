import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "./api-types";
import { TRPC_URL } from "./config";
import { getSessionCookie } from "./auth";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        async headers() {
          const cookie = await getSessionCookie();
          return cookie ? { cookie } : {};
        },
      }),
    ],
  });
}
