import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { useCustomersList, useCustomerGroups } from "@/lib/queries/customers";
import { colors } from "@/lib/theme";

const ACCENT = colors.primary;

type StatusFilter = "all" | "1" | "0";
type GroupFilter = "all" | string;

const STATUS_CHIPS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "1", label: "Active" },
  { key: "0", label: "Inactive" },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export function CustomerListScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const groups = useCustomerGroups();

  const q = useCustomersList({
    search: search.trim() || undefined,
    active: statusFilter === "all" ? undefined : statusFilter,
    group: groupFilter === "all" ? undefined : groupFilter,
    limit: 500,
  });

  const { sections, totalCount } = useMemo(() => {
    const items = q.data?.items ?? [];
    const total = q.data?.total ?? items.length;

    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const company = (item.company || "").trim();
      const letter = company.length > 0 ? company[0].toUpperCase() : "#";
      const key = /^[A-Z]$/.test(letter) ? letter : "#";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }

    const sorted = Object.keys(grouped)
      .sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
      .map((letter) => ({ title: letter, data: grouped[letter] }));

    return { sections: sorted, totalCount: total };
  }, [q.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const isLoading = q.isLoading && !q.data;
  const isEmpty = !isLoading && !q.isError && (q.data?.items?.length ?? 0) === 0;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${ACCENT}1A` }}
          >
            <Ionicons name="business-outline" size={22} color={ACCENT} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-2xl font-bold text-slate-900">Customers</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{totalCount} total</Text>
          </View>
        </View>

        {/* Search */}
        <View className="flex-row items-center mt-3 bg-gray-100 rounded-xl px-3 py-2">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search company, phone, VAT, city…"
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-slate-900"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status filter chips */}
        <View className="flex-row mt-3 gap-1.5">
          {STATUS_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setStatusFilter(chip.key)}
              className="rounded-full px-3 py-1.5"
              style={{
                backgroundColor: statusFilter === chip.key ? ACCENT : "#F1F5F9",
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: statusFilter === chip.key ? "#FFF" : "#475569" }}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Group filter */}
          {(groups.data?.length ?? 0) > 0 && (
            <FlatList
              data={groups.data!}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(g) => String(g.id)}
              contentContainerStyle={{ gap: 6, paddingLeft: 4 }}
              renderItem={({ item: g }) => (
                <TouchableOpacity
                  onPress={() => setGroupFilter(groupFilter === String(g.id) ? "all" : String(g.id))}
                  className="rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: groupFilter === String(g.id) ? "#0284C7" : "#F1F5F9",
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: groupFilter === String(g.id) ? "#FFF" : "#475569" }}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
          <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load customers</Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 px-5 py-2 rounded-lg"
            style={{ backgroundColor: ACCENT }}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="business-outline" size={48} color="#94A3B8" />
          <Text className="text-slate-900 font-semibold mt-3">No customers found</Text>
        </View>
      ) : (
        <View className="flex-1 flex-row">
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.userid)}
            renderItem={({ item }) => <CustomerCard item={item} />}
            renderSectionHeader={({ section }) => (
              <View className="px-4 py-1 bg-slate-50">
                <Text className="text-xs font-bold text-slate-400">{section.title}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 12 }}
            ItemSeparatorComponent={() => <View className="h-2" />}
            stickySectionHeadersEnabled
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
            }
          />

          {/* Alphabet sidebar */}
          <View className="py-2 px-1 items-center justify-center">
            {ALPHABET.map((letter) => (
              <TouchableOpacity
                key={letter}
                className="py-0.5 px-1"
                activeOpacity={0.6}
              >
                <Text className="text-[9px] font-bold text-slate-400">{letter}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const CustomerCard = memo(function CustomerCard({ item }: { item: any }) {
  const company = item.company || "Unnamed";
  const contact = item.name || item.contact_name || "";
  const phone = item.phonenumber || "";
  const city = item.city || "";
  const vat = item.vat || "";
  const isActive = String(item.active) === "1";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(tabs)/customers/${item.userid}` as any)}
      activeOpacity={0.72}
      className="bg-white rounded-xl p-4 shadow-sm"
    >
      <View className="flex-row items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <View
              className="w-2.5 h-2.5 rounded-full mr-2"
              style={{ backgroundColor: isActive ? "#16A34A" : "#94A3B8" }}
            />
            <Text className="text-base font-bold text-slate-900 flex-1" numberOfLines={1}>
              {company}
            </Text>
          </View>
          {contact ? (
            <Text className="text-sm text-slate-600 mt-0.5" numberOfLines={1}>
              {contact}
            </Text>
          ) : null}
          <View className="flex-row items-center mt-1.5 flex-wrap gap-x-3">
            {phone ? (
              <Text className="text-xs text-slate-500">{phone}</Text>
            ) : null}
            {city ? (
              <Text className="text-xs text-slate-500">{city}</Text>
            ) : null}
            {vat ? (
              <Text className="text-xs text-slate-400">VAT: {vat}</Text>
            ) : null}
          </View>
        </View>

        {/* Quick actions */}
        <View className="flex-row gap-2 ml-2">
          {phone ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${phone}`)}
              className="w-8 h-8 rounded-full bg-green-50 items-center justify-center"
              hitSlop={4}
            >
              <Ionicons name="call-outline" size={16} color="#16A34A" />
            </TouchableOpacity>
          ) : null}
          {item.email ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${item.email}`)}
              className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
              hitSlop={4}
            >
              <Ionicons name="mail-outline" size={16} color="#2563EB" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});
