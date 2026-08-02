import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiRequest } from "@/lib/api";
import { DateInput } from "./DateInput";

type Props = {
  row?: Record<string, any> | null;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

type Option = { id: string; label: string; raw?: any };
type PickerState = {
  title: string;
  field: string;
  options: Option[];
  multiple?: boolean;
} | null;

const ACCENT = "#0F766E";
const CLASSIFICATIONS = ["Site Visit", "Gate Pass"];
const DURATIONS = [
  "Short Term Entry Pass",
  "Long Term Entry Pass",
  "One Day Entry Pass",
];

export function GatepassRequestEditor({ row, values, onChange }: Props) {
  const { width } = useWindowDimensions();
  const twoColumn = width >= 390;
  const [picker, setPicker] = useState<PickerState>(null);
  const gatePass = values.request_classification === "Gate Pass";

  const optionsQuery = useQuery({
    queryKey: ["crud", "gatepass-request", "options"],
    queryFn: () => apiRequest("gatepass_api/requests/options"),
    staleTime: 15 * 60 * 1000,
  });
  const data = optionsQuery.data?.data || {};
  const projects = optionRows(
    data.projects,
    (r) => r.id,
    (r) => r.name,
  );
  const opportunities = optionRows(
    data.opportunities,
    (r) => r.id,
    (r) => r.name,
  );
  const staff = optionRows(
    data.staff,
    (r) => r.id,
    (r) => r.name,
  );
  const vehicles = optionRows(
    data.vehicles,
    (r) => r.id,
    (r) => r.name,
  );
  const related = values.rel_type === "opportunity" ? opportunities : projects;
  const responsibleNames = useMemo(
    () =>
      (Array.isArray(data.responsibles) ? data.responsibles : [])
        .filter((item: any) => item.type === values.rel_type)
        .map((item: any) => item.staff_name)
        .filter(Boolean)
        .join(", "),
    [data.responsibles, values.rel_type],
  );

  const setClassification = (classification: string) => {
    onChange("request_classification", classification);
    if (classification === "Site Visit") {
      for (const field of [
        "po_number",
        "work_location",
        "stations",
        "substation",
        "work_details",
        "representative_id",
        "staff_id",
        "vehicle_id",
      ]) {
        onChange(field, "");
      }
    }
  };

  const setRelationType = (type: string) => {
    onChange("rel_type", type);
    onChange("rel_id", "");
  };

  return (
    <View className="mb-3">
      <View className="rounded-3xl bg-slate-950 p-4 mb-3 overflow-hidden">
        <View className="flex-row items-start">
          <View className="w-12 h-12 rounded-2xl bg-teal-500/20 items-center justify-center mr-3">
            <Ionicons name="clipboard-outline" size={24} color="#5EEAD4" />
          </View>
          <View className="flex-1">
            <Text
              className="text-[10px] font-bold uppercase tracking-[1.4px]"
              style={{ color: "#5EEAD4" }}
            >
              Gate Pass Request Workspace
            </Text>
            <Text
              className="text-white text-lg font-bold mt-0.5"
              numberOfLines={1}
            >
              {row?.display_number || "New access request"}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">
              Identity, validity, work scope and access roster in one view
            </Text>
          </View>
          {optionsQuery.isFetching ? (
            <ActivityIndicator color="#5EEAD4" />
          ) : null}
        </View>
        <View className="flex-row gap-2 mt-4">
          <Metric
            value={values.request_classification || "Choose type"}
            label="Request type"
          />
          <Metric
            value={values.rel_type ? humanize(values.rel_type) : "Not linked"}
            label="Context"
          />
          <Metric value={values.duration_to || "No date"} label="Valid until" />
        </View>
      </View>

      <SectionTitle
        title="Request identity"
        hint="Choose the access workflow"
      />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <View className="p-3">
          <Text className="text-[9px] uppercase tracking-wide text-slate-400 mb-2">
            Request type *
          </Text>
          <View className="flex-row gap-2">
            {CLASSIFICATIONS.map((classification) => {
              const active = values.request_classification === classification;
              return (
                <TouchableOpacity
                  key={classification}
                  onPress={() => setClassification(classification)}
                  className={`flex-1 rounded-xl px-3 py-2.5 flex-row items-center justify-center border ${active ? "bg-teal-50 border-teal-300" : "bg-slate-50 border-slate-200"}`}
                >
                  <Ionicons
                    name={
                      classification === "Gate Pass"
                        ? "shield-checkmark-outline"
                        : "eye-outline"
                    }
                    size={16}
                    color={active ? ACCENT : "#64748B"}
                  />
                  <Text
                    className={`text-xs font-bold ml-1.5 ${active ? "text-teal-800" : "text-slate-600"}`}
                  >
                    {classification}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View className="flex-row border-t border-slate-100">
          <ChoiceField
            label="Related type *"
            value={humanize(values.rel_type)}
            placeholder="Project / opportunity"
            onPress={() =>
              setPicker({
                title: "Related type",
                field: "rel_type",
                options: [
                  { id: "project", label: "Project" },
                  { id: "opportunity", label: "Opportunity" },
                ],
              })
            }
          />
          <ChoiceField
            label="Related record *"
            value={labelFor(related, values.rel_id)}
            placeholder={
              values.rel_type
                ? `Select ${values.rel_type}`
                : "Choose type first"
            }
            onPress={() =>
              values.rel_type &&
              setPicker({
                title: `Select ${humanize(values.rel_type)}`,
                field: "rel_id",
                options: related,
              })
            }
            bordered
            horizontal
          />
        </View>
        {responsibleNames ? (
          <View className="px-3 py-2.5 bg-teal-50 border-t border-teal-100 flex-row items-center">
            <Ionicons name="people-circle-outline" size={16} color={ACCENT} />
            <Text
              className="text-[10px] text-teal-800 ml-2 flex-1"
              numberOfLines={1}
            >
              Workflow owner · {responsibleNames}
            </Text>
          </View>
        ) : null}
      </View>

      <SectionTitle title="Validity" hint="Dates are inclusive" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <ChoiceField
          label="Duration type *"
          value={values.duration}
          placeholder="Select duration"
          onPress={() =>
            setPicker({
              title: "Duration type",
              field: "duration",
              options: DURATIONS.map((value) => ({ id: value, label: value })),
            })
          }
        />
        <View
          className={
            twoColumn
              ? "flex-row border-t border-slate-100"
              : "border-t border-slate-100"
          }
        >
          <FieldShell
            label="Valid from *"
            style={twoColumn ? { flex: 1 } : undefined}
          >
            <DateInput
              value={values.duration_from || ""}
              onChange={(value) => onChange("duration_from", value)}
              mode="date"
            />
          </FieldShell>
          <FieldShell
            label="Valid until *"
            className={
              twoColumn
                ? "border-l border-slate-100"
                : "border-t border-slate-100"
            }
            style={twoColumn ? { flex: 1 } : undefined}
          >
            <DateInput
              value={values.duration_to || ""}
              onChange={(value) => onChange("duration_to", value)}
              mode="date"
            />
          </FieldShell>
        </View>
      </View>

      {gatePass ? (
        <>
          <SectionTitle
            title="Work authorization"
            hint="Required for Gate Pass"
          />
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            <View className={twoColumn ? "flex-row" : ""}>
              <InputField
                label="RFX / PO number *"
                value={values.po_number}
                placeholder="Commercial reference"
                onChange={(value: string) => onChange("po_number", value)}
                style={twoColumn ? { flex: 1 } : undefined}
              />
              <InputField
                label="Work location *"
                value={values.work_location}
                placeholder="Site / area"
                onChange={(value: string) => onChange("work_location", value)}
                className={
                  twoColumn
                    ? "border-l border-slate-100"
                    : "border-t border-slate-100"
                }
                style={twoColumn ? { flex: 1 } : undefined}
              />
            </View>
            <View className="flex-row border-t border-slate-100">
              <InputField
                label="Stations *"
                value={values.stations}
                placeholder="Station(s)"
                onChange={(value: string) => onChange("stations", value)}
                style={{ flex: 1 }}
              />
              <InputField
                label="Substations *"
                value={values.substation}
                placeholder="Substation(s)"
                onChange={(value: string) => onChange("substation", value)}
                className="border-l border-slate-100"
                style={{ flex: 1 }}
              />
            </View>
            <View className="px-3 py-3 border-t border-slate-100">
              <View className="flex-row items-center">
                <Text className="text-[9px] uppercase tracking-wide text-slate-400 flex-1">
                  Work details * · 120 characters
                </Text>
                <Text
                  className={`text-[9px] ${values.work_details.length > 120 ? "text-red-600" : "text-slate-400"}`}
                >
                  {values.work_details.length}/120
                </Text>
              </View>
              <TextInput
                value={values.work_details || ""}
                onChangeText={(value) =>
                  onChange("work_details", value.slice(0, 120))
                }
                placeholder="Describe the work scope precisely"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                className="min-h-[58px] text-sm text-slate-900 pt-1.5"
              />
            </View>
          </View>

          <SectionTitle
            title="People & vehicles"
            hint="Compact access roster"
          />
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            <ChoiceField
              label="Representative employee *"
              value={labelFor(staff, values.representative_id)}
              placeholder="Select representative"
              onPress={() =>
                setPicker({
                  title: "Representative employee",
                  field: "representative_id",
                  options: staff,
                })
              }
            />
            <ChoiceField
              label="People involved *"
              value={multiLabel(staff, values.staff_id)}
              placeholder="Select one or more employees"
              onPress={() =>
                setPicker({
                  title: "People involved",
                  field: "staff_id",
                  options: staff,
                  multiple: true,
                })
              }
              bordered
            />
            <ChoiceField
              label="Vehicles"
              value={multiLabel(vehicles, values.vehicle_id)}
              placeholder="Optional vehicles"
              onPress={() =>
                setPicker({
                  title: "Vehicles",
                  field: "vehicle_id",
                  options: vehicles,
                  multiple: true,
                })
              }
              bordered
            />
          </View>
        </>
      ) : values.request_classification === "Site Visit" ? (
        <View className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 flex-row items-start">
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#0369A1"
          />
          <View className="ml-2.5 flex-1">
            <Text className="text-xs font-bold text-sky-900">
              Site Visit keeps the request lean
            </Text>
            <Text className="text-[11px] text-sky-700 mt-1 leading-4">
              Work authorization, representative, staff and vehicles are not
              required for this classification.
            </Text>
          </View>
        </View>
      ) : null}

      {optionsQuery.isError ? (
        <Text className="text-xs text-red-600 px-2 mt-2">
          Reference options could not be loaded. Pull back and retry before
          saving.
        </Text>
      ) : null}

      <OptionPicker
        state={picker}
        selected={picker ? values[picker.field] || "" : ""}
        onClose={() => setPicker(null)}
        onPick={(value) => {
          if (picker?.field === "rel_type") setRelationType(value);
          else if (picker) onChange(picker.field, value);
          setPicker(null);
        }}
      />
    </View>
  );
}

function OptionPicker({
  state,
  selected,
  onClose,
  onPick,
}: {
  state: PickerState;
  selected: string;
  onClose: () => void;
  onPick: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[] | null>(null);
  const visible = !!state;
  const current = state?.multiple ? (draft ?? parseIds(selected)) : [];
  const filtered = (state?.options || []).filter(
    (option) =>
      !search.trim() ||
      option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const close = () => {
    setSearch("");
    setDraft(null);
    onClose();
  };
  const toggle = (id: string) =>
    setDraft((previous) => {
      const base = previous ?? parseIds(selected);
      return base.includes(id)
        ? base.filter((value) => value !== id)
        : [...base, id];
    });
  const commit = (value: string) => {
    setDraft(null);
    setSearch("");
    onPick(value);
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="bg-white px-4 py-3 flex-row items-center border-b border-slate-100">
          <TouchableOpacity onPress={close}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-lg font-bold text-slate-900 flex-1">
            {state?.title || "Select"}
          </Text>
          {state?.multiple ? (
            <TouchableOpacity
              onPress={() => commit(current.join(","))}
              className="rounded-xl bg-teal-700 px-3 py-2"
            >
              <Text className="text-xs font-bold text-white">
                Done · {current.length}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View className="m-3 bg-white rounded-xl border border-slate-200 px-3 h-11 flex-row items-center">
          <Ionicons name="search-outline" size={17} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#94A3B8"
            autoFocus
            className="flex-1 ml-2 text-slate-900"
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = state?.multiple
              ? current.includes(item.id)
              : item.id === selected;
            return (
              <TouchableOpacity
                onPress={() =>
                  state?.multiple ? toggle(item.id) : commit(item.id)
                }
                className="bg-white border-b border-slate-100 px-4 py-3.5 flex-row items-center"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-slate-900">
                    {item.label}
                  </Text>
                </View>
                {active ? (
                  <Ionicons
                    name={state?.multiple ? "checkbox" : "checkmark-circle"}
                    size={21}
                    color={ACCENT}
                  />
                ) : (
                  <Ionicons
                    name={
                      state?.multiple ? "square-outline" : "ellipse-outline"
                    }
                    size={20}
                    color="#CBD5E1"
                  />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text className="text-slate-500 text-center mt-10">
              No matching records
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

function ChoiceField({
  label,
  value,
  placeholder,
  onPress,
  bordered,
  horizontal,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  bordered?: boolean;
  horizontal?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 px-3 py-2.5 ${bordered ? (horizontal ? "border-l border-slate-100" : "border-t border-slate-100") : ""}`}
      activeOpacity={0.7}
    >
      <Text className="text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </Text>
      <View className="h-8 flex-row items-center">
        <Text
          className={`flex-1 text-xs ${value ? "font-semibold text-slate-900" : "text-slate-400"}`}
          numberOfLines={2}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={15} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
}
function InputField({
  label,
  value,
  placeholder,
  onChange,
  className = "",
  style,
}: any) {
  return (
    <View className={`px-3 py-2.5 ${className}`} style={style}>
      <Text className="text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </Text>
      <TextInput
        value={value || ""}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="text-sm text-slate-900 py-1"
      />
    </View>
  );
}
function FieldShell({ label, className = "", style, children }: any) {
  return (
    <View className={`px-3 py-2.5 ${className}`} style={style}>
      <Text className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
        {label}
      </Text>
      {children}
    </View>
  );
}
function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <View className="px-2 mb-1.5 flex-row items-center justify-between">
      <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500">
        {title}
      </Text>
      <Text className="text-[10px] text-slate-400">{hint}</Text>
    </View>
  );
}
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
      <Text className="text-white text-[11px] font-bold" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-slate-500 text-[9px] mt-1">{label}</Text>
    </View>
  );
}
function optionRows(
  rows: any,
  id: (row: any) => any,
  label: (row: any) => any,
): Option[] {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: String(id(row)),
    label: String(label(row) || `#${id(row)}`),
    raw: row,
  }));
}
function labelFor(options: Option[], id: string): string {
  return (
    options.find((option) => option.id === String(id || ""))?.label ||
    (id ? `#${id}` : "")
  );
}
function parseIds(value: string): string[] {
  return String(value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
function multiLabel(options: Option[], value: string): string {
  const ids = parseIds(value);
  if (!ids.length) return "";
  const names = ids.map((id) => labelFor(options, id));
  return names.length <= 2
    ? names.join(", ")
    : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
function humanize(value: string): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
