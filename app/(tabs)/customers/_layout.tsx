import { Stack } from "expo-router";

/**
 * Stack inside the Customers tab. Without this, every screen file in this
 * folder (index.tsx, [id].tsx, etc.) gets auto-registered as a separate tab
 * entry by expo-router, jamming the bottom bar with duplicates.
 */
export default function CustomersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
