import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  useBusinessPartnerDetail,
  useBusinessPartnerActivity,
  useBusinessPartnerGroups,
} from "@/lib/queries/business-partners";

const ACCENT = "#0E7490";

type TabKey = "overview" | "activity";

type Props = { id: string };

export function BusinessPartnerDetailScreen({ id }: Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const detail = useBusinessPartnerDetail(id);
  const activity = useBusinessPartnerActivity(id);
  const groups = useBusinessPartnerGroups();

  if (detail.isLoading && !detail.data) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-slate-50">
        <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
        <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load partner</Text>
        <TouchableOpacity onPress={() => detail.refetch()} className="mt-4 px-5 py-2 rounded-lg" style={{ backgroundColor: ACCENT }}>
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = detail.data;
  const groupName = groups.data?.items?.find((g: any) => String(g.id) === String(p.group_id))?.name;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-3 text-lg font-semibold text-foreground flex-1" numberOfLines={1}>
          {p.company || p.name || "Partner"}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/erp/business_partners/${encodeURIComponent(id)}/edit` as any)}
          className="w-9 h-9 rounded-lg items-center justify-center bg-gray-100"
        >
          <Ionicons name="create-outline" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View className="flex-row px-3 pt-3 gap-2">
        {(["overview", "activity"] as TabKey[]).map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setTab(k)}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: tab === k ? ACCENT : "#F1F5F9" }}
          >
            <Text className="text-xs font-semibold capitalize" style={{ color: tab === k ? "#FFF" : "#475569" }}>
              {k}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "overview" ? (
        <ScrollView className="flex-1 px-4 pt-3" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="bg-white rounded-xl p-4 shadow-sm">
            <InfoRow label="Email" value={p.email} />
            <InfoRow label="Phone" value={p.phone || p.phonenumber} />
            <InfoRow label="Group" value={groupName || (p.group_id ? `Group #${p.group_id}` : undefined)} />
            <InfoRow label="City" value={p.city} />
            <InfoRow label="Address" value={p.address} />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={activity.data?.items ?? []}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            activity.isLoading ? (
              <ActivityIndicator color={ACCENT} className="mt-8" />
            ) : (
              <Text className="text-sm text-muted text-center py-8">No activity logged</Text>
            )
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-3 mb-2 shadow-sm">
              <Text className="text-sm text-foreground">{item.description || item.note || "Activity"}</Text>
              {item.date || item.dateadded ? (
                <Text className="text-xs text-muted mt-1">{String(item.date || item.dateadded).slice(0, 16)}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between py-2 border-b border-slate-50">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm font-medium text-slate-900 flex-1 text-right ml-4">{value}</Text>
    </View>
  );
}
