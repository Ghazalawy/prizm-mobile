import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { listVisibleModules, moduleGroups } from "@/lib/module-registry";

export function ModuleHubScreen() {
  const [search, setSearch] = useState("");
  const groups = moduleGroups();
  const modules = listVisibleModules();

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return modules;
    return modules.filter((module) =>
      [module.title, module.plural, module.group, module.endpoint]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [modules, search]);

  return (
    <ScrollView className="flex-1 bg-surface" keyboardShouldPersistTaps="handled">
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-3xl font-bold text-foreground">ERP</Text>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2 mt-3">
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search modules"
            placeholderTextColor="#94A3B8"
            className="flex-1 ml-2 text-foreground"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View className="p-3">
        {groups.map((group) => {
          const groupModules = filtered.filter((module) => module.group === group);
          if (groupModules.length === 0) return null;
          return (
            <View key={group} className="mb-5">
              <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-2">
                {group}
              </Text>
              <View className="flex-row flex-wrap">
                {groupModules.map((module) => (
                  <TouchableOpacity
                    key={module.key}
                    onPress={() => router.push(`/(tabs)/erp/${module.key}` as any)}
                    activeOpacity={0.72}
                    className="bg-white rounded-xl p-3 shadow-sm mb-2 mr-2 w-[47%]"
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mb-3"
                      style={{ backgroundColor: `${module.color}1A` }}
                    >
                      <Ionicons name={module.icon as any} size={22} color={module.color} />
                    </View>
                    <Text className="text-foreground font-semibold" numberOfLines={2}>
                      {module.plural}
                    </Text>
                    <Text className="text-xs text-muted mt-1" numberOfLines={1}>
                      {module.group}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
