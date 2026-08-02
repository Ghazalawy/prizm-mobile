import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

type Props = { row: Record<string, any> };

export function SupplierInvoiceSummary({ row }: Props) {
  const items = Array.isArray(row.items) ? row.items : [];
  const stages = Array.isArray(row.stage_progress) ? row.stage_progress : [];
  const history = Array.isArray(row.history) ? row.history : [];
  const statusColor = statusTone(row.status);
  const currency = row.currency_symbol || row.currency_name || "";

  return (
    <View className="p-3">
      <View className="rounded-3xl bg-slate-950 p-4 mb-3 overflow-hidden">
        <View className="flex-row items-start">
          <View className="w-12 h-12 rounded-2xl bg-orange-500/20 items-center justify-center mr-3">
            <Ionicons name="receipt-outline" size={24} color="#FDBA74" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: "#FDBA74" }}>Supplier Invoice</Text>
            <Text className="text-white text-xl font-bold mt-0.5" numberOfLines={1}>{row.display_number || `SI-${row.sequence_number || row.id}`}</Text>
            <Text className="text-slate-400 text-xs mt-1" numberOfLines={1}>{row.supplier_name || "Supplier not resolved"} · Ref {row.supplier_invoice_number || "—"}</Text>
          </View>
          <View className="items-end">
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${statusColor}26` }}><Text className="text-[10px] font-bold" style={{ color: statusColor }}>{String(row.status || "Draft").toUpperCase()}</Text></View>
            <Text className={`text-[10px] font-bold mt-1.5 ${row.payment_status === "Paid" ? "text-emerald-400" : "text-amber-300"}`}>{String(row.payment_status || "Unpaid").toUpperCase()}</Text>
          </View>
        </View>
        <View className="flex-row gap-2 mt-4">
          <Metric icon="cash-outline" value={formatMoney(row.grand_total, currency)} label="Grand total" />
          <Metric icon="calendar-outline" value={shortDate(row.due_date)} label="Due date" />
          <Metric icon="list-outline" value={String(items.length)} label="Invoice lines" />
        </View>
      </View>

      <View className="flex-row gap-2 mb-3">
        <InfoCard icon="bag-check-outline" label="Purchase order" value={purchaseOrder(row)} />
        <InfoCard icon="folder-open-outline" label="Project" value={String(row.project_name || "Not linked")} />
      </View>

      <SectionTitle title="Commercial snapshot" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <View className="flex-row">
          <DenseValue label="Invoice date" value={shortDate(row.invoice_date)} />
          <DenseValue label="Due date" value={shortDate(row.due_date)} bordered />
          <DenseValue label="Department" value={String(row.department_name || `#${row.department_id || "—"}`)} bordered />
        </View>
        <View className="flex-row border-t border-slate-100">
          <DenseValue label="Subtotal" value={formatMoney(row.subtotal, currency)} />
          <DenseValue label="VAT" value={formatMoney(row.vat_amount, currency)} bordered />
          <DenseValue label="Total" value={formatMoney(row.grand_total, currency)} bordered emphasis />
        </View>
        <View className="flex-row border-t border-slate-100">
          <DenseValue label="Cost center" value={String(row.cost_center || "—")} />
          <DenseValue label="Created by" value={String(row.created_by_name || `Staff #${row.staff_id || "—"}`)} bordered />
          <DenseValue label="Created" value={shortDate(row.requested_date)} bordered />
        </View>
      </View>

      <SectionTitle title={`Invoice lines · ${items.length}`} />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        {items.map((item: any, index: number) => (
          <View key={String(item.id || index)} className={`px-3 py-3 ${index ? "border-t border-slate-100" : ""}`}>
            <View className="flex-row items-start">
              <View className="w-7 h-7 rounded-lg bg-orange-50 items-center justify-center mr-2.5"><Text className="text-xs font-bold text-orange-700">{index + 1}</Text></View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900" numberOfLines={2}>{item.supplier_description || "Invoice line"}</Text>
                <Text className="text-[10px] text-slate-500 mt-0.5">{item.supplier_item_code || "No supplier code"}{item.supplier_unit ? ` · ${item.supplier_unit}` : ""}</Text>
              </View>
              <MappingBadge item={item} />
            </View>
            <View className="flex-row mt-2 ml-9 rounded-xl bg-slate-50 overflow-hidden">
              <MiniValue label="Quantity" value={compactNumber(item.supplier_qty)} />
              <MiniValue label="Unit price" value={formatMoney(item.supplier_unit_price, currency)} bordered />
              <MiniValue label="Line total" value={formatMoney(item.supplier_total, currency)} bordered emphasis />
            </View>
          </View>
        ))}
        {!items.length ? <EmptyRow icon="list-outline" text="No invoice lines recorded" /> : null}
      </View>

      {stages.length ? (
        <>
          <SectionTitle title="Approval route" />
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            {stages.map((stage: any, index: number) => {
              const current = Number(stage.is_current_status) === 1;
              const tone = stage.status === "Approved" ? "#16A34A" : stage.status === "Rejected" ? "#DC2626" : current ? "#EA580C" : "#94A3B8";
              return <View key={String(stage.id || index)} className={`px-3 py-3 flex-row items-center ${index ? "border-t border-slate-100" : ""}`}><View className="w-9 items-center"><View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: `${tone}1F` }}><Text className="text-[10px] font-bold" style={{ color: tone }}>{stage.stageLevel || stage.stage_level || index + 1}</Text></View></View><View className="flex-1"><Text className="text-sm font-semibold text-slate-900">{stage.stage_name || `Approval stage ${index + 1}`}</Text><Text className="text-[10px] text-slate-500 mt-0.5">{stage.approver_fullname || stage.approver_name || `Approver #${stage.approver || "—"}`}</Text></View><View className="items-end"><Text className="text-[10px] font-bold" style={{ color: tone }}>{String(stage.status || "Pending").toUpperCase()}</Text>{current ? <Text className="text-[9px] text-orange-600 mt-0.5">CURRENT</Text> : null}</View></View>;
            })}
          </View>
        </>
      ) : null}

      {(row.notes || row.internal_remarks) ? (
        <>
          <SectionTitle title="Notes" />
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            {row.notes ? <Note label="Supplier notes" value={row.notes} /> : null}
            {row.internal_remarks ? <Note label="Internal remarks" value={row.internal_remarks} bordered={!!row.notes} /> : null}
          </View>
        </>
      ) : null}

      <SectionTitle title={`Activity · ${history.length}`} />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {history.slice().reverse().map((event: any, index: number) => <View key={String(event.id || index)} className={`px-3 py-3 flex-row items-start ${index ? "border-t border-slate-100" : ""}`}><View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-3"><Ionicons name="pulse-outline" size={16} color="#64748B" /></View><View className="flex-1"><Text className="text-sm font-semibold text-slate-900">{humanize(event.action || event.status || "Updated")}</Text><Text className="text-[10px] text-slate-500 mt-0.5">{event.actor_name || `Staff #${event.actor_id || "—"}`} · {shortDateTime(event.addeddate)}</Text>{event.note ? <Text className="text-xs text-slate-600 mt-1.5">{event.note}</Text> : null}</View><Text className="text-[10px] font-bold" style={{ color: statusTone(event.status) }}>{event.status || ""}</Text></View>)}
        {!history.length ? <EmptyRow icon="pulse-outline" text="No activity recorded" /> : null}
      </View>
    </View>
  );
}

function Metric({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) { return <View className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2"><View className="flex-row items-center"><Ionicons name={icon} size={13} color="#FDBA74" /><Text className="text-white text-xs font-bold ml-1.5 flex-1" numberOfLines={1}>{value}</Text></View><Text className="text-slate-500 text-[9px] mt-1">{label}</Text></View>; }
function InfoCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View className="flex-1 bg-white rounded-2xl shadow-sm px-3 py-3"><View className="flex-row items-center"><Ionicons name={icon} size={15} color="#EA580C" /><Text className="text-[9px] uppercase tracking-wide text-slate-500 ml-1.5">{label}</Text></View><Text className="text-xs font-semibold text-slate-900 mt-1.5" numberOfLines={2}>{value}</Text></View>; }
function DenseValue({ label, value, bordered, emphasis }: { label: string; value: string; bordered?: boolean; emphasis?: boolean }) { return <View className={`flex-1 px-3 py-2.5 ${bordered ? "border-l border-slate-100" : ""}`}><Text className="text-[9px] uppercase tracking-wide text-slate-400">{label}</Text><Text className={`text-[11px] mt-1 ${emphasis ? "font-bold text-orange-700" : "font-semibold text-slate-800"}`} numberOfLines={2}>{value}</Text></View>; }
function MiniValue({ label, value, bordered, emphasis }: { label: string; value: string; bordered?: boolean; emphasis?: boolean }) { return <View className={`flex-1 px-2 py-2 ${bordered ? "border-l border-white" : ""}`}><Text className="text-[8px] uppercase text-slate-400">{label}</Text><Text className={`text-[10px] mt-0.5 ${emphasis ? "font-bold text-orange-700" : "font-semibold text-slate-700"}`} numberOfLines={1}>{value}</Text></View>; }
function MappingBadge({ item }: { item: any }) { const mapped = !!item.resource_item_id || item.mapping_status === "mapped"; const suggested = item.mapping_status === "suggested"; return <View className={`rounded-full px-2 py-1 ${mapped ? "bg-emerald-50" : suggested ? "bg-amber-50" : "bg-slate-100"}`}><Text className={`text-[9px] font-bold ${mapped ? "text-emerald-700" : suggested ? "text-amber-700" : "text-slate-500"}`}>{mapped ? "MAPPED" : suggested ? "SUGGESTED" : "UNMAPPED"}</Text></View>; }
function Note({ label, value, bordered }: { label: string; value: string; bordered?: boolean }) { return <View className={`px-3 py-3 ${bordered ? "border-t border-slate-100" : ""}`}><Text className="text-[9px] uppercase tracking-wide text-slate-400">{label}</Text><Text className="text-sm text-slate-700 leading-5 mt-1">{String(value)}</Text></View>; }
function EmptyRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) { return <View className="items-center py-7"><Ionicons name={icon} size={25} color="#CBD5E1" /><Text className="text-sm text-slate-400 mt-2">{text}</Text></View>; }
function SectionTitle({ title }: { title: string }) { return <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500 px-2 mb-1.5">{title}</Text>; }
function statusTone(status: any): string { return status === "Approved" ? "#16A34A" : status === "Rejected" ? "#DC2626" : status === "Submitted" ? "#3B82F6" : status === "Cancelled" ? "#A8A29E" : "#F59E0B"; }
function formatMoney(value: any, currency: string): string { const number = Number(value || 0); return `${currency ? `${currency} ` : ""}${Number.isFinite(number) ? number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`; }
function compactNumber(value: any): string { const number = Number(value || 0); return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "0"; }
function shortDate(value: any): string { if (!value) return "—"; const text = String(value); const date = new Date(text.includes("T") ? text : text.replace(" ", "T")); return Number.isNaN(date.getTime()) ? text.slice(0, 10) : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }
function shortDateTime(value: any): string { if (!value) return "—"; const date = new Date(String(value).replace(" ", "T")); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
function purchaseOrder(row: any): string { const number = row.po_sequence_number || row.po_number; return row.po_title ? `${number ? `${row.po_prefix || "PO-"}${number} · ` : ""}${row.po_title}` : number ? `${row.po_prefix || "PO-"}${number}` : "Not linked"; }
function humanize(value: any): string { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
