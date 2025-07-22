"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import {
  httpBatchStreamLink,
  httpSubscriptionLink,
  loggerLink,
  splitLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "@/server/api/root";
import { createQueryClient } from "./query-client";
import { getBaseUrl } from "@/lib/utils";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  }
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};



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

export const api = createTRPCReact<AppRouter>();


export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
  links: [
    splitLink({
      condition: (opt) => opt.type === 'subscription',
      true: httpSubscriptionLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: SuperJSON,
      }),
      false: httpBatchStreamLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: SuperJSON,
        fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
      }),
    }),
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === 'development' ||
        (opts.direction === 'down' && opts.result instanceof Error),
    }),
  ],
})

  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
