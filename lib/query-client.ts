import { QueryClient, focusManager } from "@tanstack/react-query";
import { AppState, AppStateStatus } from "react-native";

/**
 * Singleton QueryClient for the whole app. Tuned for a CRM that doesn't change
 * dramatically minute-to-minute:
 *  - 5 min staleTime: don't refetch on every screen mount
 *  - 30 min gcTime:   keep data in memory while user navigates around
 *  - retry 2 on failure
 *  - refetchOnReconnect: catch up when network returns
 *  - networkMode 'offlineFirst': show cached data immediately if offline
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // RN handles via AppState below
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: 1,
      networkMode: "online",
    },
  },
});

/**
 * Tell React Query when the app becomes active so it can refetch stale queries.
 * Wire this once at the app root.
 */
export function wireAppStateFocus() {
  const onChange = (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  };
  const sub = AppState.addEventListener("change", onChange);
  return () => sub.remove();
}
