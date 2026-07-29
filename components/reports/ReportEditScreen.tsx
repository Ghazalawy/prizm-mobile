import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  useReportDetail,
  useReportProjects,
  useUpdateReport,
  useUploadReportImages,
  useDeleteReportImage,
  reportImageUrl,
  type CreateReportPayload,
  type ReportProject,
  type ImageUploadItem,
} from "@/lib/queries/reports";
import { takePhoto, pickImage } from "@/lib/files";
import { colors } from "@/lib/theme";
import { isArabic, rtlTextStyle } from "@/lib/rtl";
import { DateInput } from "@/components/crud/DateInput";

const ACCENT = colors.primary;
const TOTAL_STEPS = 6;
const STEP_LABELS = ["Header", "Work Done", "Next Activities", "Issues", "Photos", "Review"];

type WorkItemDraft = {
  key: string;
  location: string;
  description: string;
  item_no: string;
  percent: string;
  overall_percent: string;
  submission_status: string;
};

type PhotoDraft = {
  key: string;
  uri: string;
  description: string;
  isExisting?: boolean;
  existingId?: number;
};

type Props = { id: number };

function genKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyWorkItem(): WorkItemDraft {
  return {
    key: genKey(),
    location: "",
    description: "",
    item_no: "",
    percent: "0",
    overall_percent: "0",
    submission_status: "no",
  };
}

export function ReportEditScreen({ id }: Props) {
  const router = useRouter();
  const { data: report, isLoading, isError } = useReportDetail(id);
  const { data: projects } = useReportProjects();
  const updateMut = useUpdateReport();
  const uploadMut = useUploadReportImages();
  const deleteImgMut = useDeleteReportImage();

  const [initialized, setInitialized] = useState(false);
  const [step, setStep] = useState(0);

  // Step 1
  const [projectId, setProjectId] = useState<number | undefined>();
  const [reportDate, setReportDate] = useState("");
  const [scopeDescription, setScopeDescription] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // Steps 2-3
  const [workItems, setWorkItems] = useState<WorkItemDraft[]>([emptyWorkItem()]);
  const [nextItems, setNextItems] = useState<WorkItemDraft[]>([emptyWorkItem()]);

  // Step 4
  const [outstandingIssues, setOutstandingIssues] = useState("");
  const [suggestions, setSuggestions] = useState("");

  // Step 5
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Pre-populate from report data
  useEffect(() => {
    if (!report || initialized) return;

    setProjectId(report.related_to || report.project_id);
    setReportDate(report.report_date ?? "");
    setScopeDescription(report.scope_description ?? "");
    setOutstandingIssues(report.outstanding_issues ?? "");
    setSuggestions(report.suggestions ?? "");

    const doneRows = (report.details ?? []).filter((d) => d.type === "done");
    const nextRows = (report.details ?? []).filter((d) => d.type === "next");

    if (doneRows.length > 0) {
      setWorkItems(
        doneRows.map((d) => ({
          key: genKey(),
          location: d.location ?? "",
          description: d.description_of_work ?? "",
          item_no: d.item_no ?? "",
          percent: d.today_percent ?? "0",
          overall_percent: d.overall_percent ?? "0",
          submission_status: (d.submission_status ?? "no").toLowerCase(),
        }))
      );
    }

    if (nextRows.length > 0) {
      setNextItems(
        nextRows.map((d) => ({
          key: genKey(),
          location: d.location ?? "",
          description: d.description_of_work ?? "",
          item_no: d.item_no ?? "",
          percent: d.planned_percent ?? "0",
          overall_percent: d.overall_percent ?? "0",
          submission_status: (d.submission_status ?? "no").toLowerCase(),
        }))
      );
    }

    if (report.images?.length) {
      setPhotos(
        report.images.map((img) => ({
          key: genKey(),
          uri: reportImageUrl(img.image_path),
          description: img.work_image_descriptions ?? "",
          isExisting: true,
          existingId: img.id,
        }))
      );
    }

    setInitialized(true);
  }, [report, initialized]);

  const selectedProject = useMemo(
    () => (projects ?? []).find((p) => p.id === projectId),
    [projects, projectId]
  );

  const canProceed = useCallback(
    (s: number): boolean => {
      switch (s) {
        case 0:
          return !!projectId && !!reportDate.trim();
        default:
          return true;
      }
    },
    [projectId, reportDate]
  );

  const goNext = useCallback(() => {
    if (!canProceed(step)) {
      Toast.show({ type: "error", text1: "Please fill required fields" });
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }, [step, canProceed]);

  const goBack = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else router.back();
  }, [step, router]);

  // Work item helpers
  const updateWorkItem = useCallback(
    (list: WorkItemDraft[], setList: (v: WorkItemDraft[]) => void, key: string, field: string, value: string) => {
      setList(list.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
    },
    []
  );

  const addWorkItem = useCallback(
    (list: WorkItemDraft[], setList: (v: WorkItemDraft[]) => void) => {
      setList([...list, emptyWorkItem()]);
    },
    []
  );

  const removeWorkItem = useCallback(
    (list: WorkItemDraft[], setList: (v: WorkItemDraft[]) => void, key: string) => {
      if (list.length <= 1) return;
      setList(list.filter((item) => item.key !== key));
    },
    []
  );

  // Photo helpers
  const handleCamera = useCallback(async () => {
    const result = await takePhoto();
    if (result) {
      setPhotos((prev) => [...prev, { key: genKey(), uri: result.uri, description: "" }]);
    }
  }, []);

  const handleGallery = useCallback(async () => {
    const result = await pickImage();
    if (result) {
      setPhotos((prev) => [...prev, { key: genKey(), uri: result.uri, description: "" }]);
    }
  }, []);

  const removePhoto = useCallback((key: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.key === key);
      if (photo?.isExisting && photo.existingId) {
        setDeletedImageIds((ids) => [...ids, photo.existingId!]);
      }
      return prev.filter((p) => p.key !== key);
    });
  }, []);

  const updatePhotoDesc = useCallback((key: string, desc: string) => {
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, description: desc } : p)));
  }, []);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (!projectId) {
      Toast.show({ type: "error", text1: "Please select a project" });
      return;
    }

    setSubmitting(true);
    try {
      const validWork = workItems.filter((w) => w.description.trim());
      const validNext = nextItems.filter((n) => n.description.trim());

      const payload: Partial<CreateReportPayload> = {
        type: "project",
        related_to: projectId,
        report_date: reportDate,
        scope_description: scopeDescription,
        outstanding_issues: outstandingIssues,
        suggestions: suggestions,
        work_done: {
          locations: validWork.map((w) => w.location),
          descriptions: validWork.map((w) => w.description),
          item_nos: validWork.map((w) => w.item_no),
          today_percent: validWork.map((w) => w.percent),
          overall_percent: validWork.map((w) => w.overall_percent),
          submissions_raq: validWork.map((w) => w.submission_status),
        },
        next_activities: {
          locations: validNext.map((n) => n.location),
          descriptions: validNext.map((n) => n.description),
          item_nos: validNext.map((n) => n.item_no),
          planned_percent: validNext.map((n) => n.percent),
          overall_percent: validNext.map((n) => n.overall_percent),
          submissions_raq: validNext.map((n) => n.submission_status),
        },
      };

      await updateMut.mutateAsync({ id, payload });

      // Delete removed existing images
      for (const imgId of deletedImageIds) {
        try {
          await deleteImgMut.mutateAsync({ imageId: imgId, reportId: id });
        } catch {
          // Best-effort — continue with other operations
        }
      }

      // Upload new photos
      const newPhotos = photos.filter((p) => !p.isExisting);
      if (newPhotos.length > 0) {
        const uploadItems: ImageUploadItem[] = newPhotos.map((p) => ({
          uri: p.uri,
          description: p.description,
        }));
        await uploadMut.mutateAsync({ reportId: id, images: uploadItems });
      }

      Toast.show({ type: "success", text1: "Report updated" });
      router.replace(`/(tabs)/reports/${id}` as any);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to update report",
        text2: err?.message?.slice(0, 100),
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    id, projectId, reportDate, scopeDescription, outstandingIssues, suggestions,
    workItems, nextItems, photos, deletedImageIds,
    updateMut, uploadMut, deleteImgMut, router,
  ]);

  // ── Loading / Error states ──────────────────────────────

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
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-2.5 rounded-xl bg-slate-100">
          <Text className="text-slate-700 font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Navbar */}
      <View className="bg-white border-b border-slate-200 flex-row items-center px-3" style={{ minHeight: 48 }}>
        <TouchableOpacity onPress={goBack} hitSlop={10}>
          <Ionicons name={step === 0 ? "close" : "arrow-back"} size={22} color={colors.black} />
        </TouchableOpacity>
        <Text className="ml-2 text-base font-semibold text-slate-900 flex-1">
          Edit Report
        </Text>
        <Text className="text-xs text-slate-400 mr-2">{report.report_code}</Text>
        <Text className="text-xs text-slate-400">
          {step + 1}/{TOTAL_STEPS}
        </Text>
      </View>

      {/* Step indicator */}
      <StepIndicator current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

      {/* Content */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <EditStepHeader
              projectId={projectId}
              selectedProject={selectedProject}
              reportDate={reportDate}
              scopeDescription={scopeDescription}
              onShowProjectPicker={() => setShowProjectPicker(true)}
              onDateChange={setReportDate}
              onScopeChange={setScopeDescription}
            />
          )}

          {step === 1 && (
            <EditStepWorkItems
              title="Work Done Today"
              subtitle="Update activities completed today"
              items={workItems}
              percentLabel="Today %"
              onUpdate={(k, f, v) => updateWorkItem(workItems, setWorkItems, k, f, v)}
              onAdd={() => addWorkItem(workItems, setWorkItems)}
              onRemove={(k) => removeWorkItem(workItems, setWorkItems, k)}
            />
          )}

          {step === 2 && (
            <EditStepWorkItems
              title="Next Activities"
              subtitle="Update planned work activities"
              items={nextItems}
              percentLabel="Planned %"
              onUpdate={(k, f, v) => updateWorkItem(nextItems, setNextItems, k, f, v)}
              onAdd={() => addWorkItem(nextItems, setNextItems)}
              onRemove={(k) => removeWorkItem(nextItems, setNextItems, k)}
            />
          )}

          {step === 3 && (
            <EditStepIssues
              outstandingIssues={outstandingIssues}
              suggestions={suggestions}
              onIssuesChange={setOutstandingIssues}
              onSuggestionsChange={setSuggestions}
            />
          )}

          {step === 4 && (
            <EditStepPhotos
              photos={photos}
              onCamera={handleCamera}
              onGallery={handleGallery}
              onRemove={removePhoto}
              onUpdateDesc={updatePhotoDesc}
            />
          )}

          {step === 5 && (
            <EditStepReview
              selectedProject={selectedProject}
              reportDate={reportDate}
              scopeDescription={scopeDescription}
              workItems={workItems}
              nextItems={nextItems}
              outstandingIssues={outstandingIssues}
              suggestions={suggestions}
              photos={photos}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View className="bg-white border-t border-slate-200 px-4 py-3 flex-row items-center">
        {step > 0 ? (
          <TouchableOpacity
            onPress={goBack}
            className="flex-row items-center px-5 py-3 rounded-xl bg-slate-100 mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={colors.slate700} />
            <Text className="text-slate-700 font-semibold ml-1.5">Back</Text>
          </TouchableOpacity>
        ) : <View className="flex-1" />}

        {step < TOTAL_STEPS - 1 ? (
          <TouchableOpacity
            onPress={goNext}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
            style={{ backgroundColor: canProceed(step) ? ACCENT : colors.slate300 }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold mr-1.5">Next</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmit}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
            style={{ backgroundColor: submitting ? colors.slate400 : ACCENT }}
            activeOpacity={0.8}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text className="text-white font-bold ml-2">Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Project picker */}
      {showProjectPicker && (
        <ProjectPickerModal
          projects={projects ?? []}
          selected={projectId}
          onSelect={(pid) => {
            setProjectId(pid);
            setShowProjectPicker(false);
          }}
          onClose={() => setShowProjectPicker(false)}
        />
      )}
    </View>
  );
}

// ─── Step indicator (same as create) ────────────────────────────────────

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <View className="bg-white px-4 py-3 border-b border-slate-100">
      <View className="flex-row items-center justify-between mb-2">
        {Array.from({ length: total }).map((_, idx) => (
          <View key={idx} className="flex-row items-center flex-1">
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{
                backgroundColor:
                  idx < current ? colors.success : idx === current ? ACCENT : colors.slate200,
              }}
            >
              {idx < current ? (
                <Ionicons name="checkmark" size={14} color="#FFF" />
              ) : (
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: idx === current ? "#FFF" : colors.slate500 }}
                >
                  {idx + 1}
                </Text>
              )}
            </View>
            {idx < total - 1 ? (
              <View
                className="flex-1 h-0.5 mx-1"
                style={{ backgroundColor: idx < current ? colors.success : colors.slate200 }}
              />
            ) : null}
          </View>
        ))}
      </View>
      <Text className="text-xs font-semibold text-center" style={{ color: ACCENT }}>
        {labels[current]}
      </Text>
    </View>
  );
}

// ─── Step sub-components (mirroring Create but with "Edit" titles) ──────
// They share the same structure as the Create screen's steps.

function EditStepHeader({
  projectId,
  selectedProject,
  reportDate,
  scopeDescription,
  onShowProjectPicker,
  onDateChange,
  onScopeChange,
}: {
  projectId?: number;
  selectedProject?: ReportProject;
  reportDate: string;
  scopeDescription: string;
  onShowProjectPicker: () => void;
  onDateChange: (v: string) => void;
  onScopeChange: (v: string) => void;
}) {
  return (
    <View>
      <Text className="text-lg font-bold text-slate-900 mb-1">Report Details</Text>
      <Text className="text-sm text-slate-500 mb-4">Update report header information.</Text>

      <FieldLabel label="Project" required />
      <TouchableOpacity
        onPress={onShowProjectPicker}
        className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex-row items-center mb-4"
        activeOpacity={0.7}
      >
        <Ionicons name="folder-outline" size={18} color={colors.slate500} />
        <Text
          className={`flex-1 ml-2.5 text-sm ${selectedProject ? "text-slate-900 font-medium" : "text-slate-400"}`}
          numberOfLines={1}
        >
          {selectedProject ? selectedProject.name : "Select a project…"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.slate400} />
      </TouchableOpacity>

      <FieldLabel label="Report Date" required />
      <View className="mb-4">
        <DateInput
          value={reportDate}
          onChange={onDateChange}
          mode="date"
          placeholder="Pick report date"
        />
      </View>

      <FieldLabel label="Scope Description" />
      <TextInput
        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 min-h-[100px]"
        value={scopeDescription}
        onChangeText={onScopeChange}
        placeholder="Describe the scope of work…"
        placeholderTextColor={colors.slate400}
        multiline
        textAlignVertical="top"
        style={isArabic(scopeDescription) ? { writingDirection: "rtl", textAlign: "right" } : { writingDirection: "auto" }}
      />
    </View>
  );
}

function EditStepWorkItems({
  title,
  subtitle,
  items,
  percentLabel,
  onUpdate,
  onAdd,
  onRemove,
}: {
  title: string;
  subtitle: string;
  items: WorkItemDraft[];
  percentLabel: string;
  onUpdate: (key: string, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <View>
      <Text className="text-lg font-bold text-slate-900 mb-1">{title}</Text>
      <Text className="text-sm text-slate-500 mb-4">{subtitle}</Text>

      {items.map((item, idx) => (
        <EditWorkItemCard
          key={item.key}
          item={item}
          index={idx}
          percentLabel={percentLabel}
          canRemove={items.length > 1}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}

      <TouchableOpacity
        onPress={onAdd}
        className="flex-row items-center justify-center py-3.5 rounded-xl border-2 border-dashed border-slate-300 mt-2"
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
        <Text className="text-sm font-semibold ml-2" style={{ color: ACCENT }}>
          Add Item
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EditWorkItemCard({
  item,
  index,
  percentLabel,
  canRemove,
  onUpdate,
  onRemove,
}: {
  item: WorkItemDraft;
  index: number;
  percentLabel: string;
  canRemove: boolean;
  onUpdate: (key: string, field: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 border border-slate-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View
            className="w-7 h-7 rounded-lg items-center justify-center"
            style={{ backgroundColor: colors.primaryBg }}
          >
            <Text className="text-xs font-bold" style={{ color: ACCENT }}>{index + 1}</Text>
          </View>
          <Text className="text-sm font-semibold text-slate-900 ml-2">Item {index + 1}</Text>
        </View>
        {canRemove ? (
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Remove Item", "Delete this work item?", [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => onRemove(item.key) },
              ])
            }
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <FieldLabel label="Location" small />
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
            value={item.location}
            onChangeText={(v) => onUpdate(item.key, "location", v)}
            placeholder="Zone / Area"
            placeholderTextColor={colors.slate400}
            style={isArabic(item.location) ? { writingDirection: "rtl" } : undefined}
          />
        </View>
        <View style={{ width: 90 }}>
          <FieldLabel label="Item #" small />
          <TextInput
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
            value={item.item_no}
            onChangeText={(v) => onUpdate(item.key, "item_no", v)}
            placeholder="3.1"
            placeholderTextColor={colors.slate400}
          />
        </View>
      </View>

      <FieldLabel label="Description" small />
      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 mb-3"
        value={item.description}
        onChangeText={(v) => onUpdate(item.key, "description", v)}
        placeholder="Describe the work…"
        placeholderTextColor={colors.slate400}
        multiline
        numberOfLines={2}
        style={isArabic(item.description) ? { writingDirection: "rtl", textAlign: "right" } : undefined}
      />

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <FieldLabel label={percentLabel} small />
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            <TextInput
              className="flex-1 text-sm text-slate-900"
              value={item.percent}
              onChangeText={(v) => onUpdate(item.key, "percent", v.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={colors.slate400}
            />
            <Text className="text-sm text-slate-500">%</Text>
          </View>
        </View>
        <View className="flex-1">
          <FieldLabel label="Overall %" small />
          <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            <TextInput
              className="flex-1 text-sm text-slate-900"
              value={item.overall_percent}
              onChangeText={(v) => onUpdate(item.key, "overall_percent", v.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              maxLength={3}
              placeholder="0"
              placeholderTextColor={colors.slate400}
            />
            <Text className="text-sm text-slate-500">%</Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-slate-600">Submitted for approval?</Text>
        <TouchableOpacity
          onPress={() =>
            onUpdate(item.key, "submission_status", item.submission_status === "yes" ? "no" : "yes")
          }
          className="flex-row items-center px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: item.submission_status === "yes" ? colors.successBg : colors.slate100,
          }}
          activeOpacity={0.7}
        >
          <View
            className="w-4 h-4 rounded-full mr-1.5 items-center justify-center"
            style={{
              backgroundColor: item.submission_status === "yes" ? colors.success : colors.slate300,
            }}
          >
            {item.submission_status === "yes" ? (
              <Ionicons name="checkmark" size={10} color="#FFF" />
            ) : null}
          </View>
          <Text
            className="text-xs font-semibold"
            style={{ color: item.submission_status === "yes" ? colors.success : colors.slate500 }}
          >
            {item.submission_status === "yes" ? "Yes" : "No"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EditStepIssues({
  outstandingIssues,
  suggestions,
  onIssuesChange,
  onSuggestionsChange,
}: {
  outstandingIssues: string;
  suggestions: string;
  onIssuesChange: (v: string) => void;
  onSuggestionsChange: (v: string) => void;
}) {
  return (
    <View>
      <Text className="text-lg font-bold text-slate-900 mb-1">Issues & Suggestions</Text>
      <Text className="text-sm text-slate-500 mb-4">Update blockers or improvement ideas.</Text>

      <FieldLabel label="Outstanding Issues" />
      <TextInput
        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 mb-4 min-h-[120px]"
        value={outstandingIssues}
        onChangeText={onIssuesChange}
        placeholder="List any outstanding issues…"
        placeholderTextColor={colors.slate400}
        multiline
        textAlignVertical="top"
        style={isArabic(outstandingIssues) ? { writingDirection: "rtl", textAlign: "right" } : { writingDirection: "auto" }}
      />

      <FieldLabel label="Suggestions" />
      <TextInput
        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 min-h-[120px]"
        value={suggestions}
        onChangeText={onSuggestionsChange}
        placeholder="Any suggestions for improvement…"
        placeholderTextColor={colors.slate400}
        multiline
        textAlignVertical="top"
        style={isArabic(suggestions) ? { writingDirection: "rtl", textAlign: "right" } : { writingDirection: "auto" }}
      />
    </View>
  );
}

function EditStepPhotos({
  photos,
  onCamera,
  onGallery,
  onRemove,
  onUpdateDesc,
}: {
  photos: PhotoDraft[];
  onCamera: () => void;
  onGallery: () => void;
  onRemove: (key: string) => void;
  onUpdateDesc: (key: string, desc: string) => void;
}) {
  return (
    <View>
      <Text className="text-lg font-bold text-slate-900 mb-1">Site Photos</Text>
      <Text className="text-sm text-slate-500 mb-4">
        Manage photos. Existing photos will be kept unless removed.
      </Text>

      <View className="flex-row gap-3 mb-4">
        <TouchableOpacity
          onPress={onCamera}
          className="flex-1 flex-row items-center justify-center py-4 rounded-xl"
          style={{ backgroundColor: ACCENT }}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={22} color="#FFF" />
          <Text className="text-white font-bold ml-2">Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onGallery}
          className="flex-1 flex-row items-center justify-center py-4 rounded-xl bg-slate-100"
          activeOpacity={0.7}
        >
          <Ionicons name="images-outline" size={22} color={colors.slate700} />
          <Text className="text-slate-700 font-semibold ml-2">Gallery</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <View className="items-center py-10">
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: colors.primaryBg }}
          >
            <Ionicons name="camera-outline" size={30} color={ACCENT} />
          </View>
          <Text className="text-slate-500 text-sm text-center">
            No photos. Tap Camera to add new ones.
          </Text>
        </View>
      ) : (
        photos.map((photo, idx) => (
          <View key={photo.key} className="bg-white rounded-xl mb-3 border border-slate-100 overflow-hidden shadow-sm">
            <View className="flex-row">
              <Image
                source={{ uri: photo.uri }}
                style={{ width: 100, height: 100 }}
                resizeMode="cover"
              />
              <View className="flex-1 p-3">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Text className="text-xs font-semibold text-slate-500">
                      Photo {idx + 1}
                    </Text>
                    {photo.isExisting ? (
                      <View className="ml-2 bg-blue-50 px-1.5 py-0.5 rounded">
                        <Text className="text-[9px] font-semibold text-blue-600">Existing</Text>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("Remove Photo", "Delete this photo?", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Remove", style: "destructive", onPress: () => onRemove(photo.key) },
                      ])
                    }
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900"
                  value={photo.description}
                  onChangeText={(v) => onUpdateDesc(photo.key, v)}
                  placeholder="Description…"
                  placeholderTextColor={colors.slate400}
                  multiline
                  numberOfLines={2}
                  style={isArabic(photo.description) ? { writingDirection: "rtl" } : undefined}
                />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function EditStepReview({
  selectedProject,
  reportDate,
  scopeDescription,
  workItems,
  nextItems,
  outstandingIssues,
  suggestions,
  photos,
}: {
  selectedProject?: ReportProject;
  reportDate: string;
  scopeDescription: string;
  workItems: WorkItemDraft[];
  nextItems: WorkItemDraft[];
  outstandingIssues: string;
  suggestions: string;
  photos: PhotoDraft[];
}) {
  const validWork = workItems.filter((w) => w.description.trim());
  const validNext = nextItems.filter((n) => n.description.trim());

  return (
    <View>
      <Text className="text-lg font-bold text-slate-900 mb-1">Review Changes</Text>
      <Text className="text-sm text-slate-500 mb-4">
        Confirm your changes before saving.
      </Text>

      <ReviewSection title="Report Details" icon="document-text-outline">
        <ReviewRow label="Project" value={selectedProject?.name ?? "—"} />
        <ReviewRow label="Date" value={reportDate} />
        {scopeDescription ? <ReviewRow label="Scope" value={scopeDescription} multiline /> : null}
      </ReviewSection>

      <ReviewSection title="Work Done" icon="hammer-outline" count={validWork.length}>
        {validWork.length === 0 ? (
          <Text className="text-xs text-slate-400 italic">No items</Text>
        ) : (
          validWork.map((w) => (
            <View key={w.key} className="bg-slate-50 rounded-lg p-2.5 mb-1.5">
              <Text className="text-xs font-semibold text-slate-800" numberOfLines={2}>
                {w.item_no ? `#${w.item_no} — ` : ""}{w.description || "—"}
              </Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">
                {w.location || "—"} · Today: {w.percent}% · Overall: {w.overall_percent}%
              </Text>
            </View>
          ))
        )}
      </ReviewSection>

      <ReviewSection title="Next Activities" icon="arrow-forward-outline" count={validNext.length}>
        {validNext.length === 0 ? (
          <Text className="text-xs text-slate-400 italic">No items</Text>
        ) : (
          validNext.map((n) => (
            <View key={n.key} className="bg-slate-50 rounded-lg p-2.5 mb-1.5">
              <Text className="text-xs font-semibold text-slate-800" numberOfLines={2}>
                {n.item_no ? `#${n.item_no} — ` : ""}{n.description || "—"}
              </Text>
              <Text className="text-[10px] text-slate-500 mt-0.5">
                {n.location || "—"} · Planned: {n.percent}% · Overall: {n.overall_percent}%
              </Text>
            </View>
          ))
        )}
      </ReviewSection>

      {(outstandingIssues || suggestions) ? (
        <ReviewSection title="Issues & Suggestions" icon="alert-circle-outline">
          {outstandingIssues ? <ReviewRow label="Issues" value={outstandingIssues} multiline /> : null}
          {suggestions ? <ReviewRow label="Suggestions" value={suggestions} multiline /> : null}
        </ReviewSection>
      ) : null}

      {photos.length > 0 ? (
        <ReviewSection title="Photos" icon="camera-outline" count={photos.length}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {photos.map((p) => (
              <Image
                key={p.key}
                source={{ uri: p.uri }}
                style={{ width: 64, height: 64, borderRadius: 8 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </ReviewSection>
      ) : null}
    </View>
  );
}

// ─── Shared components ──────────────────────────────────────────────────

function FieldLabel({ label, required, small }: { label: string; required?: boolean; small?: boolean }) {
  return (
    <Text className={`${small ? "text-xs" : "text-sm"} font-medium text-slate-700 mb-1.5`}>
      {label}
      {required ? <Text style={{ color: colors.error }}> *</Text> : null}
    </Text>
  );
}

function ReviewSection({
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
    <View className="bg-white rounded-xl p-4 mb-3 border border-slate-100 shadow-sm">
      <View className="flex-row items-center mb-2.5">
        <Ionicons name={icon} size={14} color={ACCENT} />
        <Text className="text-sm font-semibold text-slate-900 ml-1.5 flex-1">{title}</Text>
        {count != null ? (
          <View className="bg-slate-100 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-bold text-slate-600">{count}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ReviewRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View className={`${multiline ? "" : "flex-row items-center justify-between"} mb-1.5`}>
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text
        className={`text-xs font-medium text-slate-800 ${multiline ? "mt-0.5" : ""}`}
        numberOfLines={multiline ? 5 : 1}
        style={rtlTextStyle(value)}
      >
        {value}
      </Text>
    </View>
  );
}

function ProjectPickerModal({
  projects,
  selected,
  onSelect,
  onClose,
}: {
  projects: ReportProject[];
  selected?: number;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(
    () =>
      filter
        ? projects.filter(
            (p) =>
              p.name.toLowerCase().includes(filter.toLowerCase()) ||
              (p.client_name ?? "").toLowerCase().includes(filter.toLowerCase())
          )
        : projects,
    [projects, filter]
  );

  return (
    <Pressable
      className="absolute inset-0 bg-black/40"
      onPress={onClose}
      style={{ zIndex: 50 }}
    >
      <Pressable
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
        style={{ maxHeight: "75%" }}
        onPress={(e) => e.stopPropagation()}
      >
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-slate-300" />
        </View>
        <View className="px-4 pb-2">
          <Text className="text-lg font-bold text-slate-900 mb-2">Select Project</Text>
          <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2">
            <Ionicons name="search-outline" size={16} color={colors.slate400} />
            <TextInput
              className="flex-1 ml-2 text-sm text-slate-900"
              placeholder="Search projects…"
              placeholderTextColor={colors.slate400}
              value={filter}
              onChangeText={setFilter}
              autoFocus
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item: p }) => {
            const active = selected === p.id;
            return (
              <TouchableOpacity
                onPress={() => onSelect(p.id)}
                className="flex-row items-center px-4 py-3 border-b border-slate-50"
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: active ? ACCENT : colors.slate100 }}
                >
                  <Ionicons name="folder-outline" size={16} color={active ? "#FFF" : colors.slate500} />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-medium"
                    style={{ color: active ? ACCENT : colors.slate700 }}
                    numberOfLines={1}
                  >
                    {p.name}
                  </Text>
                  {p.client_name ? (
                    <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                      {p.client_name}
                    </Text>
                  ) : null}
                </View>
                {active && <Ionicons name="checkmark" size={18} color={ACCENT} />}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </Pressable>
    </Pressable>
  );
}
