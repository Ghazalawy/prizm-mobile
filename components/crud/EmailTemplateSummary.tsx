import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type Props = {
  row: Record<string, any>;
};

type Variant = {
  emailtemplateid: number;
  language: string;
  subject: string;
  message: string;
  translated?: boolean;
};

export function EmailTemplateSummary({ row }: Props) {
  const variants = Array.isArray(row.variants) ? row.variants as Variant[] : [];
  const enabled = Number(row.active) === 1;
  const plainText = Number(row.plaintext) === 1;
  const preview = String(row.message_preview || stripHtml(String(row.message || ""))).trim();

  return (
    <View className="p-3">
      <View className="rounded-3xl bg-slate-950 p-4 mb-3 overflow-hidden">
        <View className="flex-row items-start">
          <View className="w-12 h-12 rounded-2xl bg-indigo-500/20 items-center justify-center mr-3">
            <Ionicons name="mail-unread-outline" size={24} color="#A5B4FC" />
          </View>
          <View className="flex-1">
            <Text
              className="text-[10px] font-bold uppercase tracking-[1.4px]"
              style={{ color: "#A5B4FC" }}
            >
              Email Template · {String(row.type_label || row.type || "System")}
            </Text>
            <Text className="text-white text-xl font-bold mt-0.5" numberOfLines={2}>{String(row.name || "Template")}</Text>
            <Text className="text-slate-400 text-xs mt-1" numberOfLines={1}>{String(row.slug || "")}</Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${enabled ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
            <Text
              className="text-[10px] font-bold"
              style={{ color: enabled ? "#6EE7B7" : "#FCA5A5" }}
            >
              {enabled ? "ENABLED" : "DISABLED"}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2 mt-4">
          <Metric icon="language-outline" value={String(variants.length || row.language_count || 1)} label="Languages" />
          <Metric icon="document-text-outline" value={plainText ? "TEXT" : "HTML"} label="Format" />
          <Metric icon="git-merge-outline" value={String(Array.isArray(row.merge_fields) ? row.merge_fields.length : 0)} label="Merge fields" />
        </View>
      </View>

      <View className="flex-row gap-2 mb-3">
        <CompactInfo icon="person-outline" label="Sender" value={String(row.fromname || "Default company name")} />
        <CompactInfo icon="at-outline" label="From email" value={String(row.fromemail || "SMTP default")} />
      </View>

      <SectionTitle title="Primary content" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <View className="px-4 py-3">
          <Text className="text-[10px] uppercase tracking-wide text-slate-500">Subject</Text>
          <Text className="text-slate-900 font-semibold mt-1" selectable>{String(row.subject || "No subject")}</Text>
        </View>
        <View className="px-4 py-3 border-t border-slate-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] uppercase tracking-wide text-slate-500">Message preview</Text>
            <Text className="text-[10px] text-slate-400">{String(row.language || "english")}</Text>
          </View>
          <Text className="text-slate-700 text-sm leading-5 mt-1.5" numberOfLines={8} selectable>
            {preview || "This language variant has no message yet."}
          </Text>
        </View>
      </View>

      <SectionTitle title={`Language coverage · ${variants.length}`} />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {variants.map((variant, index) => {
          const translated = stripHtml(String(variant.message || "")).length > 0;
          return (
            <View key={variant.emailtemplateid} className={`px-4 py-3 flex-row items-center ${index ? "border-t border-slate-100" : ""}`}>
              <View className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${translated ? "bg-emerald-50" : "bg-amber-50"}`}>
                <Ionicons name={translated ? "checkmark-circle-outline" : "alert-circle-outline"} size={19} color={translated ? "#059669" : "#D97706"} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900 capitalize">{variant.language}</Text>
                <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>{variant.subject || "No subject"}</Text>
              </View>
              <Text className={`text-[10px] font-bold ${translated ? "text-emerald-600" : "text-amber-600"}`}>
                {translated ? "READY" : "EMPTY"}
              </Text>
            </View>
          );
        })}
        {variants.length === 0 ? (
          <View className="px-4 py-6 items-center">
            <Text className="text-slate-500">No language variants were returned.</Text>
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

function CompactInfo({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl shadow-sm px-3 py-3">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={15} color="#4F46E5" />
        <Text className="text-[10px] uppercase tracking-wide text-slate-500 ml-1.5">{label}</Text>
      </View>
      <Text className="text-xs font-semibold text-slate-900 mt-1.5" numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500 px-2 mb-1.5">{title}</Text>;
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}
