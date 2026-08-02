import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { apiRequest } from "@/lib/api";
import { DateInput } from "./DateInput";

type Option = { value: string; label: string };
type ConfigResponse = {
  status: boolean;
  data: {
    targets: Option[];
    types: Option[];
    pdf_fields: string[];
    client_portal_fields: string[];
    client_editable_fields: string[];
  };
};

type Props = {
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

const CORE_TARGETS: Option[] = [
  ["company", "Company"], ["leads", "Leads"], ["customers", "Customers"],
  ["contacts", "Contacts"], ["staff", "Staff"], ["contracts", "Contracts"],
  ["tasks", "Tasks"], ["expenses", "Expenses"], ["invoice", "Invoices"],
  ["items", "Items"], ["credit_note", "Credit Notes"], ["estimate", "Estimates"],
  ["proposal", "Proposals"], ["projects", "Projects"], ["tickets", "Tickets"],
].map(([value, label]) => ({ value, label }));

const CORE_TYPES: Option[] = [
  ["input", "Input"], ["number", "Number"], ["textarea", "Textarea"],
  ["select", "Select"], ["multiselect", "Multi Select"], ["checkbox", "Checkbox"],
  ["date_picker", "Date Picker"], ["date_picker_time", "Datetime Picker"],
  ["colorpicker", "Color Picker"], ["link", "Hyperlink"],
].map(([value, label]) => ({ value, label }));

const PDF_FIELDS = ["estimate", "invoice", "credit_note", "items"];
const PORTAL_FIELDS = ["customers", "estimate", "invoice", "proposal", "contracts", "tasks", "projects", "contacts", "tickets", "company", "credit_note"];
const CLIENT_EDITABLE_FIELDS = ["customers", "contacts", "tasks"];

export function CustomFieldDefinitionEditor({ values, onChange }: Props) {
  const configQuery = useQuery({
    queryKey: ["custom-fields-admin", "config"],
    queryFn: () => apiRequest("custom_fields_admin_api/config") as Promise<ConfigResponse>,
    staleTime: 5 * 60 * 1000,
  });
  const config = configQuery.data?.data;
  const targets = config?.targets?.length ? config.targets : CORE_TARGETS;
  const types = config?.types?.length ? config.types : CORE_TYPES;
  const fieldto = values.fieldto || "";
  const type = values.type || "";
  const locked = truthy(values.locked_schema);
  const optionType = ["select", "multiselect", "checkbox"].includes(type);
  const portalFields = config?.client_portal_fields || PORTAL_FIELDS;
  const clientEditableFields = config?.client_editable_fields || CLIENT_EDITABLE_FIELDS;
  const pdfFields = config?.pdf_fields || PDF_FIELDS;
  const portalAllowed = portalFields.includes(fieldto);
  const clientEditable = clientEditableFields.includes(fieldto);
  const pdfAllowed = pdfFields.includes(fieldto);
  const onlyAdmin = truthy(values.only_admin);

  const pickTarget = (value: string) => {
    if (locked) return;
    onChange("fieldto", value);
    if (value === "company") {
      setSwitch(onChange, "required", false);
      setSwitch(onChange, "only_admin", false);
    }
    if (!pdfFields.includes(value)) setSwitch(onChange, "show_on_pdf", false);
    if (!portalFields.includes(value)) {
      setSwitch(onChange, "show_on_client_portal", false);
      setSwitch(onChange, "disalow_client_to_edit", false);
    }
    if (value !== "tickets") setSwitch(onChange, "show_on_ticket_form", false);
    if (value === "items" && type === "link") onChange("type", "");
  };

  const pickType = (value: string) => {
    if (locked || (fieldto === "items" && value === "link")) return;
    onChange("type", value);
    onChange("default_value", "");
    if (!["select", "multiselect", "checkbox"].includes(value)) onChange("options", "");
    if (value !== "checkbox") setSwitch(onChange, "display_inline", false);
  };

  return (
    <View className="mb-3">
      <View className="px-2 mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs text-muted uppercase tracking-wide">Field Definition</Text>
        <Text className="text-xs text-cyan-700 font-semibold">{locked ? "Schema locked" : "Editable schema"}</Text>
      </View>
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <View className="px-4 py-3 bg-cyan-50 border-b border-cyan-100 flex-row items-start">
          <Ionicons name={locked ? "lock-closed-outline" : "construct-outline"} size={19} color="#0E7490" />
          <View className="flex-1 ml-2">
            <Text className="text-cyan-900 text-xs font-semibold">
              {locked ? "Type and module are protected" : "Define once, use throughout the ERP"}
            </Text>
            <Text className="text-cyan-800 text-xs leading-4 mt-0.5">
              {locked
                ? "Saved record values exist. You can still rename and change layout or visibility."
                : "The module and field type become protected after the first value is saved."}
            </Text>
          </View>
        </View>

        <LabeledText label="Field name *" value={values.name || ""} onChange={(value) => onChange("name", value)} placeholder="Clear, user-facing label" />

        <ChoiceSection label="Belongs to *" options={targets} value={fieldto} onChange={pickTarget} locked={locked} />
        <ChoiceSection label="Field type *" options={types} value={type} onChange={pickType} locked={locked} disabledValue={fieldto === "items" ? "link" : undefined} />

        {optionType ? (
          <LabeledText
            label="Options *"
            value={values.options || ""}
            onChange={(value) => onChange("options", value)}
            placeholder="Option A, Option B, Option C"
            multiline
            help="Comma-separated. Options already saved on records cannot be removed."
          />
        ) : null}

        {type !== "link" ? (
          <View className="px-4 py-3 border-t border-gray-100">
            <Text className="text-xs text-muted mb-1">Default value</Text>
            {type === "date_picker" || type === "date_picker_time" ? (
              <DateInput
                value={values.default_value || ""}
                onChange={(value) => onChange("default_value", value)}
                mode={type === "date_picker_time" ? "datetime" : "date"}
                placeholder="Optional default"
              />
            ) : (
              <TextInput
                value={values.default_value || ""}
                onChangeText={(value) => onChange("default_value", value)}
                placeholder={defaultPlaceholder(type)}
                placeholderTextColor="#94A3B8"
                keyboardType={type === "number" ? "decimal-pad" : "default"}
                autoCapitalize="none"
                className="h-11 text-foreground bg-gray-50 rounded-xl px-3"
              />
            )}
          </View>
        ) : null}

        <View className="px-4 py-3 border-t border-gray-100">
          <Text className="text-xs text-muted mb-2">Layout</Text>
          <View className="flex-row">
            <CompactNumber label="Order" value={values.field_order || "0"} onChange={(value) => onChange("field_order", value)} />
            <View className="w-3" />
            <CompactNumber label="Column width (1–12)" value={values.bs_column || "12"} onChange={(value) => onChange("bs_column", value)} />
          </View>
        </View>

        <ToggleSection title="Behaviour">
          <Toggle label="Active" active={truthy(values.active)} onPress={() => toggle(onChange, values, "active")} />
          <Toggle label="Required" active={truthy(values.required)} disabled={fieldto === "company"} onPress={() => toggle(onChange, values, "required")} />
          <Toggle label="Admin only" active={onlyAdmin} disabled={fieldto === "company" || fieldto === "items"} onPress={() => {
            toggle(onChange, values, "only_admin");
            if (!onlyAdmin) {
              setSwitch(onChange, "show_on_client_portal", false);
              setSwitch(onChange, "disalow_client_to_edit", false);
            }
          }} />
          {type === "checkbox" ? <Toggle label="Inline choices" active={truthy(values.display_inline)} onPress={() => toggle(onChange, values, "display_inline")} /> : null}
          {clientEditable ? <Toggle label="Prevent customer editing" active={truthy(values.disalow_client_to_edit)} disabled={onlyAdmin} onPress={() => toggle(onChange, values, "disalow_client_to_edit")} /> : null}
        </ToggleSection>

        <ToggleSection title="Visibility">
          <Toggle label="Show on table" active={truthy(values.show_on_table)} disabled={fieldto === "company" || fieldto === "items"} onPress={() => toggle(onChange, values, "show_on_table")} />
          {pdfAllowed ? <Toggle label="Show on PDF" active={truthy(values.show_on_pdf)} disabled={fieldto === "company" || fieldto === "items"} onPress={() => toggle(onChange, values, "show_on_pdf")} /> : null}
          {portalAllowed ? <Toggle label="Customer portal" active={truthy(values.show_on_client_portal)} disabled={onlyAdmin || fieldto === "company"} onPress={() => toggle(onChange, values, "show_on_client_portal")} /> : null}
          {fieldto === "tickets" ? <Toggle label="Ticket form" active={truthy(values.show_on_ticket_form)} onPress={() => toggle(onChange, values, "show_on_ticket_form")} /> : null}
        </ToggleSection>

        {configQuery.isError ? (
          <View className="px-4 py-3 border-t border-amber-100 bg-amber-50 flex-row items-start">
            <Ionicons name="warning-outline" size={17} color="#D97706" />
            <Text className="flex-1 text-amber-800 text-xs ml-2">Module extensions could not be loaded; core modules remain available.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function LabeledText({ label, value, onChange, placeholder, multiline = false, help }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; multiline?: boolean; help?: string }) {
  return (
    <View className="px-4 py-3 border-t border-gray-100">
      <Text className="text-xs text-muted mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`text-foreground bg-gray-50 rounded-xl px-3 ${multiline ? "min-h-[82px] py-3" : "h-11"}`}
      />
      {help ? <Text className="text-[11px] text-muted mt-1 leading-4">{help}</Text> : null}
    </View>
  );
}

function ChoiceSection({ label, options, value, onChange, locked, disabledValue }: { label: string; options: Option[]; value: string; onChange: (value: string) => void; locked: boolean; disabledValue?: string }) {
  return (
    <View className="px-4 py-3 border-t border-gray-100">
      <Text className="text-xs text-muted mb-2">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((option) => {
          const selected = option.value === value;
          const disabled = locked || option.value === disabledValue;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              disabled={disabled}
              className={`rounded-full border px-3 py-1.5 mr-2 mb-2 ${selected ? "bg-cyan-700 border-cyan-700" : disabled ? "bg-gray-50 border-gray-100 opacity-50" : "bg-white border-gray-200"}`}
            >
              <Text className={`text-xs font-medium ${selected ? "text-white" : "text-foreground"}`}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function CompactNumber({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] text-muted mb-1">{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="number-pad" className="h-11 text-foreground bg-gray-50 rounded-xl px-3" />
    </View>
  );
}

function ToggleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="px-4 py-3 border-t border-gray-100">
      <Text className="text-xs text-muted mb-2">{title}</Text>
      <View className="flex-row flex-wrap">{children}</View>
    </View>
  );
}

function Toggle({ label, active, disabled = false, onPress }: { label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 mr-2 mb-2 ${disabled ? "bg-gray-50 border-gray-100 opacity-50" : active ? "bg-cyan-700 border-cyan-700" : "bg-white border-gray-200"}`}
    >
      <Text className={`text-xs font-medium ${active && !disabled ? "text-white" : "text-foreground"}`}>{label}: {active ? "Yes" : "No"}</Text>
    </TouchableOpacity>
  );
}

function truthy(value: string | undefined): boolean {
  return ["1", "on", "true", "yes"].includes(String(value || "").toLowerCase());
}

function setSwitch(onChange: Props["onChange"], field: string, active: boolean) {
  onChange(field, active ? "on" : "");
}

function toggle(onChange: Props["onChange"], values: Props["values"], field: string) {
  setSwitch(onChange, field, !truthy(values[field]));
}

function defaultPlaceholder(type: string): string {
  if (type === "number") return "Optional number";
  if (type === "colorpicker") return "#RRGGBB";
  if (["select", "multiselect", "checkbox"].includes(type)) return "Must match an option above";
  return "Optional default";
}
