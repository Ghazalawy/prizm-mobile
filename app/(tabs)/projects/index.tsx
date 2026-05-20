import { View, Text } from "react-native";
import { router } from "expo-router";
import { EntityList } from "@/components/EntityList";
import { ComingSoonBanner } from "@/components/ComingSoonBanner";
import { getProjects } from "@/lib/api";

const STATUS = { 1: "Not Started", 2: "In Progress", 3: "On Hold", 4: "Cancelled", 5: "Finished" } as Record<number, string>;
const STATUS_COLOR = { 1: "#64748B", 2: "#0284C7", 3: "#F59E0B", 4: "#EF4444", 5: "#16A34A" } as Record<number, string>;

type Project = {
  id: string | number;
  name: string;
  status?: string | number;
  start_date?: string | null;
  deadline?: string | null;
  progress?: string | number;
};

export default function ProjectsScreen() {
  return (
    <View className="flex-1">
      <ComingSoonBanner moduleName="Projects" />
    <EntityList<Project>
      title="Projects"
      icon="folder-outline"
      queryKey={["projects"]}
      fetcher={(p) => getProjects(p)}
      keyExtractor={(p) => String(p.id)}
      searchPlaceholder="Search projects…"
      emptyMessage="No projects found"
      onItemPress={(p) => router.push(`/(tabs)/projects/${p.id}`)}
      renderItem={(p) => (
        <View className="bg-white rounded-xl p-3 shadow-sm">
          <View className="flex-row items-center">
            <View
              className="w-2.5 h-2.5 rounded-full mr-3"
              style={{ backgroundColor: STATUS_COLOR[Number(p.status)] ?? "#E2E8F0" }}
            />
            <View className="flex-1">
              <Text className="text-foreground font-semibold" numberOfLines={2}>
                {p.name}
              </Text>
              <View className="flex-row items-center mt-1 flex-wrap">
                <Text className="text-xs text-muted mr-3">
                  {STATUS[Number(p.status)] ?? `Status ${p.status ?? "—"}`}
                </Text>
                {p.progress !== undefined ? (
                  <Text className="text-xs text-muted mr-3">{p.progress}% done</Text>
                ) : null}
                {p.deadline && p.deadline !== "0000-00-00" ? (
                  <Text className="text-xs text-muted">Due {p.deadline}</Text>
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
