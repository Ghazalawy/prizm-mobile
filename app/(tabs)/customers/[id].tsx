import { useLocalSearchParams } from "expo-router";
import { EntityDetail } from "@/components/EntityDetail";
import { getCustomer } from "@/lib/api";

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  return (
    <EntityDetail
      title="Customer"
      queryKey={["customers", "detail", customerId]}
      fetcher={() => getCustomer(customerId)}
      titleKey="company"
    />
  );
}
