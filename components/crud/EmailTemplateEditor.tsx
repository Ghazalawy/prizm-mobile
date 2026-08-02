import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactNode } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";

type TemplateVariant = {
  emailtemplateid: number;
  language: string;
  subject: string;
  message: string;
  translated?: boolean;
};

type MergeField = {
  group: string;
  label: string;
  token: string;
};

type Props = {
  row?: Record<string, any> | null;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

type Selection = { start: number; end: number };

const ACCENT = "#4F46E5";

export function EmailTemplateEditor({ row, values, onChange }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const variants = useMemo(() => parseVariants(values.variants, row?.variants), [row?.variants, values.variants]);
  const mergeFields = useMemo(() => parseMergeFields(row?.merge_fields), [row?.merge_fields]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [selection, setSelection] = useState<Record<number, Selection>>({});

  const activeVariant = variants.find((variant) => variant.emailtemplateid === selectedId) ?? variants[0];
  const isEnabled = truthy(values.active);
  const isPlainText = truthy(values.plaintext);
  const isTwoFactor = String(row?.slug || "") === "two-factor-authentication";
  const filteredMergeFields = mergeFields.filter((field) => {
    const needle = mergeSearch.trim().toLowerCase();
    return !needle || `${field.group} ${field.label} ${field.token}`.toLowerCase().includes(needle);
  });

  const updateVariant = (patch: Partial<TemplateVariant>) => {
    if (!activeVariant) return;
    const next = variants.map((variant) =>
      variant.emailtemplateid === activeVariant.emailtemplateid ? { ...variant, ...patch } : variant,
    );
    onChange("variants", JSON.stringify(next));
  };

  const insertMergeField = (token: string) => {
    if (!activeVariant) return;
    const current = activeVariant.message || "";
    const cursor = selection[activeVariant.emailtemplateid] ?? { start: current.length, end: current.length };
    const nextMessage = `${current.slice(0, cursor.start)}${token}${current.slice(cursor.end)}`;
    const nextCursor = cursor.start + token.length;
    updateVariant({ message: nextMessage, translated: stripHtml(nextMessage).length > 0 });
    setSelection((currentSelections) => ({
      ...currentSelections,
      [activeVariant.emailtemplateid]: { start: nextCursor, end: nextCursor },
    }));
  };

  return (
    <View className="mb-3">
      <View className="rounded-3xl overflow-hidden bg-slate-950 mb-3">
        <View className="p-4">
          <View className="flex-row items-start">
            <View className="w-11 h-11 rounded-2xl bg-indigo-500/20 items-center justify-center mr-3">
              <Ionicons name="mail-unread-outline" size={22} color="#A5B4FC" />
            </View>
            <View className="flex-1">
              <Text
                className="text-[10px] font-bold uppercase tracking-[1.4px]"
                style={{ color: "#A5B4FC" }}
              >
                Email Template · {String(row?.type_label || row?.type || "System")}
              </Text>
              <Text className="text-white text-lg font-bold mt-0.5" numberOfLines={2}>
                {String(row?.name || "Template")}
              </Text>
              <Text className="text-slate-400 text-xs mt-1" numberOfLines={1}>
                {String(row?.slug || "")}
              </Text>
            </View>
            <View className={`px-2.5 py-1 rounded-full ${isEnabled ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
              <Text
                className="text-[10px] font-bold"
                style={{ color: isEnabled ? "#6EE7B7" : "#FCA5A5" }}
              >
                {isEnabled ? "ENABLED" : "DISABLED"}
              </Text>
            </View>
          </View>

          <View className="flex-row mt-4 gap-2">
            <Metric icon="language-outline" value={String(variants.length)} label="Languages" />
            <Metric icon="git-merge-outline" value={String(mergeFields.length)} label="Merge fields" />
            <Metric icon="document-text-outline" value={isPlainText ? "TEXT" : "HTML"} label="Format" />
          </View>
        </View>
      </View>

      <SectionTitle title="Delivery" hint="Shared across every language" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <View className={`${compact ? "" : "flex-row"}`}>
          <FieldShell label="Sender name" style={compact ? undefined : { flex: 4 }}>
            <TextInput
              value={values.fromname || ""}
              onChangeText={(value) => onChange("fromname", value)}
              placeholder="Company or team name"
              placeholderTextColor="#94A3B8"
              className="text-[15px] text-slate-900 py-1"
            />
          </FieldShell>
          <FieldShell
            label="Sender email override"
            className={compact ? "border-t border-slate-100" : "border-l border-slate-100"}
            style={compact ? undefined : { flex: 6 }}
          >
            <TextInput
              value={values.fromemail || ""}
              onChangeText={(value) => onChange("fromemail", value)}
              placeholder="SMTP default when blank"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              className="text-[15px] text-slate-900 py-1"
            />
          </FieldShell>
        </View>
        <View className="border-t border-slate-100 flex-row p-2 gap-2">
          <ToggleCard
            icon="power-outline"
            label="Email delivery"
            value={isEnabled}
            disabled={isTwoFactor}
            onPress={() => onChange("active", isEnabled ? "" : "on")}
          />
          <ToggleCard
            icon="document-text-outline"
            label="Plain text"
            value={isPlainText}
            onPress={() => onChange("plaintext", isPlainText ? "" : "on")}
          />
        </View>
        {isTwoFactor ? (
          <View className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex-row items-start">
            <Ionicons name="shield-checkmark-outline" size={16} color="#B45309" />
            <Text className="text-amber-800 text-xs ml-2 flex-1">Two-factor authentication delivery cannot be disabled.</Text>
          </View>
        ) : null}
      </View>

      <SectionTitle title="Language content" hint="One save updates all variants" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 10 }}>
          {variants.map((variant) => {
            const selected = variant.emailtemplateid === activeVariant?.emailtemplateid;
            const translated = stripHtml(variant.message).length > 0;
            return (
              <TouchableOpacity
                key={variant.emailtemplateid}
                onPress={() => setSelectedId(variant.emailtemplateid)}
                className={`mr-2 rounded-xl px-3 py-2 border ${selected ? "bg-indigo-50 border-indigo-300" : "bg-slate-50 border-slate-200"}`}
              >
                <View className="flex-row items-center">
                  <View className={`w-2 h-2 rounded-full mr-2 ${translated ? "bg-emerald-500" : "bg-amber-400"}`} />
                  <Text className={`text-xs font-semibold capitalize ${selected ? "text-indigo-700" : "text-slate-700"}`}>
                    {variant.language}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeVariant ? (
          <>
            <View className="px-4 py-3 border-t border-slate-100">
              <Text className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Subject · {activeVariant.language}</Text>
              <TextInput
                value={activeVariant.subject}
                onChangeText={(subject) => updateVariant({ subject })}
                placeholder="Email subject"
                placeholderTextColor="#94A3B8"
                className="text-[15px] font-medium text-slate-900 py-1"
              />
            </View>
            <View className="px-4 py-3 border-t border-slate-100">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[10px] uppercase tracking-wide text-slate-500">Message · {activeVariant.language}</Text>
                <Text className="text-[10px] text-slate-400">{activeVariant.message.length.toLocaleString()} chars</Text>
              </View>
              <TextInput
                value={activeVariant.message}
                onChangeText={(message) => updateVariant({ message, translated: stripHtml(message).length > 0 })}
                onSelectionChange={(event) => {
                  const next = event.nativeEvent.selection;
                  setSelection((current) => ({ ...current, [activeVariant.emailtemplateid]: next }));
                }}
                selection={selection[activeVariant.emailtemplateid]}
                multiline
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={isPlainText ? "Write the email message…" : "Write HTML or plain text…"}
                placeholderTextColor="#94A3B8"
                className="min-h-[220px] rounded-xl bg-slate-50 border border-slate-200 px-3 py-3 text-[13px] leading-5 text-slate-800"
                style={{ fontFamily: isPlainText ? undefined : "monospace" }}
              />
            </View>
          </>
        ) : (
          <View className="px-4 py-8 items-center">
            <Text className="text-slate-500">No language variants are available.</Text>
          </View>
        )}
      </View>

      <SectionTitle title="Merge fields" hint="Tap a token to insert it at the cursor" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <TouchableOpacity
          onPress={() => setMergeOpen((open) => !open)}
          className="px-4 py-3 flex-row items-center"
        >
          <View className="w-8 h-8 rounded-xl bg-indigo-50 items-center justify-center mr-3">
            <Ionicons name="git-merge-outline" size={17} color={ACCENT} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-slate-900">Available for this template</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{mergeFields.length} safe tokens from Perfex</Text>
          </View>
          <Ionicons name={mergeOpen ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
        </TouchableOpacity>
        {mergeOpen ? (
          <View className="border-t border-slate-100 px-3 pb-3">
            <View className="mt-3 px-3 h-10 rounded-xl bg-slate-50 border border-slate-200 flex-row items-center">
              <Ionicons name="search-outline" size={17} color="#64748B" />
              <TextInput
                value={mergeSearch}
                onChangeText={setMergeSearch}
                placeholder="Search name, group, or token"
                placeholderTextColor="#94A3B8"
                className="flex-1 ml-2 text-sm text-slate-900"
              />
            </View>
            <View className="flex-row flex-wrap mt-2">
              {filteredMergeFields.map((field) => (
                <TouchableOpacity
                  key={field.token}
                  onPress={() => insertMergeField(field.token)}
                  className="mr-2 mt-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2"
                >
                  <Text className="text-[10px] text-indigo-500">{field.group}</Text>
                  <Text className="text-xs font-semibold text-indigo-800 mt-0.5">{field.token}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {filteredMergeFields.length === 0 ? (
              <Text className="text-sm text-slate-500 text-center py-5">No matching merge fields.</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Metric({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={13} color="#A5B4FC" />
        <Text className="text-white text-xs font-bold ml-1.5" numberOfLines={1}>{value}</Text>
      </View>
      <Text className="text-slate-500 text-[9px] mt-1" numberOfLines={1}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <View className="px-2 mb-1.5 flex-row items-center justify-between">
      <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500">{title}</Text>
      <Text className="text-[10px] text-slate-400">{hint}</Text>
    </View>
  );
}

function FieldShell({ label, className = "", style, children }: {
  label: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View className={`px-4 py-3 ${className}`} style={style}>
      <Text className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{label}</Text>
      {children}
    </View>
  );
}

function ToggleCard({ icon, label, value, disabled, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 rounded-xl border px-3 py-2.5 flex-row items-center ${value ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-200"} ${disabled ? "opacity-60" : ""}`}
    >
      <Ionicons name={icon} size={17} color={value ? ACCENT : "#64748B"} />
      <Text className={`flex-1 text-xs font-semibold ml-2 ${value ? "text-indigo-800" : "text-slate-700"}`}>{label}</Text>
      <View
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          padding: 2,
          backgroundColor: value ? ACCENT : "#CBD5E1",
        }}
      >
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: "#FFFFFF",
            alignSelf: value ? "flex-end" : "flex-start",
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

function parseVariants(value: string, fallback: unknown): TemplateVariant[] {
  const candidates = [safeJson(value), fallback];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const variants = candidate.flatMap((item): TemplateVariant[] => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, any>;
      const id = Number(row.emailtemplateid || 0);
      if (!id) return [];
      return [{
        emailtemplateid: id,
        language: String(row.language || "unknown"),
        subject: String(row.subject || ""),
        message: String(row.message || ""),
        translated: Boolean(row.translated),
      }];
    });
    if (variants.length) return variants;
  }
  return [];
}

function parseMergeFields(value: unknown): MergeField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): MergeField[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, any>;
    const token = String(row.token || "").trim();
    if (!token) return [];
    return [{ group: String(row.group || "General"), label: String(row.label || token), token }];
  });
}

function safeJson(value: string): unknown {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function truthy(value: unknown): boolean {
  return ["1", "on", "true", "yes"].includes(String(value ?? "").toLowerCase());
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}
