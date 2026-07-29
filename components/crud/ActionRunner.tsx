import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { apiRequest } from "@/lib/api";
import {
  ModuleAction,
  ModuleDefinition,
  resolveTemplateValue,
} from "@/lib/module-registry";
import { FieldInput } from "./FieldInput";

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
  const [preflight, setPreflight] = useState<any>(null);
  const [actionResult, setActionResult] = useState<{ action: ModuleAction; data: any } | null>(null);
  const queryClient = useQueryClient();

  const runMutation = useMutation({
    mutationFn: async (action: ModuleAction) => {
      const body: Record<string, any> = { ...(action.body || {}) };
      // Spread inline form values (e.g. {tender_status: "Awarded"})
      if (action.fields) {
        for (const f of action.fields) {
          const value = values[f.key] ?? "";
          body[f.key] = f.submitAsArray
            ? value.split(",").map((part) => part.trim()).filter(Boolean)
            : value;
        }
      }
      if (action.preflightEndpointTemplate) {
        const tokenField = action.preflightTokenField || "confirm_token";
        const token = preflight?.[tokenField];
        if (!token) throw new Error("Preflight confirmation token is missing. Review the send again.");
        body[tokenField] = token;
      }
      // Resolve any {id} placeholders in body values
      for (const k of Object.keys(body)) {
        if (typeof body[k] === "string") {
          body[k] = resolveTemplateValue(body[k] as string, {}, recordId);
        }
      }
      const url = (action.endpointTemplate || "").replace(/\{([^}]+)\}/g, (_match, key: string) => {
        if (key === "id") return encodeURIComponent(recordId);
        return encodeURIComponent(String(body[key] ?? ""));
      });
      if (!url) throw new Error("Action endpoint is not configured");
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
      // Workflow actions can change parent summaries and related tabs (for
      // example an inventory check-in changes both the checkout row and its
      // parent item's available stock), so refresh active CRUD views together.
      await queryClient.invalidateQueries({ queryKey: ["crud"] });
      setActiveAction(null);
      setValues({});
      setPreflight(null);
      onClose();
      if (action.resultFields?.length) {
        setActionResult({ action, data: _data?.data ?? _data });
      }
    },
    onError: (err: any, action) => {
      Toast.show({
        type: "error",
        text1: `${action.title} failed`,
        text2: err?.message || "Unknown error",
      });
    },
  });

  const preflightMutation = useMutation({
    mutationFn: async (action: ModuleAction) => {
      const url = (action.preflightEndpointTemplate || "").replace(
        /\{id\}/g,
        encodeURIComponent(recordId),
      );
      if (!url) throw new Error("Preflight endpoint is not configured");
      const response = await apiRequest(url);
      return { action, data: response?.data ?? response };
    },
    onSuccess: ({ action, data }) => {
      setPreflight(data);
      setActiveAction(action);
    },
    onError: (err: any, action) => {
      Toast.show({
        type: "error",
        text1: `${action.title} preflight failed`,
        text2: err?.message || "Unknown error",
      });
    },
  });

  const sheetActions = useMemo(() => actions, [actions]);

  const missingRequired = useMemo(() => {
    const missingField = activeAction?.fields?.some(
      (field) => field.required && !(values[field.key] ?? "").trim(),
    ) ?? false;
    const blockedByPreflight = Boolean(
      activeAction?.preflightEndpointTemplate && preflight?.can_send === false,
    );
    return missingField || blockedByPreflight;
  }, [activeAction, preflight, values]);

  const handleSelect = (action: ModuleAction) => {
    const defaults: Record<string, string> = {};
    action.fields?.forEach((field) => {
      defaults[field.key] = String(resolveTemplateValue(String(field.defaultValue ?? ""), {}, recordId));
    });
    setValues(defaults);
    setPreflight(null);
    if (action.preflightEndpointTemplate) {
      preflightMutation.mutate(action);
      return;
    }
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

  const executeActiveAction = () => {
    if (!activeAction) return;
    if (activeAction.navigateTemplate) {
      const route = activeAction.navigateTemplate.replace(/\{([^}]+)\}/g, (_match, key: string) => {
        if (key === "id") return encodeURIComponent(recordId);
        return encodeURIComponent(values[key] ?? "");
      });
      setActiveAction(null);
      setValues({});
      setPreflight(null);
      onClose();
      router.push(route as any);
      return;
    }
    runMutation.mutate(activeAction);
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
              {preflightMutation.isPending ? (
                <View className="px-5 py-6 items-center border-t border-gray-100">
                  <ActivityIndicator color={module.color} />
                  <Text className="text-muted mt-2">Checking exact recipients…</Text>
                </View>
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
                {activeAction.preflightEndpointTemplate && preflight ? (
                  <PreflightSummary data={preflight} />
                ) : null}
                {activeAction.fields?.map((field) => (
                  <View key={field.key} className="mt-3">
                    <Text className="text-xs text-muted mb-1">
                      {field.label}
                      {field.required ? " *" : ""}
                    </Text>
                    <FieldInput
                      field={field}
                      value={values[field.key] ?? ""}
                      onChange={(v) => setValues((cur) => ({ ...cur, [field.key]: v }))}
                    />
                  </View>
                ))}
                <View className="flex-row mt-5">
                  <TouchableOpacity
                    onPress={() => {
                      setActiveAction(null);
                      setValues({});
                      setPreflight(null);
                    }}
                    className="flex-1 rounded-xl py-3 items-center bg-gray-100 mr-2"
                  >
                    <Text className="text-foreground font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={executeActiveAction}
                    disabled={runMutation.isPending || missingRequired}
                    className={`flex-1 rounded-xl py-3 items-center ${
                      activeAction.destructive ? "bg-red-600" : "bg-primary"
                    }`}
                    style={{ opacity: missingRequired ? 0.5 : 1 }}
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

      <Modal visible={!!actionResult} animationType="fade" transparent onRequestClose={() => setActionResult(null)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm p-5">
            <Text className="text-lg font-semibold text-foreground">
              {actionResult?.action.title}
            </Text>
            {actionResult?.action.resultFields?.map((field) => (
              <View key={field.key} className="mt-4">
                <Text className="text-xs text-muted">{field.label}</Text>
                <Text className="text-foreground text-base mt-1" selectable>
                  {String(actionResult.data?.[field.key] ?? "—")}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setActionResult(null)}
              className="mt-5 rounded-xl py-3 items-center bg-primary"
            >
              <Text className="text-white font-semibold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function PreflightSummary({ data }: { data: any }) {
  const recipients = Array.isArray(data?.valid_recipients) ? data.valid_recipients : [];
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const skipped = Array.isArray(data?.skipped) ? data.skipped : [];
  return (
    <ScrollView className="max-h-72 mt-2" nestedScrollEnabled>
      <View className="bg-slate-50 rounded-xl p-3">
        <Text className="text-xs text-muted">From</Text>
        <Text className="text-foreground font-medium" selectable>{data?.sender_email || "Not configured"}</Text>
        <Text className="text-xs text-muted mt-3">Items / recipients</Text>
        <Text className="text-foreground font-medium">
          {Number(data?.item_count || 0)} items · {recipients.length} recipients
          {Number(data?.held_count || 0) > 0 ? ` · ${data.held_count} held for next batch` : ""}
        </Text>
        {recipients.map((recipient: any) => (
          <View key={String(recipient.id ?? recipient.email)} className="mt-3 border-t border-slate-200 pt-2">
            <Text className="text-foreground font-medium">{recipient.company || recipient.contact || "Supplier"}</Text>
            <Text className="text-xs text-muted" selectable>{recipient.email}</Text>
            {Array.isArray(recipient.cc_emails) && recipient.cc_emails.length ? (
              <Text className="text-xs text-muted" selectable>CC: {recipient.cc_emails.join(", ")}</Text>
            ) : null}
          </View>
        ))}
        {skipped.length ? (
          <View className="mt-3 bg-amber-50 rounded-lg p-2">
            <Text className="text-amber-800 font-medium">Skipped</Text>
            {skipped.map((message: any, index: number) => (
              <Text key={`${index}-${String(message)}`} className="text-xs text-amber-800 mt-1">• {String(message)}</Text>
            ))}
          </View>
        ) : null}
        {errors.length ? (
          <View className="mt-3 bg-red-50 rounded-lg p-2">
            <Text className="text-red-700 font-medium">Cannot send</Text>
            {errors.map((message: any, index: number) => (
              <Text key={`${index}-${String(message)}`} className="text-xs text-red-700 mt-1">• {String(message)}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
