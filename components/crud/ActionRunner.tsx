import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { apiRequest } from "@/lib/api";
import {
  ModuleAction,
  ModuleDefinition,
  resolveTemplateValue,
} from "@/lib/module-registry";

type ActionRunnerProps = {
  /** The module the actions belong to (for invalidation key naming). */
  module: ModuleDefinition;
  /** The ID of the record the actions will run against. */
  recordId: string;
  /** Set of actions to expose (typically `module.actions`). */
  actions: ModuleAction[];
  /** Whether the overflow-menu sheet is open. */
  open: boolean;
  /** Closes the sheet. */
  onClose: () => void;
};

/**
 * Bottom-sheet that lists workflow actions for the current record. Tapping
 * one opens a confirmation modal (with optional inline form for actions that
 * take parameters), then fires the configured POST/PUT and toasts on success.
 * Queries scoped to this module are invalidated so the detail screen refreshes.
 *
 * Triggered from the overflow ⋮ icon in CrudDetailScreen's header.
 */
export function ActionRunner({ module, recordId, actions, open, onClose }: ActionRunnerProps) {
  const [activeAction, setActiveAction] = useState<ModuleAction | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const runMutation = useMutation({
    mutationFn: async (action: ModuleAction) => {
      const url = action.endpointTemplate.replace(/\{id\}/g, encodeURIComponent(recordId));
      const body: Record<string, any> = { ...(action.body || {}) };
      // Spread inline form values (e.g. {tender_status: "Awarded"})
      if (action.fields) {
        for (const f of action.fields) {
          body[f.key] = values[f.key] ?? "";
        }
      }
      // Resolve any {id} placeholders in body values
      for (const k of Object.keys(body)) {
        if (typeof body[k] === "string") {
          body[k] = resolveTemplateValue(body[k] as string, {}, recordId);
        }
      }
      return apiRequest(url, {
        method: action.method || "POST",
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      });
    },
    onSuccess: async (_data, action) => {
      Toast.show({
        type: "success",
        text1: action.successMessage || `${action.title} done`,
      });
      // Invalidate all queries for this module so the detail screen refreshes
      await queryClient.invalidateQueries({ queryKey: ["crud", module.key] });
      setActiveAction(null);
      setValues({});
      onClose();
    },
    onError: (err: any, action) => {
      Toast.show({
        type: "error",
        text1: `${action.title} failed`,
        text2: err?.message || "Unknown error",
      });
    },
  });

  const sheetActions = useMemo(() => actions, [actions]);

  const handleSelect = (action: ModuleAction) => {
    setValues({});
    if (action.fields && action.fields.length > 0) {
      // Action needs input — open the parameter form first
      setActiveAction(action);
      return;
    }
    if (action.requiresConfirm === false) {
      runMutation.mutate(action);
      return;
    }
    // Plain confirm action — open the confirm dialog (still re-using the modal
    // so the UX stays consistent)
    setActiveAction(action);
  };

  return (
    <>
      {/* Bottom sheet listing the actions */}
      <Modal visible={open && !activeAction} animationType="slide" transparent onRequestClose={onClose}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl pb-4 max-h-[80%]">
            <View className="items-center pt-2 pb-1">
              <View className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </View>
            <View className="px-5 pt-2 pb-3 flex-row items-center">
              <Text className="flex-1 text-lg font-semibold text-foreground">Actions</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {sheetActions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  onPress={() => handleSelect(action)}
                  className="flex-row items-center px-5 py-4 border-t border-gray-100"
                  activeOpacity={0.6}
                >
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: action.destructive ? "#FEE2E2" : `${module.color}1A` }}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={20}
                      color={action.destructive ? "#DC2626" : module.color}
                    />
                  </View>
                  <Text
                    className={`flex-1 font-medium ${action.destructive ? "text-red-600" : "text-foreground"}`}
                  >
                    {action.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ))}
              {sheetActions.length === 0 ? (
                <Text className="px-5 py-6 text-muted text-center">
                  No actions available for this record.
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation / parameter form modal */}
      <Modal visible={!!activeAction} animationType="fade" transparent onRequestClose={() => setActiveAction(null)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm p-5">
            {activeAction ? (
              <>
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: activeAction.destructive ? "#FEE2E2" : `${module.color}1A` }}
                  >
                    <Ionicons
                      name={activeAction.icon as any}
                      size={20}
                      color={activeAction.destructive ? "#DC2626" : module.color}
                    />
                  </View>
                  <Text className="text-lg font-semibold text-foreground flex-1">
                    {activeAction.title}
                  </Text>
                </View>
                {activeAction.confirm ? (
                  <Text className="text-muted mb-3">{activeAction.confirm}</Text>
                ) : null}
                {activeAction.fields?.map((field) => (
                  <View key={field.key} className="mt-3">
                    <Text className="text-xs text-muted mb-1">
                      {field.label}
                      {field.required ? " *" : ""}
                    </Text>
                    <TextInput
                      value={values[field.key] ?? ""}
                      onChangeText={(v) => setValues((cur) => ({ ...cur, [field.key]: v }))}
                      placeholder={field.placeholder || field.label}
                      placeholderTextColor="#94A3B8"
                      keyboardType={field.type === "number" ? "numeric" : "default"}
                      className="bg-gray-50 rounded-xl px-3 h-11 text-foreground"
                    />
                  </View>
                ))}
                <View className="flex-row mt-5">
                  <TouchableOpacity
                    onPress={() => {
                      setActiveAction(null);
                      setValues({});
                    }}
                    className="flex-1 rounded-xl py-3 items-center bg-gray-100 mr-2"
                  >
                    <Text className="text-foreground font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => runMutation.mutate(activeAction)}
                    disabled={runMutation.isPending}
                    className={`flex-1 rounded-xl py-3 items-center ${
                      activeAction.destructive ? "bg-red-600" : "bg-primary"
                    }`}
                  >
                    {runMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-semibold">
                        {activeAction.destructive ? "Confirm" : "Run"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
