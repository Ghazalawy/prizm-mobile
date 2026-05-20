import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useState, useCallback, ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";

type Field = {
  key: string;
  label?: string;
  render?: (value: any, row: any) => ReactNode;
  /** Hide entirely if the value is empty/null/zero-default */
  hideIfEmpty?: boolean;
};

type EntityDetailProps = {
  title: string;
  queryKey: readonly unknown[];
  fetcher: () => Promise<any>;
  /** Optional explicit field config. If omitted, ALL top-level scalar fields are rendered. */
  fields?: Field[];
  /** Field key to use as the screen title (falls back to "name" / "subject" / first scalar). */
  titleKey?: string;
  /** Optional second-line subtitle key */
  subtitleKey?: string;
};

/**
 * Generic detail screen: shows every interesting field from the API response.
 * Auto-detects URL/email/phone values and makes them tappable.
 *
 * Used by Tasks / Projects / Customers / Leads / Invoices detail screens.
 * Custom-rendered fields can be supplied via the `fields` prop for known shapes.
 */
export function EntityDetail({
  title,
  queryKey,
  fetcher,
  fields,
  titleKey,
  subtitleKey,
}: EntityDetailProps) {
  const [refreshing, setRefreshing] = useState(false);

  const q = useQuery({
    queryKey,
    queryFn: fetcher,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  // Unwrap { status, data } envelopes — some endpoints wrap the row, some don't.
  const row = unwrap(q.data);

  return (
    <ScrollView
      className="flex-1 bg-surface"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
      }
    >
      {/* Top bar with back */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text
          className="ml-3 text-lg font-semibold text-foreground flex-1"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {q.isLoading && !q.data ? (
        <View className="py-20 items-center">
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : q.isError ? (
        <View className="px-8 py-20 items-center">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            {(q.error as Error)?.message || "Unknown error"}
          </Text>
        </View>
      ) : !row ? (
        <View className="px-8 py-20 items-center">
          <Text className="text-muted">Not found</Text>
        </View>
      ) : (
        <View className="p-3">
          {/* Hero card */}
          <View className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
            <Text className="text-2xl font-bold text-foreground" selectable>
              {pickTitle(row, titleKey)}
            </Text>
            {subtitleKey && row[subtitleKey] ? (
              <Text className="text-muted mt-1" selectable>
                {String(row[subtitleKey])}
              </Text>
            ) : null}
          </View>

          {/* Field cards */}
          <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {(fields ?? autoFields(row, titleKey, subtitleKey)).map((f, i) => {
              const value = row[f.key];
              if (f.hideIfEmpty !== false && isEmpty(value)) return null;
              return (
                <View
                  key={f.key}
                  className={`px-4 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <Text className="text-xs text-muted uppercase tracking-wide">
                    {f.label ?? humanize(f.key)}
                  </Text>
                  <View className="mt-1">
                    {f.render ? f.render(value, row) : renderValue(value)}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function unwrap(d: any): any {
  if (!d) return d;
  if (d.status === true && d.data) return Array.isArray(d.data) ? d.data[0] : d.data;
  return d;
}

function pickTitle(row: any, key?: string): string {
  if (key && row[key] !== undefined) return String(row[key] ?? "");
  for (const k of ["name", "subject", "title", "company", "firstname", "invoice_number", "lead_name"]) {
    if (row[k]) return String(row[k]);
  }
  return `#${row.id ?? "?"}`;
}

function autoFields(row: any, titleKey?: string, subtitleKey?: string): Field[] {
  if (!row || typeof row !== "object") return [];
  const skip = new Set([titleKey, subtitleKey, "id"].filter(Boolean) as string[]);
  return Object.keys(row)
    .filter(k => !skip.has(k))
    .filter(k => {
      const v = row[k];
      return v === null || v === undefined || typeof v !== "object" || v instanceof Date;
    })
    .map(k => ({ key: k }));
}

function isEmpty(v: any): boolean {
  if (v === null || v === undefined) return true;
  if (v === "") return true;
  if (v === "0000-00-00" || v === "0000-00-00 00:00:00") return true;
  return false;
}

function humanize(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bId\b/, "ID");
}

function renderValue(v: any): ReactNode {
  if (v === null || v === undefined) {
    return <Text className="text-muted italic">—</Text>;
  }
  const s = String(v);

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${s}`)}>
        <Text className="text-primary underline">{s}</Text>
      </TouchableOpacity>
    );
  }

  // Phone
  if (/^[+]?[\d\s\-().]{6,}$/.test(s) && /\d/.test(s)) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(`tel:${s.replace(/[^+\d]/g, "")}`)}>
        <Text className="text-primary underline">{s}</Text>
      </TouchableOpacity>
    );
  }

  // URL
  if (/^https?:\/\//i.test(s)) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(s)}>
        <Text className="text-primary underline" numberOfLines={2}>{s}</Text>
      </TouchableOpacity>
    );
  }

  // Date-ish
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(s)) {
    return <Text className="text-foreground">{formatDate(s)}</Text>;
  }

  return <Text className="text-foreground" selectable>{s}</Text>;
}

function formatDate(s: string): string {
  try {
    const d = new Date(s.replace(" ", "T"));
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: s.length > 10 ? "2-digit" : undefined,
      minute: s.length > 10 ? "2-digit" : undefined,
    });
  } catch {
    return s;
  }
}
