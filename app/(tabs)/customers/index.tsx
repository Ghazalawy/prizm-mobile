import { CrudListScreen } from "@/components/crud/CrudListScreen";

export default function CustomersScreen() {
  return <CrudListScreen moduleKey="customers" basePath="/(tabs)/customers" />;
}
