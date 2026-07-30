import { resolveIncomingAppLink } from "../lib/native-routing";

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return resolveIncomingAppLink(path);
  } catch {
    return "/(tabs)/erp";
  }
}
