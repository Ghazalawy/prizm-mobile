import { View, Text } from "react-native";
import { router } from "expo-router";
import { EntityList } from "@/components/EntityList";
import { ComingSoonBanner } from "@/components/ComingSoonBanner";
import { getLeads } from "@/lib/api";

type Lead = {
  id: string | number;
  name?: string;
  company?: string;
  email?: string;
  phonenumber?: string;
  status?: string | number;
  status_name?: string;
  source_name?: string;
};

export default function LeadsScreen() {
  return (
    <View className="flex-1">
      <ComingSoonBanner moduleName="Leads" />
    <EntityList<Lead>
      title="Leads"
      icon="people-outline"
      queryKey={["leads"]}
      fetcher={(p) => getLeads(p)}
      keyExtractor={(l) => String(l.id)}
      searchPlaceholder="Search leads…"
      emptyMessage="No leads found"
      onItemPress={(l) => router.push(`/(tabs)/leads/${l.id}`)}
      renderItem={(l) => (
        <View className="bg-white rounded-xl p-3 shadow-sm">
          <Text className="text-foreground font-semibold" numberOfLines={2}>
            {l.name || l.company || `Lead #${l.id}`}
          </Text>
          {l.company && l.name && l.company !== l.name ? (
            <Text className="text-xs text-muted mt-0.5">{l.company}</Text>
          ) : null}
          <View className="flex-row items-center mt-1 flex-wrap">
            {l.status_name ? (
              <Text className="text-xs text-muted mr-3">{l.status_name}</Text>
            ) : null}
            {l.source_name ? (
              <Text className="text-xs text-muted mr-3">{l.source_name}</Text>
            ) : null}
            {l.email ? <Text className="text-xs text-muted mr-3" numberOfLines={1}>{l.email}</Text> : null}
          </View>
        </View>
      )}
    />
    </View>
  );
}
