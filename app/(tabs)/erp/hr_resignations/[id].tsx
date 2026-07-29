import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { apiRequest } from "@/lib/api";

type ChecklistItem = {
  id: number;
  rel_name?: string;
  option_name?: string;
  status: number | string;
  people_handle_id?: number;
};

type OffboardingRecord = {
  id: number;
  staffid: number;
  staff_name?: string;
  department_name?: string;
  role_name?: string;
  email?: string;
  dateoff?: string;
  approval?: string | null;
  checklist?: ChecklistItem[];
  checklist_complete?: boolean;
  _actions?: { approve?: boolean; delete?: boolean };
};

export default function OffboardingDetailScreen() {
  const rawId = useLocalSearchParams<{ id?: string | string[] }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ["hr-resignation", id],
    queryFn: () => apiRequest(`hr_profile_api/resignations/${encodeURIComponent(id || "")}`),
    enabled: Boolean(id),
  });

  const record = (query.data?.data || query.data) as OffboardingRecord | undefined;
  const checklist = record?.checklist || [];
  const groups = useMemo(() => {
    const grouped = new Map<string, ChecklistItem[]>();
    checklist.forEach((item) => {
      const name = item.rel_name?.trim() || "Checklist";
      grouped.set(name, [...(grouped.get(name) || []), item]);
    });
    return [...grouped.entries()];
  }, [checklist]);
  const done = checklist.filter((item) => Number(item.status) === 1).length;
  const progress = checklist.length === 0 ? 100 : Math.round((done * 100) / checklist.length);

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["hr-resignation", id] }),
      queryClient.invalidateQueries({ queryKey: ["crud", "hr_resignations"] }),
    ]);
  };

  const checklistMutation = useMutation({
    mutationFn: ({ itemId, completed }: { itemId: number; completed: boolean }) =>
      apiRequest(`hr_profile_api/resignations/${id}/checklist/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ status: completed ? 1 : 0 }),
      }),
    onSuccess: refreshAll,
    onError: (error: Error) => Toast.show({ type: "error", text1: "Checklist update failed", text2: error.message }),
  });

  const approveMutation = useMutation({
    mutationFn: () => apiRequest(`hr_profile_api/resignations/${id}/approve`, { method: "POST" }),
    onSuccess: async () => {
      Toast.show({ type: "success", text1: "Offboarding completed" });
      await refreshAll();
    },
    onError: (error: Error) => Toast.show({ type: "error", text1: "Could not complete offboarding", text2: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`hr_profile_api/resignations/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crud", "hr_resignations"] });
      router.back();
    },
    onError: (error: Error) => Toast.show({ type: "error", text1: "Could not delete offboarding record", text2: error.message }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-3 text-lg font-semibold text-foreground flex-1" numberOfLines={1}>
          Offboarding
        </Text>
        {record?._actions?.delete ? (
          <TouchableOpacity
            onPress={() => Alert.alert("Delete offboarding record?", "This removes its generated checklist too.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
            ])}
            disabled={deleteMutation.isPending}
            className="w-9 h-9 rounded-lg items-center justify-center bg-red-50"
          >
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        ) : null}
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#B45309" /></View>
      ) : query.isError || !record ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load this offboarding record</Text>
          <Text className="text-muted text-sm text-center mt-1">{(query.error as Error)?.message || "Record not found"}</Text>
          <TouchableOpacity onPress={() => query.refetch()} className="bg-primary rounded-xl px-5 py-3 mt-4">
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 12, paddingBottom: 36 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B45309" />}
        >
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-2xl bg-amber-50 items-center justify-center">
                <Ionicons name="exit-outline" size={24} color="#B45309" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-xl font-bold text-foreground">{record.staff_name || `Employee ${record.staffid}`}</Text>
                <Text className="text-muted mt-1">{[record.role_name, record.department_name].filter(Boolean).join(" · ") || "Employee offboarding"}</Text>
              </View>
              <View className={`rounded-full px-3 py-1 ${record.approval === "approved" ? "bg-green-100" : "bg-amber-100"}`}>
                <Text className={`text-xs font-semibold ${record.approval === "approved" ? "text-green-700" : "text-amber-700"}`}>
                  {record.approval === "approved" ? "Approved" : "Pending"}
                </Text>
              </View>
            </View>
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Info label="Email" value={record.email} />
              <Info label="Last working day" value={formatDate(record.dateoff)} />
            </View>
          </View>

          <View className="bg-white rounded-2xl p-5 shadow-sm mt-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-foreground">Checklist progress</Text>
              <Text className="font-bold text-amber-700">{progress}%</Text>
            </View>
            <View className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
              <View className="h-2 bg-amber-600 rounded-full" style={{ width: `${progress}%` }} />
            </View>
            <Text className="text-xs text-muted mt-2">{done} of {checklist.length} completed</Text>
          </View>

          {groups.map(([group, items]) => (
            <View key={group} className="mt-3">
              <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-1.5">{group}</Text>
              <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {items.map((item, index) => {
                  const complete = Number(item.status) === 1;
                  const busy = checklistMutation.isPending && checklistMutation.variables?.itemId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => checklistMutation.mutate({ itemId: item.id, completed: !complete })}
                      disabled={busy || record.approval === "approved"}
                      className={`flex-row items-center px-4 py-4 ${index > 0 ? "border-t border-gray-100" : ""}`}
                      activeOpacity={0.7}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#B45309" />
                      ) : (
                        <Ionicons name={complete ? "checkmark-circle" : "ellipse-outline"} size={24} color={complete ? "#16A34A" : "#94A3B8"} />
                      )}
                      <Text className={`ml-3 flex-1 ${complete ? "text-muted line-through" : "text-foreground"}`}>{item.option_name || `Checklist item ${item.id}`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {record._actions?.approve ? (
            <TouchableOpacity
              onPress={() => Alert.alert("Complete offboarding?", "This approves the process and deactivates the employee account.", [
                { text: "Cancel", style: "cancel" },
                { text: "Approve & deactivate", style: "destructive", onPress: () => approveMutation.mutate() },
              ])}
              disabled={approveMutation.isPending}
              className="bg-amber-700 rounded-2xl py-4 items-center mt-4"
            >
              {approveMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white font-semibold">Complete offboarding</Text>}
            </TouchableOpacity>
          ) : record.approval !== "approved" ? (
            <View className="bg-amber-50 rounded-2xl p-4 mt-4 flex-row items-start">
              <Ionicons name="information-circle-outline" size={20} color="#B45309" />
              <Text className="text-amber-800 text-sm ml-2 flex-1">Complete every checklist item before final approval.</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View className="flex-row py-1.5">
      <Text className="text-muted text-sm w-32">{label}</Text>
      <Text className="text-foreground text-sm flex-1" selectable>{value}</Text>
    </View>
  );
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
