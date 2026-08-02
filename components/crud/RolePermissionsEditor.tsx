import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiRequest } from "@/lib/api";

type Capability = {
  key: string;
  label: string;
  help?: string;
  disabled?: boolean;
  blocks?: string[];
  selected?: boolean;
};

type PermissionFeature = {
  feature: string;
  label: string;
  capabilities: Capability[];
};

type SchemaResponse = {
  status: boolean;
  data: { features: PermissionFeature[]; staff_count: number };
};

type RolePermissionsEditorProps = {
  id?: string;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

export function RolePermissionsEditor({ id, values, onChange }: RolePermissionsEditorProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const schema = useQuery({
    queryKey: ["roles", "permission-schema", id || "new"],
    queryFn: () => apiRequest(`roles_api/permissions${id ? `/${id}` : ""}`) as Promise<SchemaResponse>,
  });
  const selected = useMemo(() => parsePermissions(values.permissions), [values.permissions]);
  const features = schema.data?.data?.features || [];
  const staffCount = Number(schema.data?.data?.staff_count || 0);
  const normalizedSearch = search.trim().toLowerCase();
  const visible = features.filter((feature) => {
    if (!normalizedSearch) return true;
    return feature.label.toLowerCase().includes(normalizedSearch)
      || feature.feature.toLowerCase().includes(normalizedSearch)
      || feature.capabilities.some((capability) => capability.label.toLowerCase().includes(normalizedSearch));
  });
  const selectedCount = Object.values(selected).reduce((sum, capabilities) => sum + capabilities.length, 0);
  const selectedFeatures = Object.keys(selected).filter((feature) => selected[feature]?.length).length;

  const toggleCapability = (feature: PermissionFeature, capability: Capability) => {
    if (capability.disabled) return;
    const next = clonePermissions(selected);
    const current = new Set(next[feature.feature] || []);
    if (current.has(capability.key)) {
      current.delete(capability.key);
    } else {
      current.add(capability.key);
      if (capability.key === "view") current.delete("view_own");
      if (capability.key === "view_own") current.delete("view");
      (capability.blocks || []).forEach((blocked) => current.delete(blocked));
      feature.capabilities.forEach((candidate) => {
        if ((candidate.blocks || []).includes(capability.key)) current.delete(candidate.key);
      });
    }
    if (current.size) next[feature.feature] = Array.from(current);
    else delete next[feature.feature];
    onChange("permissions", JSON.stringify(next));
  };

  return (
    <View className="mb-3">
      <View className="px-2 mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs text-muted uppercase tracking-wide">Permission Matrix</Text>
        <Text className="text-xs text-violet-700 font-semibold">
          {selectedCount} grants · {selectedFeatures} features
        </Text>
      </View>
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <View className="px-4 py-3 border-b border-gray-100">
          <View className="h-11 rounded-xl bg-gray-50 px-3 flex-row items-center">
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search features or capabilities"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 ml-2 text-foreground"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
          <View className="flex-row items-start mt-2">
            <Ionicons name="information-circle-outline" size={16} color="#7C3AED" />
            <Text className="flex-1 text-xs text-muted leading-4 ml-1.5">
              View and View Own are mutually exclusive. Conflicting capabilities are removed automatically.
            </Text>
          </View>
        </View>

        {schema.isLoading ? (
          <View className="py-8 items-center"><ActivityIndicator color="#7C3AED" /></View>
        ) : schema.isError ? (
          <View className="px-4 py-5 flex-row items-start bg-red-50">
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text className="flex-1 text-red-700 text-xs ml-2">
              {(schema.error as Error)?.message || "Could not load permissions."}
            </Text>
          </View>
        ) : visible.length === 0 ? (
          <View className="py-8 items-center px-4">
            <Text className="text-muted text-sm">No matching permissions</Text>
          </View>
        ) : (
          visible.map((feature, index) => {
            const isExpanded = expanded.has(feature.feature) || normalizedSearch !== "";
            const featureSelected = selected[feature.feature] || [];
            return (
              <View key={feature.feature} className={index > 0 ? "border-t border-gray-100" : ""}>
                <TouchableOpacity
                  onPress={() => setExpanded((current) => toggleSet(current, feature.feature))}
                  activeOpacity={0.7}
                  className="px-4 py-3 flex-row items-center"
                >
                  <View className={`w-8 h-8 rounded-lg items-center justify-center ${featureSelected.length ? "bg-violet-100" : "bg-gray-100"}`}>
                    <Text className={`text-xs font-bold ${featureSelected.length ? "text-violet-700" : "text-muted"}`}>
                      {featureSelected.length}
                    </Text>
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-foreground font-semibold" numberOfLines={1}>{feature.label}</Text>
                    <Text className="text-muted text-[11px] mt-0.5" numberOfLines={1}>
                      {featureSelected.length} of {feature.capabilities.filter((item) => !item.disabled).length} granted · {feature.feature}
                    </Text>
                  </View>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
                </TouchableOpacity>

                {isExpanded ? (
                  <View className="px-4 pb-3 flex-row flex-wrap">
                    {feature.capabilities.map((capability) => {
                      const active = featureSelected.includes(capability.key);
                      return (
                        <TouchableOpacity
                          key={capability.key}
                          onPress={() => toggleCapability(feature, capability)}
                          disabled={capability.disabled}
                          activeOpacity={0.75}
                          className={`rounded-full px-3 py-1.5 mr-2 mb-2 border ${
                            capability.disabled
                              ? "bg-gray-50 border-gray-100 opacity-50"
                              : active
                                ? "bg-violet-700 border-violet-700"
                                : "bg-white border-gray-200"
                          }`}
                        >
                          <Text className={`text-xs font-medium ${active ? "text-white" : "text-foreground"}`}>
                            {capability.label}{capability.disabled ? " · N/A" : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        {id && staffCount > 0 ? (
          <View className="px-4 py-3 border-t border-amber-100 bg-amber-50">
            <View className="flex-row items-start">
              <Ionicons name="warning-outline" size={18} color="#D97706" />
              <View className="flex-1 ml-2">
                <Text className="text-amber-900 text-xs font-semibold">{staffCount} assigned staff member(s)</Text>
                <Text className="text-amber-800 text-xs leading-4 mt-0.5">
                  Optionally replace their individual permissions with this role matrix when saving.
                </Text>
                <TouchableOpacity
                  onPress={() => onChange(
                    "update_staff_permissions",
                    isTruthy(values.update_staff_permissions) ? "" : "on",
                  )}
                  className={`self-start rounded-full px-3 py-1.5 mt-2 ${isTruthy(values.update_staff_permissions) ? "bg-amber-600" : "bg-white border border-amber-300"}`}
                >
                  <Text className={`text-xs font-semibold ${isTruthy(values.update_staff_permissions) ? "text-white" : "text-amber-900"}`}>
                    {isTruthy(values.update_staff_permissions) ? "Update assigned staff: Yes" : "Update assigned staff: No"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function parsePermissions(value: string): Record<string, string[]> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string[]> = {};
    Object.entries(parsed).forEach(([feature, capabilities]) => {
      if (Array.isArray(capabilities)) out[feature] = capabilities.map(String);
    });
    return out;
  } catch {
    return {};
  }
}

function clonePermissions(value: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(value).map(([feature, capabilities]) => [feature, [...capabilities]]));
}

function toggleSet(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function isTruthy(value: string | undefined): boolean {
  return ["1", "on", "true", "yes"].includes(String(value || "").toLowerCase());
}
