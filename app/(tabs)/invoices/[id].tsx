import { useLocalSearchParams } from "expo-router";
import { EntityDetail } from "@/components/EntityDetail";
import { getInvoice } from "@/lib/api";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = Number(id);
  return (
    <EntityDetail
      title="Invoice"
      queryKey={["invoices", "detail", invoiceId]}
      fetcher={() => getInvoice(invoiceId)}
      titleKey="number"
      subtitleKey="client_company"
    />
  );
}
