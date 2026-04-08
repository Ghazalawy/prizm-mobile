import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { DetailScreenLayout, DetailField, StatusBadge } from "@/components/DetailScreen";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoice = trpc.invoices.getById.useQuery({ id: Number(id) }, { retry: false });
  const data = invoice.data as any;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: data?.number || "Invoice Detail" }} />
      <DetailScreenLayout
        data={data}
        isLoading={invoice.isLoading}
        isError={invoice.isError}
        onRefresh={async () => { await invoice.refetch(); }}
      >
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-xl font-bold text-foreground mb-2">{data?.number || `INV-${id}`}</Text>
          {data?.status && <StatusBadge status={data.status} />}
        </View>
        <View className="bg-white rounded-xl p-4">
          <DetailField label="Client" value={data?.client_name} />
          <DetailField label="Amount" value={data?.total ? `${data.currency || "AED"} ${data.total.toLocaleString()}` : null} />
          <DetailField label="Due Date" value={data?.due_date ? new Date(data.due_date).toLocaleDateString() : null} />
          <DetailField label="Issue Date" value={data?.issue_date ? new Date(data.issue_date).toLocaleDateString() : null} />
          <DetailField label="VAT/TRN" value={data?.vat_number} />
          <DetailField label="Notes" value={data?.notes} />
        </View>
      </DetailScreenLayout>
    </>
  );
}
