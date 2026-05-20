import { View, Text } from "react-native";
import { router } from "expo-router";
import { EntityList } from "@/components/EntityList";
import { ComingSoonBanner } from "@/components/ComingSoonBanner";
import { getTasks } from "@/lib/api";

const STATUS = { 1: "Not Started", 2: "Awaiting Feedback", 3: "Testing", 4: "In Progress", 5: "Complete" } as Record<number, string>;
const PRIORITY = { 1: "Low", 2: "Medium", 3: "High", 4: "Urgent" } as Record<number, string>;
const PRIORITY_COLOR = { 1: "#64748B", 2: "#0284C7", 3: "#F59E0B", 4: "#EF4444" } as Record<number, string>;

type Task = {
  id: string | number;
  name: string;
  duedate?: string | null;
  priority?: string | number;
  status?: string | number;
};

export default function TasksScreen() {
  return (
    <View className="flex-1">
      <ComingSoonBanner moduleName="Tasks" />
    <EntityList<Task>
      title="Tasks"
      icon="checkbox-outline"
      queryKey={["tasks"]}
      fetcher={(p) => getTasks(p)}
      keyExtractor={(t) => String(t.id)}
      searchPlaceholder="Search tasks…"
      emptyMessage="No tasks found"
      onItemPress={(t) => router.push(`/(tabs)/tasks/${t.id}` as any)}
      renderItem={(t) => (
        <View className="bg-white rounded-xl p-3 shadow-sm">
          <View className="flex-row items-start">
            <View
              className="w-1 self-stretch rounded-full mr-3"
              style={{ backgroundColor: PRIORITY_COLOR[Number(t.priority)] ?? "#E2E8F0" }}
            />
            <View className="flex-1">
              <Text className="text-foreground font-semibold" numberOfLines={2}>
                {t.name}
              </Text>
              <View className="flex-row items-center mt-1.5 flex-wrap">
                <Text className="text-xs text-muted mr-3">
                  {STATUS[Number(t.status)] ?? `Status ${t.status ?? "—"}`}
                </Text>
                {t.priority ? (
                  <Text className="text-xs text-muted mr-3">
                    {PRIORITY[Number(t.priority)] ?? `P${t.priority}`}
                  </Text>
                ) : null}
                {t.duedate && t.duedate !== "0000-00-00" ? (
                  <Text className="text-xs text-muted">Due {t.duedate}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      )}
    />
    </View>
  );
}
