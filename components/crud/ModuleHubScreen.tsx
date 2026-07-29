import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState, useCallback } from "react";
import { listVisibleModules, moduleGroups, getModulePermissionFeatures } from "@/lib/module-registry";
import { usePermissions } from "@/lib/permission-context";
import { usePinnedTabs, togglePin } from "@/lib/pinned-tabs";
import { PINNABLE_MODULES } from "@/lib/pinnable-modules";

const pinnableKeys = new Set(PINNABLE_MODULES.map((m) => m.key));

export function ModuleHubScreen() {
  const [search, setSearch] = useState("");
  const [, forceUpdate] = useState(0);
  const { isAdmin, isLoaded, isFailed, hasAnyPermission, retry } = usePermissions();
  const pinnedTabs = usePinnedTabs();

  const handleTogglePin = useCallback(async (key: string) => {
    await togglePin(key);
    forceUpdate((n) => n + 1);
  }, []);
  const groups = moduleGroups();
  const allModules = listVisibleModules();

  const modules = useMemo(() => {
    if (!isLoaded || isFailed) return [];
    if (isAdmin) return allModules;
    return allModules.filter((mod) => {
      if (mod.adminOnlyAccess) return false;
      const features = getModulePermissionFeatures(mod);
      if (features.length === 0) return true;
      return features.some((f) => hasAnyPermission(f));
    });
  }, [allModules, isLoaded, isFailed, isAdmin, hasAnyPermission]);

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

  if (!isLoaded && !isFailed) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#0284C7" />
        <Text className="text-muted mt-3">Loading your modules…</Text>
      </View>
    );
  }

  if (isFailed) {
    return (
      <View className="flex-1 bg-surface items-center justify-center px-8">
        <Ionicons name="shield-outline" size={48} color="#EF4444" />
        <Text className="text-foreground font-semibold mt-3">Permissions could not be loaded</Text>
        <Text className="text-muted text-sm text-center mt-1">Retry before opening ERP modules.</Text>
        <TouchableOpacity onPress={retry} className="mt-4 bg-primary rounded-xl px-5 py-3">
          <Text className="text-white font-semibold">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
                {groupModules.map((module) => {
                  const canPin = pinnableKeys.has(module.key);
                  const isPinned = pinnedTabs.includes(module.key);
                  return (
                    <TouchableOpacity
                      key={module.key}
                      onPress={() => router.push(`/(tabs)/erp/${module.key}` as any)}
                      activeOpacity={0.72}
                      className="bg-white rounded-xl p-3 shadow-sm mb-2 mr-2 w-[47%]"
                    >
                      <View className="flex-row items-start justify-between mb-3">
                        <View
                          className="w-10 h-10 rounded-xl items-center justify-center"
                          style={{ backgroundColor: `${module.color}1A` }}
                        >
                          <Ionicons name={module.icon as any} size={22} color={module.color} />
                        </View>
                        {canPin && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation?.();
                              handleTogglePin(module.key);
                            }}
                            hitSlop={8}
                            activeOpacity={0.6}
                          >
                            <Ionicons
                              name={isPinned ? "star" : "star-outline"}
                              size={18}
                              color={isPinned ? "#F59E0B" : "#CBD5E1"}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text className="text-foreground font-semibold" numberOfLines={2}>
                        {module.plural}
                      </Text>
                      <Text className="text-xs text-muted mt-1" numberOfLines={1}>
                        {module.group}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
