import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useReportsList,
  useReportProjects,
  type ReportListItem,
  type ReportFilters,
} from "@/lib/queries/reports";
import { usePermissions } from "@/lib/permission-context";

const ACCENT = "#E65100";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  "1": { label: "Active", color: "#15803D", bg: "#F0FDF4" },
  "0": { label: "Draft", color: "#92400E", bg: "#FFFBEB" },
  "2": { label: "Approved", color: "#1D4ED8", bg: "#EFF6FF" },
};

function statusBadge(status: string | number) {
  const s = String(status);
  return STATUS_MAP[s] ?? { label: `Status ${s}`, color: "#475569", bg: "#F1F5F9" };
}

export function ReportListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const { canCreate: canCreatePerm } = usePermissions();
  const canCreateReport = canCreatePerm("prizm_reports");

  const filters: ReportFilters = useMemo(
    () => ({
      search: search || undefined,
      project_id: selectedProject,
      limit: 100,
    }),
    [search, selectedProject]
  );

  const { data, isLoading, isError, refetch, isRefetching } = useReportsList(filters);
  const { data: projects } = useReportProjects();
  const items = data?.items ?? [];

  const selectedProjectName = useMemo(() => {
    if (!selectedProject) return "All Projects";
    return projects?.find((p) => p.id === selectedProject)?.name ?? `Project #${selectedProject}`;
  }, [selectedProject, projects]);

  const handleCreate = useCallback(() => {
    router.push({
      pathname: "/(tabs)/reports/new" as any,
      params: selectedProject ? { project_id: String(selectedProject) } : {},
    });
  }, [router, selectedProject]);

  const handleDetail = useCallback(
    (id: number) => router.push(`/(tabs)/reports/${id}` as any),
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ReportListItem }) => {
      const badge = statusBadge(item.status);
      const dateStr = item.report_date
        ? new Date(item.report_date + "T00:00:00").toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "";

      return (
        <TouchableOpacity
          onPress={() => handleDetail(item.id)}
          activeOpacity={0.7}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-mono text-slate-400 mb-1">
                {item.report_code}
              </Text>
              <Text className="text-base font-semibold text-slate-900" numberOfLines={2}>
                {item.project_name || `Project #${item.project_id}`}
              </Text>
            </View>
            <View
              className="px-2.5 py-1 rounded-full"
              style={{ backgroundColor: badge.bg }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: badge.color }}
              >
                {badge.label}
              </Text>
            </View>
          </View>

          {item.scope_description ? (
            <Text className="text-sm text-slate-600 mt-2" numberOfLines={2}>
              {item.scope_description}
            </Text>
          ) : null}

          <View className="flex-row items-center mt-3 pt-3 border-t border-slate-100">
            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
            <Text className="text-xs text-slate-500 ml-1.5">{dateStr}</Text>

            {item.creator_name ? (
              <>
                <View className="w-1 h-1 rounded-full bg-slate-300 mx-2.5" />
                <Ionicons name="person-outline" size={14} color="#94A3B8" />
                <Text className="text-xs text-slate-500 ml-1.5" numberOfLines={1}>
                  {item.creator_name}
                </Text>
              </>
            ) : null}

            {item.client_name ? (
              <>
                <View className="w-1 h-1 rounded-full bg-slate-300 mx-2.5" />
                <Text className="text-xs text-slate-500" numberOfLines={1}>
                  {item.client_name}
                </Text>
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
    [handleDetail]
  );

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-4 pt-3 pb-2 bg-white border-b border-slate-100">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-slate-900">Reports</Text>
            <Text className="text-sm text-slate-500 mt-0.5">
              Daily Progress Reports
            </Text>
          </View>
          {canCreateReport ? (
            <TouchableOpacity
              onPress={handleCreate}
              className="flex-row items-center px-4 py-2.5 rounded-xl"
              style={{ backgroundColor: ACCENT }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text className="text-white font-semibold ml-1.5">New</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2 mb-2">
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-slate-900 text-sm"
            placeholder="Search reports…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Project filter */}
        <TouchableOpacity
          onPress={() => setShowProjectPicker(true)}
          className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2.5"
          activeOpacity={0.7}
        >
          <Ionicons name="folder-outline" size={16} color="#64748B" />
          <Text className="flex-1 text-sm text-slate-700 ml-2" numberOfLines={1}>
            {selectedProjectName}
          </Text>
          {selectedProject ? (
            <TouchableOpacity
              onPress={() => setSelectedProject(undefined)}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down-outline" size={16} color="#94A3B8" />
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading && !items.length ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT} />
          <Text className="text-slate-500 mt-3">Loading reports…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={52} color="#EF4444" />
          <Text className="text-slate-900 font-semibold text-lg mt-3">
            Couldn&apos;t load reports
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100"
          >
            <Text className="text-slate-700 font-semibold">Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={ACCENT}
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center pt-20">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: "#FFF3E0" }}
              >
                <Ionicons name="document-text-outline" size={36} color={ACCENT} />
              </View>
              <Text className="text-slate-900 font-semibold text-lg">
                No reports yet
              </Text>
              <Text className="text-slate-500 text-sm mt-1 text-center px-8">
                Tap the + New button to create your first daily progress report.
              </Text>
            </View>
          }
        />
      )}

      {/* Project picker modal */}
      {showProjectPicker && (
        <ProjectPickerModal
          projects={projects ?? []}
          selected={selectedProject}
          onSelect={(id) => {
            setSelectedProject(id);
            setShowProjectPicker(false);
          }}
          onClose={() => setShowProjectPicker(false)}
        />
      )}
    </View>
  );
}

function ProjectPickerModal({
  projects,
  selected,
  onSelect,
  onClose,
}: {
  projects: { id: number; name: string; client_name: string | null }[];
  selected?: number;
  onSelect: (id: number | undefined) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(
    () =>
      filter
        ? projects.filter(
            (p) =>
              p.name.toLowerCase().includes(filter.toLowerCase()) ||
              (p.client_name ?? "").toLowerCase().includes(filter.toLowerCase())
          )
        : projects,
    [projects, filter]
  );

  return (
    <Pressable
      className="absolute inset-0 bg-black/40"
      onPress={onClose}
      style={{ zIndex: 50 }}
    >
      <Pressable
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
        style={{ maxHeight: "75%" }}
        onPress={(e) => e.stopPropagation()}
      >
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-slate-300" />
        </View>
        <View className="px-4 pb-2">
          <Text className="text-lg font-bold text-slate-900 mb-2">
            Filter by Project
          </Text>
          <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2">
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              className="flex-1 ml-2 text-sm text-slate-900"
              placeholder="Search projects…"
              placeholderTextColor="#94A3B8"
              value={filter}
              onChangeText={setFilter}
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => onSelect(undefined)}
          className="flex-row items-center px-4 py-3 border-b border-slate-100"
        >
          <View
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{ backgroundColor: !selected ? "#E65100" : "#F1F5F9" }}
          >
            <Ionicons
              name="layers-outline"
              size={16}
              color={!selected ? "#FFF" : "#64748B"}
            />
          </View>
          <Text
            className="ml-3 text-sm font-medium"
            style={{ color: !selected ? "#E65100" : "#334155" }}
          >
            All Projects
          </Text>
        </TouchableOpacity>

        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item: p }) => {
            const active = selected === p.id;
            return (
              <TouchableOpacity
                onPress={() => onSelect(p.id)}
                className="flex-row items-center px-4 py-3 border-b border-slate-50"
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: active ? "#E65100" : "#F1F5F9" }}
                >
                  <Ionicons
                    name="folder-outline"
                    size={16}
                    color={active ? "#FFF" : "#64748B"}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-medium"
                    style={{ color: active ? "#E65100" : "#334155" }}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  {p.client_name ? (
                    <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                      {p.client_name}
                    </Text>
                  ) : null}
                </View>
                {active && <Ionicons name="checkmark" size={18} color="#E65100" />}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </Pressable>
    </Pressable>
  );
}
