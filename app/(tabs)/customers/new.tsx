import { CrudFormScreen } from "@/components/crud/CrudFormScreen";

export default function CustomerNewScreen() {
  return <CrudFormScreen moduleKey="customers" basePath="/(tabs)/customers" />;
}
