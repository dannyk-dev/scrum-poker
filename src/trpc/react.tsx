"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  createWSClient,
  httpBatchStreamLink,
  loggerLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "@/server/api/root";
import { createQueryClient } from "./query-client";
import { getBaseUrl } from "@/lib/utils";
// import { wssLink } from "@/server/api/trpc";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

const wsClient = createWSClient({
  url: `ws://localhost:3001`,
  onError(err) {
    console.error(err)
  }
});

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: wsLink({
            client: wsClient,
            transformer: SuperJSON,
          }),
          false: httpBatchStreamLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/api/trpc",
            headers: () => {
              const headers = new Headers();
              headers.set("x-trpc-source", "nextjs-react");
              return headers;
              // return {
              //   "x-trpc-source": "nextjs-react"
              // }
            },
            // fetch: (input, init) => fetch(input, { ...init, credentials: 'include' })
          }),
        }),
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
