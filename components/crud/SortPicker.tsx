import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useMemo } from "react";
import type { ModuleDefinition } from "@/lib/module-registry";

export type SortState = {
  field: string;
  direction: "asc" | "desc";
};

type SortPickerProps = {
  module: ModuleDefinition;
  visible: boolean;
  onClose: () => void;
  sort: SortState | undefined;
  onSort: (sort: SortState | undefined) => void;
};

export const SortPicker = memo(function SortPicker({
  module,
  visible,
  onClose,
  sort,
  onSort,
}: SortPickerProps) {
  const sortableFields = useMemo(() => {
    const keys = module.sortableFields?.length
      ? module.sortableFields
      : module.defaultSort
        ? [module.defaultSort.field]
        : [];

    return [...new Set(keys)].map((key) => {
      const field = module.fields.find((candidate) => candidate.key === key);
      return { key, label: field?.label || humanize(key) };
    });
  }, [module]);

  const handleSelect = useCallback(
    (fieldKey: string) => {
      if (sort?.field === fieldKey) {
        if (sort.direction === "asc") {
          onSort({ field: fieldKey, direction: "desc" });
        } else {
          onSort(undefined);
        }
      } else {
        onSort({ field: fieldKey, direction: "asc" });
      }
      onClose();
    },
    [sort, onSort, onClose],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="flex-1" />
      </TouchableOpacity>
      <View className="bg-white rounded-t-3xl max-h-[60%] pb-8">
        <View className="px-4 pt-4 pb-3 flex-row items-center border-b border-gray-100">
          <Text className="text-lg font-semibold flex-1">Sort by</Text>
          {sort ? (
            <TouchableOpacity
              onPress={() => {
                onSort(undefined);
                onClose();
              }}
              hitSlop={8}
            >
              <Text className="text-primary font-medium text-sm">Reset</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={{ padding: 8 }}>
          {sortableFields.map(({ key, label }) => {
            const active = sort?.field === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleSelect(key)}
                className={`flex-row items-center px-4 py-3.5 rounded-xl mb-1 ${active ? "bg-primary/5" : ""}`}
                activeOpacity={0.6}
              >
                <Text className={`flex-1 ${active ? "text-primary font-semibold" : "text-foreground"}`}>
                  {label}
                </Text>
                {active ? (
                  <Ionicons
                    name={sort!.direction === "asc" ? "arrow-up" : "arrow-down"}
                    size={18}
                    color="#0284C7"
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
});

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
