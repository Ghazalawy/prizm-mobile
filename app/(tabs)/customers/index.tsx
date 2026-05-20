import { View, Text } from "react-native";
import { router } from "expo-router";
import { EntityList } from "@/components/EntityList";
import { getCustomers } from "@/lib/api";

type Customer = {
  userid?: string | number;
  id?: string | number;
  company?: string;
  phonenumber?: string;
  vat?: string;
  country?: string | number;
  city?: string;
};

export default function CustomersScreen() {
  return (
    <EntityList<Customer>
      title="Customers"
      icon="business-outline"
      queryKey={["customers"]}
      fetcher={(p) => getCustomers(p)}
      keyExtractor={(c) => String(c.userid ?? c.id)}
      searchPlaceholder="Search customers…"
      emptyMessage="No customers found"
      onItemPress={(c) => router.push(`/(tabs)/customers/${c.userid ?? c.id}`)}
      renderItem={(c) => (
        <View className="bg-white rounded-xl p-3 shadow-sm">
          <Text className="text-foreground font-semibold" numberOfLines={2}>
            {c.company || `Customer #${c.userid ?? c.id}`}
          </Text>
          <View className="flex-row items-center mt-1 flex-wrap">
            {c.phonenumber ? (
              <Text className="text-xs text-muted mr-3">{c.phonenumber}</Text>
            ) : null}
            {c.city ? <Text className="text-xs text-muted mr-3">{c.city}</Text> : null}
            {c.vat ? <Text className="text-xs text-muted">VAT {c.vat}</Text> : null}
          </View>
        </View>
      )}
    />
  );
}
