import { Ionicons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterSheet } from "@/components/ui/FilterSheet";
import { useFilterState } from "@/lib/hooks/useFilterState";
import type { FilterRuleDef } from "@/lib/filters";
import { usePermissions } from "@/lib/permission-context";
import {
  TENDER_TRIAGE_DISMISS_REASONS,
  type TenderTriageItem,
  type TriageAction,
  type TriageBucket,
  type TriageSnapshot,
  useTenderTriageAction,
  useTenderTriageBulkDismiss,
  useTenderTriageItems,
  useTenderTriageMute,
  useTenderTriageMutes,
  useTenderTriageOverview,
  useTenderTriageUnmute,
} from "@/lib/queries/tender-triage";

const ACCENT = "#0F5CC0";
const BUCKETS: Array<{ key: TriageBucket; label: string; color: string }> = [
  { key: "inbox", label: "Inbox", color: "#0F5CC0" },
  { key: "watch", label: "Watch", color: "#64748B" },
  { key: "pursue", label: "Pursue", color: "#7C3AED" },
  { key: "converted", label: "Converted", color: "#15803D" },
  { key: "dismissed", label: "Dismissed", color: "#B91C1C" },
];

const KPI_META = [
  { key: "new", label: "New", icon: "sparkles-outline", color: "#0F5CC0" },
  { key: "awaiting", label: "Awaiting", icon: "hourglass-outline", color: "#B45309" },
  { key: "high", label: "High match", icon: "flame-outline", color: "#C2410C" },
  { key: "pursue", label: "Pursue", icon: "navigate-outline", color: "#7C3AED" },
  { key: "closing2", label: "≤2 days", icon: "alarm-outline", color: "#DC2626" },
  { key: "closing7", label: "≤7 days", icon: "calendar-outline", color: "#EA580C" },
  { key: "closed", label: "Closed", icon: "lock-closed-outline", color: "#64748B" },
] as const;

type DismissTarget = { ids: number[]; item?: TenderTriageItem } | null;

export function TenderTriageScreen() {
  const permissions = usePermissions();
  const canUseTriage = permissions.isAdmin;
  const insets = useSafeAreaInsets();
  const [bucket, setBucket] = useState<TriageBucket>("inbox");
  const [showFilters, setShowFilters] = useState(false);
  const [showMutes, setShowMutes] = useState(false);
  const [country, setCountry] = useState("");
  const [detail, setDetail] = useState<TenderTriageItem | null>(null);
  const [dismissTarget, setDismissTarget] = useState<DismissTarget>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissNote, setDismissNote] = useState("");
  const [convertTarget, setConvertTarget] = useState<TenderTriageItem | null>(null);
  const [opportunityCode, setOpportunityCode] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<{ text: string; id?: number; previous?: TriageSnapshot } | null>(null);

  const overview = useTenderTriageOverview(canUseTriage);
  const filterRules = useMemo<FilterRuleDef[]>(() => {
    const options = overview.data?.options;
    const mapOptions = (values?: string[]) => (values ?? []).map((value) => ({ value, label: value }));
    return [
      { id: "title", type: "TextRule", label: "Title", withEmptyOperators: true },
      { id: "number", type: "TextRule", label: "Tender number", withEmptyOperators: true },
      { id: "source", type: "MultiSelectRule", label: "Portal source", options: mapOptions(options?.sources) },
      { id: "authority", type: "MultiSelectRule", label: "Authority", options: mapOptions(options?.authorities), withEmptyOperators: true },
      { id: "client", type: "TextRule", label: "Branch / client", withEmptyOperators: true },
      { id: "sector", type: "MultiSelectRule", label: "Sector", options: mapOptions(options?.sectors), withEmptyOperators: true },
      { id: "rating", type: "MultiSelectRule", label: "Match rating", options: mapOptions(["High", "Medium", "Low"]), withEmptyOperators: true },
      { id: "scope", type: "MultiSelectRule", label: "Scope", options: [
        { value: "supply", label: "Supply" },
        { value: "supply_service", label: "Supply + service" },
        { value: "service", label: "Service" },
      ], withEmptyOperators: true },
      { id: "deadline", type: "DateRule", label: "Deadline", withEmptyOperators: true, hasDynamicValue: true },
      { id: "first_seen", type: "DateRule", label: "First seen", withEmptyOperators: true, hasDynamicValue: true },
    ];
  }, [overview.data?.options]);
  const filter = useFilterState(filterRules);
  const params = filter.toQueryParams();
  const items = useTenderTriageItems({
    bucket,
    search: params.search ? String(params.search) : undefined,
    filters: params.filters ? String(params.filters) : undefined,
    source: params.source ? String(params.source) : undefined,
    authority: params.authority ? String(params.authority) : undefined,
    client: params.client ? String(params.client) : undefined,
    sector: params.sector ? String(params.sector) : undefined,
    rating: params.rating ? String(params.rating) : undefined,
    scope: params.scope ? String(params.scope) : undefined,
    country: country || undefined,
    limit: 200,
  }, canUseTriage);
  const mutes = useTenderTriageMutes(canUseTriage && showMutes);
  const action = useTenderTriageAction();
  const bulkDismiss = useTenderTriageBulkDismiss();
  const mute = useTenderTriageMute();
  const unmute = useTenderTriageUnmute();
  const busy = action.isPending || bulkDismiss.isPending || mute.isPending || unmute.isPending;

  if (!permissions.isLoaded) {
    return <View className="flex-1 items-center justify-center bg-slate-50"><ActivityIndicator size="large" color={ACCENT} /></View>;
  }
  if (!canUseTriage) return <Redirect href="/(tabs)/tenders" />;

  const toggleSelected = (id: number) => {
    setSelected((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runActionById = async (id: number, nextAction: TriageAction, extra: Record<string, unknown> = {}) => {
    try {
      const response = await action.mutateAsync({ id, action: nextAction, ...extra });
      setDetail(null);
      setConvertTarget(null);
      const label = actionLabel(nextAction);
      setNotice({ text: label, id, previous: response?.data?.previous });
    } catch (error: any) {
      Alert.alert("Action failed", error?.message || "The triage item could not be updated.");
    }
  };

  const runAction = (item: TenderTriageItem, nextAction: TriageAction, extra: Record<string, unknown> = {}) =>
    runActionById(item.id, nextAction, extra);

  const submitDismiss = async () => {
    if (!dismissTarget || !dismissReason) return;
    try {
      if (dismissTarget.item) {
        await runAction(dismissTarget.item, "dismiss", { reason: dismissReason, note: dismissNote });
      } else {
        const response = await bulkDismiss.mutateAsync({ ids: dismissTarget.ids, reason: dismissReason, note: dismissNote });
        setNotice({ text: `${response?.data?.dismissed ?? 0} inbox items dismissed` });
      }
      setSelected(new Set());
      setDismissTarget(null);
      setDismissReason("");
      setDismissNote("");
    } catch (error: any) {
      Alert.alert("Dismiss failed", error?.message || "The selected items could not be dismissed.");
    }
  };

  const refresh = () => Promise.all([overview.refetch(), items.refetch()]);
  const counts = overview.data?.counts ?? { inbox: 0, watch: 0, pursue: 0, converted: 0, dismissed: 0 };
  const kpis = overview.data?.kpis;
  const hasActiveFilters = filter.hasActiveFilters || !!country;
  const clearAllFilters = () => { filter.clearAll(); setCountry(""); };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-slate-950 px-4 pb-3" style={{ paddingTop: Math.max(insets.top, 12) }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-1 ml-3">
            <Text className="text-[10px] font-bold tracking-[2px] text-blue-300">TENDER OPERATIONS</Text>
            <Text className="text-[22px] leading-7 font-extrabold text-white">Triage command center</Text>
            <Text className="text-[11px] text-slate-400">{overview.data?.last_run ? `Last sweep ${formatDateTime(overview.data.last_run)}` : "AI shortlist · admin workspace"}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowMutes(true)} className="w-9 h-9 rounded-xl bg-white/10 items-center justify-center" accessibilityLabel="Manage muted authorities">
            <Ionicons name="volume-mute-outline" size={19} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingTop: 10, paddingRight: 4 }}
        >
          {KPI_META.map((metric) => (
            <View key={metric.key} className="bg-white/10 rounded-xl px-2.5 py-2 flex-row items-center" style={{ width: 112 }}>
              <Ionicons name={metric.icon} size={15} color={metric.color === "#64748B" ? "#CBD5E1" : metric.color} />
              <View className="ml-2">
                <Text className="text-white text-base leading-5 font-extrabold">{kpis?.[metric.key] ?? 0}</Text>
                <Text className="text-slate-400 text-[9px]" numberOfLines={1}>{metric.label}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View className="bg-white border-b border-slate-200 px-3 pt-3 pb-2">
        <FilterBar
          search={filter.search}
          onSearchChange={filter.setSearch}
          searchPlaceholder="Title, number, authority, note…"
          activeFilterCount={filter.activeFilterCount + (country ? 1 : 0)}
          onFilterPress={() => setShowFilters(true)}
          onClearAll={clearAllFilters}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 10 }}>
          {BUCKETS.map((tab) => {
            const active = bucket === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => { setBucket(tab.key); setSelected(new Set()); }}
                className="rounded-full px-3 py-1.5 flex-row items-center border"
                style={{ backgroundColor: active ? tab.color : "#FFFFFF", borderColor: active ? tab.color : "#E2E8F0" }}
              >
                <Text className="text-xs font-bold" style={{ color: active ? "#FFFFFF" : "#475569" }}>{tab.label}</Text>
                <View className="ml-1.5 rounded-full px-1.5 py-0.5" style={{ backgroundColor: active ? "rgba(255,255,255,.22)" : "#F1F5F9" }}>
                  <Text className="text-[9px] font-extrabold" style={{ color: active ? "#FFFFFF" : "#64748B" }}>{counts[tab.key]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {(overview.data?.options.countries.length ?? 0) > 0 ? (
          <View className="flex-row items-center mt-2">
            <Ionicons name="globe-outline" size={14} color="#64748B" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, paddingLeft: 6 }}>
              {["", ...(overview.data?.options.countries ?? [])].map((value) => {
                const active = country === value;
                return (
                  <TouchableOpacity
                    key={value || "all"}
                    onPress={() => setCountry(value)}
                    className="rounded-lg border px-2 py-1"
                    style={{ borderColor: active ? ACCENT : "#E2E8F0", backgroundColor: active ? "#EFF6FF" : "#FFFFFF" }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: active ? ACCENT : "#64748B" }}>{value || "All regions"}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {notice ? (
        <View className="mx-3 mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 flex-row items-center">
          <Ionicons name="checkmark-circle" size={17} color={ACCENT} />
          <Text className="flex-1 ml-2 text-xs font-semibold text-blue-900">{notice.text}</Text>
          {notice.id && notice.previous ? (
            <TouchableOpacity
              onPress={async () => {
                await runActionById(notice.id!, "restore", { previous: notice.previous });
                setNotice(null);
              }}
              className="px-2 py-1"
            ><Text className="text-xs font-extrabold text-blue-700">UNDO</Text></TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => setNotice(null)} className="p-1"><Ionicons name="close" size={16} color="#64748B" /></TouchableOpacity>
        </View>
      ) : null}

      {selected.size > 0 ? (
        <View className="mx-3 mt-2 rounded-xl bg-slate-900 px-3 py-2 flex-row items-center">
          <Text className="text-white text-xs font-bold flex-1">{selected.size} inbox item{selected.size === 1 ? "" : "s"} selected</Text>
          <TouchableOpacity onPress={() => setSelected(new Set())} className="px-2 py-1"><Text className="text-slate-300 text-xs">Clear</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setDismissTarget({ ids: [...selected] })} className="bg-red-600 rounded-lg px-3 py-1.5 ml-1">
            <Text className="text-white text-xs font-bold">Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {items.isLoading && !items.data ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={ACCENT} /></View>
      ) : items.isError ? (
        <StatePanel icon="cloud-offline-outline" title="Triage could not load" detail={(items.error as Error)?.message} onPress={() => items.refetch()} />
      ) : !overview.data?.installed ? (
        <StatePanel icon="construct-outline" title="Triage is not installed" detail="Open the ERP once to let its schema self-heal." onPress={() => refresh()} />
      ) : !items.data?.items.length ? (
        <StatePanel icon="checkmark-done-circle-outline" title={`No ${bucket} items`} detail={hasActiveFilters ? "Clear or change the current filters." : "This queue is clear."} onPress={hasActiveFilters ? clearAllFilters : undefined} />
      ) : (
        <FlatList
          data={items.data.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }}
          refreshControl={<RefreshControl refreshing={items.isRefetching || overview.isRefetching} onRefresh={refresh} tintColor={ACCENT} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <TriageRow
              item={item}
              selected={selected.has(item.id)}
              selectionEnabled={bucket === "inbox"}
              onToggle={() => toggleSelected(item.id)}
              onPress={() => setDetail(item)}
            />
          )}
        />
      )}

      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        ruleDefs={filterRules}
        rules={filter.rules}
        matchType={filter.matchType}
        onAddRule={filter.addRule}
        onRemoveRule={filter.removeRule}
        onUpdateRule={filter.updateRule}
        onSetMatchType={filter.setMatchType}
      />

      <TriageDetailModal
        item={detail}
        busy={busy}
        onClose={() => setDetail(null)}
        onAction={(nextAction) => detail && runAction(detail, nextAction)}
        onDismiss={() => detail && setDismissTarget({ ids: [detail.id], item: detail })}
        onConvert={() => { setConvertTarget(detail); setOpportunityCode(""); }}
        onMute={(type, value) => {
          if (!value) return;
          Alert.alert(`Mute ${type}?`, `Future items for ${value} will be dismissed automatically.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Mute", style: "destructive", onPress: async () => {
              try { await mute.mutateAsync({ type, value }); setDetail(null); setNotice({ text: `${value} muted` }); }
              catch (error: any) { Alert.alert("Mute failed", error?.message); }
            } },
          ]);
        }}
      />

      <DismissModal
        visible={!!dismissTarget}
        reason={dismissReason}
        note={dismissNote}
        count={dismissTarget?.ids.length ?? 0}
        busy={busy}
        onReason={setDismissReason}
        onNote={setDismissNote}
        onClose={() => setDismissTarget(null)}
        onSubmit={submitDismiss}
      />

      <ConvertModal
        item={convertTarget}
        code={opportunityCode}
        busy={busy}
        onCode={setOpportunityCode}
        onClose={() => setConvertTarget(null)}
        onSubmit={() => convertTarget && runAction(convertTarget, "mark_converted", { opp_code: opportunityCode })}
      />

      <MutesModal
        visible={showMutes}
        rows={mutes.data ?? []}
        loading={mutes.isLoading}
        busy={busy}
        onClose={() => setShowMutes(false)}
        onUnmute={async (row) => {
          try { await unmute.mutateAsync({ type: row.mute_type, value: row.mute_value }); setNotice({ text: `${row.mute_value} un-muted` }); }
          catch (error: any) { Alert.alert("Un-mute failed", error?.message); }
        }}
      />
    </View>
  );
}

function TriageRow({ item, selected, selectionEnabled, onToggle, onPress }: { item: TenderTriageItem; selected: boolean; selectionEnabled: boolean; onToggle: () => void; onPress: () => void }) {
  const deadline = deadlineMeta(item.deadline);
  const rating = ratingMeta(item.rating);
  return (
    <TouchableOpacity onPress={onPress} onLongPress={selectionEnabled ? onToggle : undefined} activeOpacity={0.72} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <View className="flex-row">
        <View style={{ width: 4, backgroundColor: rating.color }} />
        <View className="flex-1 px-3 py-3">
          <View className="flex-row items-start">
            {selectionEnabled ? (
              <TouchableOpacity onPress={onToggle} className="w-7 h-7 mr-2 items-center justify-center" accessibilityLabel={selected ? "Deselect tender" : "Select tender"}>
                <Ionicons name={selected ? "checkbox" : "square-outline"} size={21} color={selected ? ACCENT : "#94A3B8"} />
              </TouchableOpacity>
            ) : null}
            <View className="flex-1">
              <Text className="text-[14px] leading-[18px] font-extrabold text-slate-900" numberOfLines={2}>{item.title || "Untitled tender"}</Text>
              <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>{item.number} · {item.source || "Unknown source"}</Text>
            </View>
            <View className="rounded-full px-2 py-1 ml-2" style={{ backgroundColor: rating.bg }}>
              <Text className="text-[9px] font-extrabold" style={{ color: rating.color }}>{rating.label}</Text>
            </View>
          </View>
          <View className="flex-row mt-2" style={{ gap: 6 }}>
            <MetaPill icon="business-outline" text={item.authority || item.client || "Authority unknown"} flex />
            <MetaPill icon="layers-outline" text={item.sector || "Unscoped"} flex />
          </View>
          <View className="flex-row items-center mt-2">
            <Text className="text-[10px] text-slate-500 flex-1" numberOfLines={1}>{scopeLabel(item.scope)}{item.client && item.client !== item.authority ? ` · ${item.client}` : ""}</Text>
            <Ionicons name={deadline.icon} size={12} color={deadline.color} />
            <Text className="text-[10px] font-bold ml-1" style={{ color: deadline.color }}>{deadline.text}</Text>
            <Ionicons name="chevron-forward" size={14} color="#94A3B8" style={{ marginLeft: 6 }} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MetaPill({ icon, text, flex }: { icon: keyof typeof Ionicons.glyphMap; text: string; flex?: boolean }) {
  return <View className={`bg-slate-50 rounded-lg px-2 py-1 flex-row items-center ${flex ? "flex-1" : ""}`}>
    <Ionicons name={icon} size={11} color="#64748B" />
    <Text className="text-[9px] text-slate-600 ml-1 flex-1" numberOfLines={1}>{text}</Text>
  </View>;
}

function TriageDetailModal({ item, busy, onClose, onAction, onDismiss, onConvert, onMute }: {
  item: TenderTriageItem | null;
  busy: boolean;
  onClose: () => void;
  onAction: (action: TriageAction) => void;
  onDismiss: () => void;
  onConvert: () => void;
  onMute: (type: "authority" | "branch", value: string) => void;
}) {
  const insets = useSafeAreaInsets();
  if (!item) return null;
  const status = item.triage_status;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View className="flex-1 bg-slate-50" style={{ paddingTop: Math.max(insets.top, 12) }}>
        <View className="px-4 pb-3 border-b border-slate-200 bg-white flex-row items-center">
          <View className="flex-1"><Text className="text-[10px] tracking-[1.5px] font-bold text-blue-700">TRIAGE RECORD</Text><Text className="text-lg font-extrabold text-slate-900">{item.number}</Text></View>
          <TouchableOpacity onPress={onClose} className="w-9 h-9 bg-slate-100 rounded-full items-center justify-center"><Ionicons name="close" size={20} color="#475569" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
          <Text className="text-xl leading-7 font-extrabold text-slate-950">{item.title}</Text>
          <View className="flex-row flex-wrap mt-3" style={{ gap: 6 }}>
            <DetailTag label={item.rating || "Unrated"} color={ratingMeta(item.rating).color} />
            <DetailTag label={status.toUpperCase()} color={statusColor(status)} />
            <DetailTag label={scopeLabel(item.scope)} color="#475569" />
            <DetailTag label={deadlineMeta(item.deadline).text} color={deadlineMeta(item.deadline).color} />
          </View>
          <DetailGrid rows={[
            ["Authority", item.authority || "—"], ["Branch / client", item.client || "—"],
            ["Sector", item.sector || "Needs scoping"], ["Portal source", item.source || "—"],
            ["First seen", formatDateTime(item.first_seen)], ["Last seen", formatDateTime(item.last_seen)],
          ]} />
          {item.rationale ? <DetailSection title="WHY THIS RATING" text={item.rationale} /> : null}
          {item.notes ? <DetailSection title="AI NOTES" text={item.notes} /> : null}
          {item.description ? <DetailSection title="DESCRIPTION" text={item.description} /> : null}
          {item.dismiss_reason ? <DetailSection title="DECISION" text={`${item.dismiss_reason}${item.dismiss_note ? ` · ${item.dismiss_note}` : ""}${item.decided_by ? `\nBy ${item.decided_by}` : ""}`} tone="danger" /> : null}
          {item.opportunity_code ? <DetailSection title="CONVERTED OPPORTUNITY" text={item.opportunity_code} tone="success" /> : null}
          <TouchableOpacity onPress={() => router.push(`/(tabs)/tenders/${item.tender_id}` as any)} className="bg-white border border-slate-200 rounded-xl px-3 py-3 mt-3 flex-row items-center">
            <Ionicons name="open-outline" size={17} color={ACCENT} /><Text className="text-sm font-bold text-blue-700 ml-2 flex-1">Open full tender record</Text><Ionicons name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
          <View className="mt-4 bg-white border border-slate-200 rounded-xl p-3">
            <Text className="text-[10px] tracking-[1.2px] font-bold text-slate-500 mb-2">SOURCE CONTROLS</Text>
            {item.authority ? <TouchableOpacity onPress={() => onMute("authority", item.authority)} className="py-2 flex-row items-center"><Ionicons name="volume-mute-outline" size={16} color="#B91C1C" /><Text className="text-xs text-slate-700 ml-2 flex-1">Mute authority · {item.authority}</Text></TouchableOpacity> : null}
            {item.client ? <TouchableOpacity onPress={() => onMute("branch", item.client)} className="py-2 flex-row items-center"><Ionicons name="remove-circle-outline" size={16} color="#B91C1C" /><Text className="text-xs text-slate-700 ml-2 flex-1">Mute branch · {item.client}</Text></TouchableOpacity> : null}
          </View>
        </ScrollView>
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 pt-2 flex-row" style={{ paddingBottom: Math.max(insets.bottom, 10), gap: 7 }}>
          {status === "new" || status === "pending" ? <><ActionButton label="Dismiss" icon="close-circle-outline" color="#B91C1C" onPress={onDismiss} disabled={busy} /><ActionButton label="Watch" icon="eye-outline" color="#64748B" onPress={() => onAction("watch")} disabled={busy} /><ActionButton label="Pursue" icon="navigate-outline" color={ACCENT} onPress={() => onAction("pursue")} disabled={busy} /></> : null}
          {status === "watch" ? <><ActionButton label="Inbox" icon="arrow-undo-outline" color="#64748B" onPress={() => onAction("to_inbox")} disabled={busy} /><ActionButton label="Dismiss" icon="close-circle-outline" color="#B91C1C" onPress={onDismiss} disabled={busy} /><ActionButton label="Pursue" icon="navigate-outline" color={ACCENT} onPress={() => onAction("pursue")} disabled={busy} /></> : null}
          {status === "pursue" ? <><ActionButton label="Dismiss" icon="close-circle-outline" color="#B91C1C" onPress={onDismiss} disabled={busy} /><ActionButton label="Converted" icon="checkmark-done-outline" color="#15803D" onPress={onConvert} disabled={busy} wide /></> : null}
          {status === "converted" ? <ActionButton label="Not converted · back to Pursue" icon="arrow-undo-outline" color="#7C3AED" onPress={() => onAction("not_converted")} disabled={busy} wide /> : null}
          {status === "dismissed" ? <ActionButton label="Reopen to inbox" icon="refresh-outline" color={ACCENT} onPress={() => onAction("reopen")} disabled={busy} wide /> : null}
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({ label, icon, color, onPress, disabled, wide }: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void; disabled: boolean; wide?: boolean }) {
  return <TouchableOpacity onPress={onPress} disabled={disabled} className="rounded-xl px-3 py-2.5 flex-row items-center justify-center" style={{ flex: wide ? 2 : 1, backgroundColor: `${color}12`, opacity: disabled ? 0.5 : 1 }}>
    <Ionicons name={icon} size={16} color={color} /><Text className="text-[11px] font-extrabold ml-1.5" style={{ color }} numberOfLines={1}>{label}</Text>
  </TouchableOpacity>;
}

function DetailGrid({ rows }: { rows: string[][] }) {
  return <View className="bg-white border border-slate-200 rounded-2xl p-3 mt-4 flex-row flex-wrap">
    {rows.map(([label, value]) => <View key={label} className="py-2 pr-2" style={{ width: "50%" }}><Text className="text-[9px] tracking-wide font-bold text-slate-400">{label.toUpperCase()}</Text><Text className="text-xs leading-4 font-semibold text-slate-800 mt-0.5" numberOfLines={2}>{value}</Text></View>)}
  </View>;
}

function DetailSection({ title, text, tone }: { title: string; text: string; tone?: "danger" | "success" }) {
  const color = tone === "danger" ? "#B91C1C" : tone === "success" ? "#15803D" : "#334155";
  const bg = tone === "danger" ? "#FEF2F2" : tone === "success" ? "#F0FDF4" : "#FFFFFF";
  return <View className="border border-slate-200 rounded-xl p-3 mt-3" style={{ backgroundColor: bg }}><Text className="text-[9px] tracking-[1.2px] font-bold" style={{ color }}>{title}</Text><Text className="text-xs leading-5 text-slate-700 mt-1">{text}</Text></View>;
}

function DetailTag({ label, color }: { label: string; color: string }) {
  return <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}14` }}><Text className="text-[10px] font-extrabold" style={{ color }}>{label}</Text></View>;
}

function DismissModal({ visible, reason, note, count, busy, onReason, onNote, onClose, onSubmit }: { visible: boolean; reason: string; note: string; count: number; busy: boolean; onReason: (value: string) => void; onNote: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 bg-black/50 justify-end"><View className="bg-white rounded-t-3xl p-4 pb-8">
      <View className="flex-row items-center"><View className="flex-1"><Text className="text-[10px] tracking-[1.4px] font-bold text-red-700">DECISION REQUIRED</Text><Text className="text-xl font-extrabold text-slate-900">Dismiss {count} item{count === 1 ? "" : "s"}</Text></View><TouchableOpacity onPress={onClose} className="p-2"><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 14 }}>
        {TENDER_TRIAGE_DISMISS_REASONS.map((value) => <TouchableOpacity key={value} onPress={() => onReason(value)} className="rounded-full px-3 py-2 border" style={{ backgroundColor: reason === value ? "#B91C1C" : "#FFFFFF", borderColor: reason === value ? "#B91C1C" : "#CBD5E1" }}><Text className="text-xs font-bold" style={{ color: reason === value ? "#FFFFFF" : "#475569" }}>{value}</Text></TouchableOpacity>)}
      </ScrollView>
      {reason === "Not now" ? <Text className="text-[10px] text-blue-700 mb-2">Temporary pass · it will not be learned as disinterest.</Text> : null}
      <TextInput value={note} onChangeText={onNote} placeholder="Optional decision note" placeholderTextColor="#94A3B8" className="bg-slate-100 rounded-xl px-3 py-3 text-slate-900" />
      <TouchableOpacity onPress={onSubmit} disabled={!reason || busy} className="bg-red-700 rounded-xl py-3 items-center mt-3" style={{ opacity: !reason || busy ? 0.45 : 1 }}><Text className="text-white font-extrabold">Confirm dismiss</Text></TouchableOpacity>
    </View></View>
  </Modal>;
}

function ConvertModal({ item, code, busy, onCode, onClose, onSubmit }: { item: TenderTriageItem | null; code: string; busy: boolean; onCode: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  return <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 bg-black/50 justify-center px-5"><View className="bg-white rounded-3xl p-5">
      <View className="w-11 h-11 rounded-2xl bg-green-50 items-center justify-center"><Ionicons name="checkmark-done-outline" size={23} color="#15803D" /></View>
      <Text className="text-xl font-extrabold text-slate-900 mt-3">Mark converted</Text><Text className="text-xs text-slate-500 mt-1" numberOfLines={2}>{item?.title}</Text>
      <TextInput value={code} onChangeText={onCode} placeholder="Opportunity code (optional)" autoCapitalize="characters" placeholderTextColor="#94A3B8" className="bg-slate-100 rounded-xl px-3 py-3 text-slate-900 mt-4" />
      <View className="flex-row mt-4" style={{ gap: 8 }}><TouchableOpacity onPress={onClose} className="flex-1 border border-slate-300 rounded-xl py-3 items-center"><Text className="font-bold text-slate-600">Cancel</Text></TouchableOpacity><TouchableOpacity onPress={onSubmit} disabled={busy} className="flex-1 bg-green-700 rounded-xl py-3 items-center" style={{ opacity: busy ? 0.5 : 1 }}><Text className="font-bold text-white">Confirm</Text></TouchableOpacity></View>
    </View></View>
  </Modal>;
}

function MutesModal({ visible, rows, loading, busy, onClose, onUnmute }: { visible: boolean; rows: any[]; loading: boolean; busy: boolean; onClose: () => void; onUnmute: (row: any) => void }) {
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
    <View className="flex-1 bg-slate-50"><View className="bg-white border-b border-slate-200 p-4 flex-row items-center"><View className="flex-1"><Text className="text-[10px] tracking-[1.4px] text-red-700 font-bold">SOURCE CONTROL</Text><Text className="text-xl font-extrabold text-slate-900">Muted authorities & branches</Text></View><TouchableOpacity onPress={onClose} className="p-2"><Ionicons name="close" size={22} color="#64748B" /></TouchableOpacity></View>
      {loading ? <View className="flex-1 items-center justify-center"><ActivityIndicator color={ACCENT} /></View> : rows.length === 0 ? <StatePanel icon="volume-high-outline" title="Nothing is muted" detail="All authorities and branches can enter the triage queue." /> : <FlatList data={rows} keyExtractor={(row) => `${row.mute_type}:${row.mute_value}`} contentContainerStyle={{ padding: 12 }} ItemSeparatorComponent={() => <View className="h-2" />} renderItem={({ item }) => <View className="bg-white rounded-xl border border-slate-200 p-3 flex-row items-center"><View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center"><Ionicons name={item.mute_type === "authority" ? "business-outline" : "git-branch-outline"} size={18} color="#B91C1C" /></View><View className="flex-1 ml-3"><Text className="text-sm font-bold text-slate-900">{item.mute_value}</Text><Text className="text-[10px] text-slate-500 uppercase">{item.mute_type}</Text></View><TouchableOpacity disabled={busy} onPress={() => onUnmute(item)} className="bg-slate-100 rounded-lg px-3 py-2"><Text className="text-xs font-bold text-slate-700">Un-mute</Text></TouchableOpacity></View>} />}
    </View>
  </Modal>;
}

function StatePanel({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; onPress?: () => void }) {
  return <View className="flex-1 items-center justify-center px-8"><View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center"><Ionicons name={icon} size={28} color="#64748B" /></View><Text className="text-base font-extrabold text-slate-900 mt-3">{title}</Text>{detail ? <Text className="text-xs text-slate-500 text-center mt-1">{detail}</Text> : null}{onPress ? <TouchableOpacity onPress={onPress} className="bg-slate-900 rounded-xl px-4 py-2.5 mt-4"><Text className="text-white text-xs font-bold">Try again</Text></TouchableOpacity> : null}</View>;
}

function ratingMeta(rating: TenderTriageItem["rating"]) {
  if (rating === "High") return { label: "HIGH", color: "#C2410C", bg: "#FFF7ED" };
  if (rating === "Medium") return { label: "MEDIUM", color: "#B45309", bg: "#FFFBEB" };
  if (rating === "Low") return { label: "LOW", color: "#64748B", bg: "#F1F5F9" };
  return { label: "UNRATED", color: "#64748B", bg: "#F1F5F9" };
}

function deadlineMeta(value: string | null): { text: string; color: string; icon: keyof typeof Ionicons.glyphMap } {
  if (!value) return { text: "No deadline", color: "#64748B", icon: "calendar-outline" };
  const target = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(target.getTime())) return { text: value, color: "#64748B", icon: "calendar-outline" };
  const days = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `Closed ${Math.abs(days)}d ago`, color: "#64748B", icon: "lock-closed-outline" };
  if (days === 0) return { text: "Closes today", color: "#DC2626", icon: "alarm-outline" };
  if (days <= 2) return { text: `${days}d left`, color: "#DC2626", icon: "alarm-outline" };
  if (days <= 7) return { text: `${days}d left`, color: "#EA580C", icon: "time-outline" };
  return { text: `${days}d left`, color: "#15803D", icon: "time-outline" };
}

function scopeLabel(scope: TenderTriageItem["scope"]) {
  if (scope === "supply_service") return "Supply + service";
  if (scope === "supply") return "Supply";
  if (scope === "service") return "Service";
  return "Scope not classified";
}

function statusColor(status: string) {
  return status === "pursue" ? "#7C3AED" : status === "converted" ? "#15803D" : status === "dismissed" ? "#B91C1C" : status === "watch" ? "#64748B" : ACCENT;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function actionLabel(action: TriageAction) {
  const labels: Record<TriageAction, string> = {
    pursue: "Moved to Pursue", watch: "Added to Watch", dismiss: "Tender dismissed",
    reopen: "Reopened to inbox", to_inbox: "Moved back to inbox", mark_converted: "Marked converted",
    not_converted: "Moved back to Pursue", restore: "Previous state restored",
  };
  return labels[action];
}
