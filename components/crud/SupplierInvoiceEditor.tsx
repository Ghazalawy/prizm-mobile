import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import Toast from "react-native-toast-message";

import { apiRequest } from "@/lib/api";
import { DateInput } from "./DateInput";

type Props = {
  row?: Record<string, any> | null;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

type Option = { id: string; label: string; raw?: any };
type InvoiceLine = {
  id?: number;
  db_id?: number;
  supplier_item_code?: string;
  supplier_description?: string;
  supplier_unit?: string;
  supplier_qty?: number | string;
  supplier_unit_price?: number | string;
  supplier_total?: number | string;
  resource_item_id?: number | string | null;
  mapping_status?: string;
  is_deleted?: number;
};

const ACCENT = "#EA580C";

export function SupplierInvoiceEditor({ row, values, onChange }: Props) {
  const { width } = useWindowDimensions();
  const twoColumn = width >= 390;
  const [picker, setPicker] = useState<{ title: string; field: string; options: Option[]; onPick?: (option: Option) => void } | null>(null);
  const [suggestions, setSuggestions] = useState<Record<number, any[]>>({});
  const lines = useMemo(() => parseLines(values.items, row?.items), [row?.items, values.items]);

  const optionsQuery = useQuery({
    queryKey: ["crud", "supplier-invoice", "options"],
    queryFn: () => apiRequest("purchase_api/supplier_invoice_options"),
    staleTime: 15 * 60 * 1000,
  });
  const options = optionsQuery.data?.data || {};
  const suppliers = optionRows(options.suppliers, (r) => r.id, (r) => r.company);
  const orders = optionRows(options.orders, (r) => r.id, (r) => `${displayNumber(r, "PO-")} · ${r.title || "Purchase order"}`);
  const projects = optionRows(options.projects, (r) => r.id, (r) => r.name);
  const departments = optionRows(options.departments, (r) => r.departmentid, (r) => r.name);
  const currencies = optionRows(options.currencies, (r) => r.id, (r) => `${r.name}${r.symbol ? ` · ${r.symbol}` : ""}`);

  const setLines = (next: InvoiceLine[]) => onChange("items", JSON.stringify(next));
  const updateLine = (index: number, patch: Partial<InvoiceLine>) => {
    const next = lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line);
    const changed = next[index];
    if (patch.supplier_qty !== undefined || patch.supplier_unit_price !== undefined) {
      const quantity = numeric(changed.supplier_qty);
      const rate = numeric(changed.supplier_unit_price);
      changed.supplier_total = quantity * rate;
    }
    setLines(next);
    syncAmounts(next, values, onChange);
  };

  const importLines = useMutation({
    mutationFn: () => apiRequest(`purchase_api/supplier_invoices/po_items/${encodeURIComponent(values.po_id)}`),
    onSuccess: (response) => {
      const imported: InvoiceLine[] = (response?.data || []).map((item: any) => ({
        supplier_item_code: "",
        supplier_description: item.item_long_name || item.name || "",
        supplier_unit: item.item_unit || "",
        supplier_qty: item.qty ?? "",
        supplier_unit_price: item.rate ?? "",
        supplier_total: item.subtotal ?? numeric(item.qty) * numeric(item.rate),
        resource_item_id: item.resource_item_id || null,
        mapping_status: item.resource_item_id ? "suggested" : "unmapped",
      }));
      setLines([...lines.filter((line) => line.supplier_description), ...imported]);
      syncAmounts([...lines.filter((line) => line.supplier_description), ...imported], values, onChange);
      Toast.show({ type: "success", text1: `${imported.length} PO line${imported.length === 1 ? "" : "s"} imported` });
    },
    onError: (error: any) => Toast.show({ type: "error", text1: "Could not import PO lines", text2: error?.message }),
  });

  const findMatches = async (index: number) => {
    const line = lines[index];
    const query = new URLSearchParams({
      supplier_id: values.supplier_id || "",
      supplier_item_code: String(line.supplier_item_code || ""),
      supplier_description: String(line.supplier_description || ""),
    });
    try {
      const response = await apiRequest(`purchase_api/supplier_invoice_item_matches?${query.toString()}`);
      const found = Array.isArray(response?.data) ? response.data : [];
      setSuggestions((current) => ({ ...current, [index]: found }));
      if (!found.length) Toast.show({ type: "info", text1: "No prior catalog match", text2: "Keep the line unmapped for review." });
    } catch (error: any) {
      Toast.show({ type: "error", text1: "Catalog lookup failed", text2: error?.message });
    }
  };

  const selectPo = (option: Option) => {
    const po = option.raw || {};
    onChange("po_id", option.id);
    if (po.supplier_id) onChange("supplier_id", String(po.supplier_id));
    if (po.project_id) onChange("project_id", String(po.project_id));
    if (po.department_id) onChange("department_id", String(po.department_id));
    if (po.currency_id) onChange("currency_id", String(po.currency_id));
  };

  return (
    <View className="mb-3">
      <View className="rounded-3xl bg-slate-950 p-4 mb-3 overflow-hidden">
        <View className="flex-row items-start">
          <View className="w-12 h-12 rounded-2xl bg-orange-500/20 items-center justify-center mr-3">
            <Ionicons name="receipt-outline" size={24} color="#FDBA74" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: "#FDBA74" }}>Supplier Invoice Workspace</Text>
            <Text className="text-white text-lg font-bold mt-0.5" numberOfLines={1}>{row?.display_number || "New invoice"}</Text>
            <Text className="text-slate-400 text-xs mt-1">Header, commercial lines and mapping save together</Text>
          </View>
          {optionsQuery.isFetching ? <ActivityIndicator color="#FDBA74" /> : null}
        </View>
        <View className="flex-row gap-2 mt-4">
          <Metric value={String(lines.filter((line) => !line.is_deleted && line.supplier_description).length)} label="Lines" />
          <Metric value={money(sumLines(lines))} label="Line total" />
          <Metric value={money(numeric(values.grand_total))} label="Grand total" />
        </View>
      </View>

      <SectionTitle title="Identity & routing" hint="PO controls linked context" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <View className={twoColumn ? "flex-row" : ""}>
          <FieldShell label="Supplier *" style={twoColumn ? { flex: 1 } : undefined}>
            <PickerField value={labelFor(suppliers, values.supplier_id)} placeholder="Select supplier" onPress={() => setPicker({ title: "Select supplier", field: "supplier_id", options: suppliers })} />
          </FieldShell>
          <FieldShell label="Supplier invoice no. *" className={twoColumn ? "border-l border-slate-100" : "border-t border-slate-100"} style={twoColumn ? { flex: 1 } : undefined}>
            <CompactInput value={values.supplier_invoice_number} onChangeText={(value) => onChange("supplier_invoice_number", value)} placeholder="Vendor reference" />
          </FieldShell>
        </View>
        <FieldShell label="Purchase order" className="border-t border-slate-100">
          <PickerField value={labelFor(orders, values.po_id)} placeholder="Optional purchase order" onPress={() => setPicker({ title: "Select purchase order", field: "po_id", options: orders, onPick: selectPo })} />
        </FieldShell>
        <View className={twoColumn ? "flex-row border-t border-slate-100" : "border-t border-slate-100"}>
          <FieldShell label="Project" style={twoColumn ? { flex: 1 } : undefined}>
            <PickerField value={labelFor(projects, values.project_id)} placeholder="Select project" onPress={() => setPicker({ title: "Select project", field: "project_id", options: projects })} />
          </FieldShell>
          <FieldShell label="Department *" className={twoColumn ? "border-l border-slate-100" : "border-t border-slate-100"} style={twoColumn ? { flex: 1 } : undefined}>
            <PickerField value={labelFor(departments, values.department_id)} placeholder="Approval department" onPress={() => setPicker({ title: "Select department", field: "department_id", options: departments })} />
          </FieldShell>
        </View>
        <FieldShell label="Cost center" className="border-t border-slate-100">
          <CompactInput value={values.cost_center} onChangeText={(value) => onChange("cost_center", value)} placeholder="Optional cost allocation" />
        </FieldShell>
      </View>

      <SectionTitle title="Dates & commercial value" hint="Compact financial view" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <View className={twoColumn ? "flex-row" : ""}>
          <FieldShell label="Invoice date" style={twoColumn ? { flex: 1 } : undefined}><DateInput value={values.invoice_date || ""} onChange={(value) => onChange("invoice_date", value)} mode="date" /></FieldShell>
          <FieldShell label="Due date" className={twoColumn ? "border-l border-slate-100" : "border-t border-slate-100"} style={twoColumn ? { flex: 1 } : undefined}><DateInput value={values.due_date || ""} onChange={(value) => onChange("due_date", value)} mode="date" /></FieldShell>
        </View>
        <FieldShell label="Currency" className="border-t border-slate-100"><PickerField value={labelFor(currencies, values.currency_id)} placeholder="Select currency" onPress={() => setPicker({ title: "Select currency", field: "currency_id", options: currencies })} /></FieldShell>
        <View className="flex-row border-t border-slate-100">
          <MoneyField label="Subtotal" value={values.subtotal} onChange={(value: string) => onChange("subtotal", value)} />
          <MoneyField label="VAT" value={values.vat_amount} onChange={(value: string) => onChange("vat_amount", value)} bordered />
          <MoneyField label="Grand total" value={values.grand_total} onChange={(value: string) => onChange("grand_total", value)} bordered emphasis />
        </View>
      </View>

      <View className="px-2 mb-1.5 flex-row items-center">
        <View className="flex-1"><Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500">Invoice lines</Text><Text className="text-[10px] text-slate-400 mt-0.5">Supplier wording stays beside Resource Item mapping</Text></View>
        {values.po_id ? <TouchableOpacity onPress={() => importLines.mutate()} disabled={importLines.isPending} className="rounded-xl bg-orange-50 px-3 py-2 mr-2"><Text className="text-xs font-semibold text-orange-700">{importLines.isPending ? "Importing…" : "Import PO"}</Text></TouchableOpacity> : null}
        <TouchableOpacity onPress={() => setLines([...lines, { supplier_description: "", mapping_status: "unmapped" }])} className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: ACCENT }}><Ionicons name="add" size={20} color="#FFFFFF" /></TouchableOpacity>
      </View>
      <View className="mb-3">
        {lines.map((line, index) => line.is_deleted ? null : (
          <View key={`${line.db_id || line.id || "new"}-${index}`} className="bg-white rounded-2xl shadow-sm mb-2 overflow-hidden">
            <View className="px-3 py-2.5 bg-slate-50 flex-row items-center border-b border-slate-100">
              <View className="w-7 h-7 rounded-lg bg-orange-100 items-center justify-center mr-2"><Text className="text-xs font-bold text-orange-700">{index + 1}</Text></View>
              <Text className="flex-1 text-xs font-semibold text-slate-700" numberOfLines={1}>{line.supplier_description || "New invoice line"}</Text>
              <MappingBadge status={line.mapping_status} resourceId={line.resource_item_id} />
              <TouchableOpacity onPress={() => line.db_id || line.id ? updateLine(index, { is_deleted: 1 }) : setLines(lines.filter((_, i) => i !== index))} hitSlop={8} className="ml-2"><Ionicons name="trash-outline" size={17} color="#DC2626" /></TouchableOpacity>
            </View>
            <View className="flex-row">
              <LineInput label="Supplier code" value={line.supplier_item_code} onChange={(value: string) => updateLine(index, { supplier_item_code: value })} flex={4} />
              <LineInput label="Unit" value={line.supplier_unit} onChange={(value: string) => updateLine(index, { supplier_unit: value })} flex={2} bordered />
              <LineInput label="Qty" value={line.supplier_qty} onChange={(value: string) => updateLine(index, { supplier_qty: value })} flex={2} bordered numericInput />
            </View>
            <View className="border-t border-slate-100 px-3 py-2.5">
              <Text className="text-[9px] uppercase tracking-wide text-slate-400">Description</Text>
              <TextInput value={String(line.supplier_description || "")} onChangeText={(value) => updateLine(index, { supplier_description: value })} placeholder="Supplier's line description" placeholderTextColor="#94A3B8" className="text-sm text-slate-900 py-1" />
            </View>
            <View className="flex-row border-t border-slate-100">
              <LineInput label="Unit price" value={line.supplier_unit_price} onChange={(value: string) => updateLine(index, { supplier_unit_price: value })} flex={1} numericInput />
              <LineInput label="Line total" value={line.supplier_total} onChange={(value: string) => updateLine(index, { supplier_total: value })} flex={1} bordered numericInput emphasis />
            </View>
            <View className="border-t border-slate-100 px-3 py-2 flex-row items-center">
              <TouchableOpacity onPress={() => findMatches(index)} className="flex-row items-center rounded-lg bg-slate-100 px-2.5 py-1.5"><Ionicons name="git-compare-outline" size={14} color="#475569" /><Text className="text-[11px] font-semibold text-slate-700 ml-1.5">Find catalog match</Text></TouchableOpacity>
              {line.resource_item_id ? <TouchableOpacity onPress={() => updateLine(index, { resource_item_id: null, mapping_status: "unmapped" })} className="ml-2"><Text className="text-[11px] text-red-600">Unlink</Text></TouchableOpacity> : null}
            </View>
            {(suggestions[index] || []).length ? <View className="px-3 pb-3 bg-slate-50"><Text className="text-[9px] uppercase tracking-wide text-slate-400 py-2">Previous supplier-code matches</Text>{suggestions[index].map((match) => <TouchableOpacity key={String(match.resource_item_id)} onPress={() => updateLine(index, { resource_item_id: match.resource_item_id, mapping_status: "mapped", supplier_unit: line.supplier_unit || match.unit || "" })} className="rounded-xl bg-white border border-orange-100 px-3 py-2 mb-1.5 flex-row items-center"><View className="flex-1"><Text className="text-xs font-semibold text-slate-900">{match.code ? `${match.code} · ` : ""}{match.name}</Text><Text className="text-[10px] text-slate-500 mt-0.5">Matched by {String(match.matched_on || "history").replace(/_/g, " ")}</Text></View><Ionicons name="link-outline" size={17} color={ACCENT} /></TouchableOpacity>)}</View> : null}
          </View>
        ))}
        {!lines.some((line) => !line.is_deleted) ? <TouchableOpacity onPress={() => setLines([{ supplier_description: "", mapping_status: "unmapped" }])} className="bg-white rounded-2xl border border-dashed py-7 items-center" style={{ borderColor: "#FED7AA" }}><Ionicons name="add-circle-outline" size={28} color={ACCENT} /><Text className="text-sm font-semibold text-orange-700 mt-2">Add the first invoice line</Text></TouchableOpacity> : null}
      </View>

      <SectionTitle title="Notes" hint="Supplier-facing and internal" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <NoteField label="Supplier notes" value={values.notes} onChange={(value: string) => onChange("notes", value)} placeholder="Terms, references, or visible notes" />
        <NoteField label="Internal remarks" value={values.internal_remarks} onChange={(value: string) => onChange("internal_remarks", value)} placeholder="Private review context" bordered />
      </View>

      <OptionPicker
        visible={!!picker}
        title={picker?.title || "Select"}
        options={picker?.options || []}
        onClose={() => setPicker(null)}
        onPick={(option) => {
          if (picker?.onPick) picker.onPick(option); else if (picker) onChange(picker.field, option.id);
          setPicker(null);
        }}
      />
    </View>
  );
}

function OptionPicker({ visible, title, options, onClose, onPick }: { visible: boolean; title: string; options: Option[]; onClose: () => void; onPick: (option: Option) => void }) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((option) => !search.trim() || option.label.toLowerCase().includes(search.trim().toLowerCase()));
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View className="flex-1 bg-slate-50"><View className="bg-white px-4 py-3 flex-row items-center border-b border-slate-100"><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#0F172A" /></TouchableOpacity><Text className="ml-3 text-lg font-bold text-slate-900 flex-1">{title}</Text></View><View className="m-3 bg-white rounded-xl border border-slate-200 px-3 h-11 flex-row items-center"><Ionicons name="search-outline" size={17} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor="#94A3B8" autoFocus className="flex-1 ml-2 text-slate-900" /></View><FlatList data={filtered} keyExtractor={(item) => item.id} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <TouchableOpacity onPress={() => { onPick(item); setSearch(""); }} className="bg-white border-b border-slate-100 px-4 py-3.5"><Text className="text-sm font-medium text-slate-900">{item.label}</Text></TouchableOpacity>} ListEmptyComponent={<Text className="text-slate-500 text-center mt-10">No matching records</Text>} /></View></Modal>;
}

function PickerField({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) { return <TouchableOpacity onPress={onPress} className="h-9 flex-row items-center"><Text className={`flex-1 text-sm ${value ? "text-slate-900" : "text-slate-400"}`} numberOfLines={1}>{value || placeholder}</Text><Ionicons name="chevron-down" size={16} color="#94A3B8" /></TouchableOpacity>; }
function CompactInput(props: { value?: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "decimal-pad" }) { return <TextInput value={props.value || ""} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor="#94A3B8" keyboardType={props.keyboardType} className="text-sm text-slate-900 py-1" />; }
function FieldShell({ label, className = "", style, children }: any) { return <View className={`px-3 py-2.5 ${className}`} style={style}><Text className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">{label}</Text>{children}</View>; }
function MoneyField({ label, value, onChange, bordered, emphasis }: any) { return <View className={`flex-1 px-3 py-2.5 ${bordered ? "border-l border-slate-100" : ""}`}><Text className="text-[9px] uppercase tracking-wide text-slate-400">{label}</Text><TextInput value={value || ""} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#94A3B8" className={`py-1 text-sm ${emphasis ? "font-bold text-orange-700" : "text-slate-900"}`} /></View>; }
function LineInput({ label, value, onChange, flex, bordered, numericInput, emphasis }: any) { return <View className={`px-3 py-2 ${bordered ? "border-l border-slate-100" : ""}`} style={{ flex }}><Text className="text-[9px] uppercase tracking-wide text-slate-400">{label}</Text><TextInput value={value === null || value === undefined ? "" : String(value)} onChangeText={onChange} keyboardType={numericInput ? "decimal-pad" : "default"} placeholder="—" placeholderTextColor="#CBD5E1" className={`py-0.5 text-xs ${emphasis ? "font-bold text-orange-700" : "text-slate-900"}`} /></View>; }
function NoteField({ label, value, onChange, placeholder, bordered }: any) { return <View className={`px-3 py-3 ${bordered ? "border-t border-slate-100" : ""}`}><Text className="text-[9px] uppercase tracking-wide text-slate-400 mb-1">{label}</Text><TextInput value={value || ""} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94A3B8" multiline textAlignVertical="top" className="min-h-[68px] text-sm text-slate-900" /></View>; }
function SectionTitle({ title, hint }: { title: string; hint: string }) { return <View className="px-2 mb-1.5 flex-row items-center justify-between"><Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500">{title}</Text><Text className="text-[10px] text-slate-400">{hint}</Text></View>; }
function Metric({ value, label }: { value: string; label: string }) { return <View className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2"><Text className="text-white text-xs font-bold" numberOfLines={1}>{value}</Text><Text className="text-slate-500 text-[9px] mt-1">{label}</Text></View>; }
function MappingBadge({ status, resourceId }: { status?: string; resourceId?: any }) { const mapped = !!resourceId || status === "mapped"; return <View className={`rounded-full px-2 py-1 ${mapped ? "bg-emerald-100" : status === "suggested" ? "bg-amber-100" : "bg-slate-200"}`}><Text className={`text-[9px] font-bold ${mapped ? "text-emerald-700" : status === "suggested" ? "text-amber-700" : "text-slate-600"}`}>{mapped ? "MAPPED" : status === "suggested" ? "SUGGESTED" : "UNMAPPED"}</Text></View>; }

function parseLines(serialized: string, fallback: any): InvoiceLine[] { if (serialized) { try { const parsed = JSON.parse(serialized); if (Array.isArray(parsed)) return parsed; } catch {} } return Array.isArray(fallback) ? fallback : []; }
function optionRows(rows: any, id: (row: any) => any, label: (row: any) => any): Option[] { return (Array.isArray(rows) ? rows : []).map((row) => ({ id: String(id(row)), label: String(label(row) || `#${id(row)}`), raw: row })); }
function labelFor(options: Option[], id: string): string { return options.find((option) => option.id === String(id || ""))?.label || (id ? `#${id}` : ""); }
function numeric(value: any): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function sumLines(lines: InvoiceLine[]): number { return lines.filter((line) => !line.is_deleted).reduce((sum, line) => sum + numeric(line.supplier_total), 0); }
function money(value: number): string { return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function displayNumber(row: any, fallback: string): string { return row.display_number || `${row.prefix || fallback}${row.sequence_number || row.number || row.id}`; }
function syncAmounts(lines: InvoiceLine[], values: Record<string, string>, onChange: Props["onChange"]) { const subtotal = sumLines(lines); onChange("subtotal", subtotal ? String(subtotal) : ""); onChange("grand_total", String(subtotal + numeric(values.vat_amount)) || ""); }
