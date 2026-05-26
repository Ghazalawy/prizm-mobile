import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  useReportDetail,
  useDeleteReport,
  reportImageUrl,
  type ReportDetailRow,
  type ReportImage,
} from "@/lib/queries/reports";
import { colors, statusBadge } from "@/lib/theme";
import { rtlTextStyle } from "@/lib/rtl";

const SCREEN_W = Dimensions.get("window").width;
const ACCENT = colors.primary;

type Props = { id: number };

export function ReportDetailScreen({ id }: Props) {
  const router = useRouter();
  const { data: report, isLoading, isError, error, refetch } = useReportDetail(id);
  const deleteMutation = useDeleteReport();
  const [refreshing, setRefreshing] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Report",
      "This report and all its data will be permanently removed. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteMutation.mutate(id, {
              onSuccess: () => {
                Toast.show({ type: "success", text1: "Report deleted" });
                router.back();
              },
              onError: (err: any) =>
                Toast.show({
                  type: "error",
                  text1: "Delete failed",
                  text2: err?.message?.slice(0, 90),
                }),
            }),
        },
      ]
    );
  }, [deleteMutation, id, router]);

  if (isLoading && !report) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={ACCENT} />
        <Text className="text-slate-500 mt-3">Loading report…</Text>
      </View>
    );
  }

  if (isError || !report) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <Ionicons name="cloud-offline-outline" size={52} color={colors.error} />
        <Text className="text-slate-900 font-semibold text-lg mt-3">
          Couldn&apos;t load report
        </Text>
        <Text className="text-slate-500 text-sm mt-1 text-center">
          {(error as Error)?.message || "Report not found"}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100"
        >
          <Text className="text-slate-700 font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = statusBadge(report.status);
  const dateStr = report.report_date
    ? new Date(report.report_date + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  const workDone = (report.details ?? []).filter((d) => d.type === "done");
  const nextAct = (report.details ?? []).filter((d) => d.type === "next");
  const images = report.images ?? [];

  return (
    <View className="flex-1 bg-slate-50">
      {/* Navbar */}
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.black} />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-slate-900 flex-1" numberOfLines={1}>
          {report.report_code || "Report"}
        </Text>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/reports/${id}/edit` as any)}
          className="w-9 h-9 items-center justify-center"
          hitSlop={6}
        >
          <Ionicons name="create-outline" size={20} color={colors.black} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          className="w-9 h-9 items-center justify-center"
          hitSlop={6}
          disabled={deleteMutation.isPending}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
      >
        {/* ── Header card ──────────────────────────────────────── */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-mono text-slate-400 mb-1">
                {report.report_code}
              </Text>
              <Text className="text-xl font-bold text-slate-900" style={rtlTextStyle(report.project_name)}>
                {report.project_name || `Project #${report.project_id}`}
              </Text>
            </View>
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: badge.bg }}>
              <Text className="text-xs font-semibold" style={{ color: badge.color }}>
                {badge.label}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap mt-3 gap-2">
            <InfoChip icon="calendar-outline" label={dateStr} />
            {report.creator_name ? (
              <InfoChip icon="person-outline" label={report.creator_name} />
            ) : null}
            {report.client_name ? (
              <InfoChip icon="business-outline" label={report.client_name} />
            ) : null}
            <InfoChip icon="document-outline" label={report.type || "project"} />
          </View>
        </View>

        {/* ── Scope description ────────────────────────────────── */}
        {report.scope_description ? (
          <SectionCard title="Scope Description" icon="clipboard-outline">
            <Text
              className="text-sm text-slate-700 leading-5"
              selectable
              style={rtlTextStyle(report.scope_description)}
            >
              {report.scope_description}
            </Text>
          </SectionCard>
        ) : null}

        {/* ── Work Done ────────────────────────────────────────── */}
        {workDone.length > 0 ? (
          <SectionCard title="Work Done Today" icon="hammer-outline" count={workDone.length}>
            {workDone.map((row, idx) => (
              <DetailRowCard key={row.id} row={row} index={idx} variant="done" />
            ))}
          </SectionCard>
        ) : null}

        {/* ── Next Activities ──────────────────────────────────── */}
        {nextAct.length > 0 ? (
          <SectionCard title="Next Activities" icon="arrow-forward-outline" count={nextAct.length}>
            {nextAct.map((row, idx) => (
              <DetailRowCard key={row.id} row={row} index={idx} variant="next" />
            ))}
          </SectionCard>
        ) : null}

        {/* ── Outstanding Issues ───────────────────────────────── */}
        {report.outstanding_issues ? (
          <SectionCard title="Outstanding Issues" icon="alert-circle-outline">
            <Text
              className="text-sm text-slate-700 leading-5"
              selectable
              style={rtlTextStyle(report.outstanding_issues)}
            >
              {report.outstanding_issues}
            </Text>
          </SectionCard>
        ) : null}

        {/* ── Suggestions ──────────────────────────────────────── */}
        {report.suggestions ? (
          <SectionCard title="Suggestions" icon="bulb-outline">
            <Text
              className="text-sm text-slate-700 leading-5"
              selectable
              style={rtlTextStyle(report.suggestions)}
            >
              {report.suggestions}
            </Text>
          </SectionCard>
        ) : null}

        {/* ── Photo gallery ────────────────────────────────────── */}
        {images.length > 0 ? (
          <SectionCard title="Photos" icon="camera-outline" count={images.length}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {images.map((img) => (
                <PhotoThumb
                  key={img.id}
                  image={img}
                  onPress={() => setLightbox(reportImageUrl(img.image_path))}
                />
              ))}
            </ScrollView>
          </SectionCard>
        ) : null}

        {/* ── Action buttons ───────────────────────────────────── */}
        <View className="flex-row mt-4 gap-3">
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/reports/${id}/edit` as any)}
            className="flex-1 flex-row items-center justify-center py-3.5 rounded-xl"
            style={{ backgroundColor: ACCENT }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color="#FFF" />
            <Text className="text-white font-semibold ml-2">Edit Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="flex-row items-center justify-center px-5 py-3.5 rounded-xl bg-red-50"
            activeOpacity={0.8}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Lightbox modal ───────────────────────────────────── */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable
          className="flex-1 bg-black/90 items-center justify-center"
          onPress={() => setLightbox(null)}
        >
          <TouchableOpacity
            onPress={() => setLightbox(null)}
            className="absolute top-12 right-4 z-10 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          {lightbox ? (
            <Image
              source={{ uri: lightbox }}
              style={{ width: SCREEN_W - 32, height: SCREEN_W - 32 }}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 mt-3 shadow-sm">
      <View className="flex-row items-center mb-3">
        <View
          className="w-7 h-7 rounded-lg items-center justify-center"
          style={{ backgroundColor: colors.primaryBg }}
        >
          <Ionicons name={icon} size={14} color={ACCENT} />
        </View>
        <Text className="text-sm font-semibold text-slate-900 ml-2 flex-1">{title}</Text>
        {count != null ? (
          <View className="bg-slate-100 px-2 py-0.5 rounded-full">
            <Text className="text-xs font-semibold text-slate-600">{count}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function InfoChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="flex-row items-center bg-slate-50 px-2.5 py-1.5 rounded-lg">
      <Ionicons name={icon} size={13} color={colors.slate500} />
      <Text className="text-xs text-slate-600 ml-1.5" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function DetailRowCard({
  row,
  index,
  variant,
}: {
  row: ReportDetailRow;
  index: number;
  variant: "done" | "next";
}) {
  const pctLabel = variant === "done" ? "Today" : "Planned";
  const pctValue = variant === "done" ? row.today_percent : row.planned_percent;
  const pctNum = Number(pctValue ?? 0);
  const overallNum = Number(row.overall_percent ?? 0);
  const isSubmitted = (row.submission_status ?? "").toLowerCase() === "yes";

  return (
    <View
      className="bg-slate-50 rounded-xl p-3 mb-2"
      style={index === 0 ? undefined : undefined}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            {row.item_no ? (
              <View className="bg-slate-200 px-2 py-0.5 rounded mr-2">
                <Text className="text-[10px] font-bold text-slate-600">#{row.item_no}</Text>
              </View>
            ) : null}
            <Text className="text-xs text-slate-400" numberOfLines={1}>
              {row.location}
            </Text>
          </View>
          <Text
            className="text-sm font-medium text-slate-800"
            style={rtlTextStyle(row.description_of_work)}
            numberOfLines={3}
          >
            {row.description_of_work}
          </Text>
        </View>

        {isSubmitted ? (
          <View className="bg-green-50 px-2 py-1 rounded-full">
            <Text className="text-[10px] font-semibold text-green-700">Submitted</Text>
          </View>
        ) : (
          <View className="bg-slate-100 px-2 py-1 rounded-full">
            <Text className="text-[10px] font-semibold text-slate-500">Not Submitted</Text>
          </View>
        )}
      </View>

      <View className="flex-row items-center gap-3">
        <ProgressPill label={pctLabel} percent={pctNum} color={ACCENT} />
        <ProgressPill label="Overall" percent={overallNum} color={colors.info} />
      </View>
    </View>
  );
}

function ProgressPill({
  label,
  percent,
  color,
}: {
  label: string;
  percent: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-[10px] text-slate-500">{label}</Text>
        <Text className="text-[10px] font-bold" style={{ color }}>
          {clamped}%
        </Text>
      </View>
      <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

function PhotoThumb({
  image,
  onPress,
}: {
  image: ReportImage;
  onPress: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const uri = reportImageUrl(image.image_path);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <View className="rounded-xl overflow-hidden" style={{ width: 140, height: 140 }}>
        {broken ? (
          <View className="flex-1 bg-slate-200 items-center justify-center">
            <Ionicons name="image-outline" size={28} color={colors.slate400} />
          </View>
        ) : (
          <Image
            source={{ uri }}
            style={{ width: 140, height: 140 }}
            resizeMode="cover"
            onError={() => setBroken(true)}
          />
        )}
        {image.work_image_descriptions ? (
          <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1.5">
            <Text className="text-white text-[10px]" numberOfLines={2}>
              {image.work_image_descriptions}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
