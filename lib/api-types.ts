// tRPC Router type definitions
// These types match the Prizm CRM backend API structure

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { initTRPC } from "@trpc/server";

const t = initTRPC.create();

// Define the API router shape based on what the app uses
const appRouter = t.router({
  staff: t.router({
    me: t.procedure.query(() => null as any),
  }),
  leads: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
    getById: t.procedure.input({} as any).query(() => null as any),
    search: t.procedure.input({} as any).query(() => null as any),
  }),
  clients: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
    getById: t.procedure.input({} as any).query(() => null as any),
    search: t.procedure.input({} as any).query(() => null as any),
  }),
  tasks: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
    getById: t.procedure.input({} as any).query(() => null as any),
    getOverdue: t.procedure.query(() => null as any),
    getRecent: t.procedure.query(() => null as any),
  }),
  projects: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
    getById: t.procedure.input({} as any).query(() => null as any),
    getActive: t.procedure.query(() => null as any),
  }),
  invoices: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
    getById: t.procedure.input({} as any).query(() => null as any),
    getStatistics: t.procedure.query(() => null as any),
  }),
  estimates: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
  }),
  contracts: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
  }),
  expenses: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
  }),
  tickets: t.router({
    list: t.procedure.input({} as any).query(() => null as any),
    getById: t.procedure.input({} as any).query(() => null as any),
  }),
  calendar: t.router({
    getEvents: t.procedure.input({} as any).query(() => null as any),
    getById: t.procedure.input({} as any).query(() => null as any),
  }),
  notifications: t.router({
    list: t.procedure.query(() => null as any),
    markRead: t.procedure.input({} as any).mutation(() => null as any),
  }),
  dashboard: t.router({
    getSummary: t.procedure.query(() => null as any),
  }),
});

export type AppRouter = typeof appRouter;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
