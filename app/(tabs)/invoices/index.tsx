import { View, Text } from "react-native";
import { router } from "expo-router";
import { EntityList } from "@/components/EntityList";
import { ComingSoonBanner } from "@/components/ComingSoonBanner";
import { getInvoices } from "@/lib/api";

const STATUS = { 1: "Unpaid", 2: "Paid", 3: "Partially paid", 4: "Overdue", 5: "Cancelled", 6: "Draft" } as Record<number, string>;
const STATUS_COLOR = { 1: "#F59E0B", 2: "#16A34A", 3: "#0284C7", 4: "#EF4444", 5: "#64748B", 6: "#94A3B8" } as Record<number, string>;

type Invoice = {
  id: string | number;
  number?: string;
  prefix?: string;
  total?: string | number;
  status?: string | number;
  duedate?: string | null;
  date?: string;
  client_company?: string;
  currency_name?: string;
};

function formatCurrency(amount: any, currency?: string): string {
  if (amount === null || amount === undefined) return "—";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ""}`.trim();
}

export default function InvoicesScreen() {
  return (
    <View className="flex-1">
      <ComingSoonBanner moduleName="Invoices" />
    <EntityList<Invoice>
      title="Invoices"
      icon="document-text-outline"
      queryKey={["invoices"]}
      fetcher={(p) => getInvoices(p)}
      keyExtractor={(i) => String(i.id)}
      searchPlaceholder="Search invoices…"
      emptyMessage="No invoices found"
      onItemPress={(i) => router.push(`/(tabs)/invoices/${i.id}` as any)}
      renderItem={(i) => (
        <View className="bg-white rounded-xl p-3 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-foreground font-semibold">
                {(i.prefix ?? "INV-")}{i.number ?? i.id}
              </Text>
              {i.client_company ? (
                <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                  {i.client_company}
                </Text>
              ) : null}
              <View className="flex-row items-center mt-1 flex-wrap">
                <View
                  className="px-2 py-0.5 rounded-full mr-2"
                  style={{ backgroundColor: `${STATUS_COLOR[Number(i.status)] ?? "#94A3B8"}22` }}
                >
                  <Text
                    className="text-[10px] font-semibold uppercase"
                    style={{ color: STATUS_COLOR[Number(i.status)] ?? "#64748B" }}
                  >
                    {STATUS[Number(i.status)] ?? `Status ${i.status ?? "—"}`}
                  </Text>
                </View>
                {i.duedate && i.duedate !== "0000-00-00" ? (
                  <Text className="text-xs text-muted">Due {i.duedate}</Text>
                ) : null}
              </View>
            </View>
            <Text className="text-foreground font-bold text-base">
              {formatCurrency(i.total, i.currency_name)}
            </Text>
          </View>
        </View>
      )}
    />
    </View>
  );
}
