import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

type Props = { row: Record<string, any> };

const ACCENT = "#0F766E";

export function GatepassRequestSummary({ row }: Props) {
  const staff = Array.isArray(row.required_staff) ? row.required_staff : [];
  const vehicles = Array.isArray(row.required_vehicles) ? row.required_vehicles : [];
  const responsibles = Array.isArray(row.responsibles) ? row.responsibles : [];
  const active = Number(row.status) === 1;
  const converted = Number(row.is_converted) === 1;
  const gatePass = row.request_classification === "Gate Pass";

  return (
    <View className="p-3">
      <View className="rounded-3xl bg-slate-950 p-4 mb-3 overflow-hidden">
        <View className="flex-row items-start">
          <View className="w-12 h-12 rounded-2xl bg-teal-500/20 items-center justify-center mr-3">
            <Ionicons name={gatePass ? "shield-checkmark-outline" : "eye-outline"} size={24} color="#5EEAD4" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: "#5EEAD4" }}>Gate Pass Request</Text>
            <Text className="text-white text-xl font-bold mt-0.5" numberOfLines={1}>{row.display_number || `GPR-${row.id}`}</Text>
            <Text className="text-slate-400 text-xs mt-1" numberOfLines={2}>{row.request_classification || "Access request"} · {row.related_name || `${humanize(row.rel_type)} #${row.rel_id}`}</Text>
          </View>
          <View className="items-end">
            <Badge text={active ? "ACTIVE" : "EXPIRED"} color={active ? "#34D399" : "#94A3B8"} />
            <Text className="text-[9px] font-bold mt-1.5" style={{ color: converted ? "#5EEAD4" : "#FCD34D" }}>
              {converted ? "GATE PASS CREATED" : "AWAITING CONVERSION"}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2 mt-4">
          <Metric icon="calendar-outline" value={shortDate(row.duration_from)} label="Valid from" />
          <Metric icon="time-outline" value={shortDate(row.duration_to)} label="Valid until" />
          <Metric icon="people-outline" value={String(staff.length)} label="People" />
        </View>
      </View>

      <View className="flex-row gap-2 mb-3">
        <InfoCard icon="person-circle-outline" label="Requested by" value={String(row.requester_name || `Staff #${row.requester || "—"}`)} />
        <InfoCard icon="folder-open-outline" label={humanize(row.rel_type || "Related record")} value={String(row.related_name || `#${row.rel_id || "—"}`)} />
      </View>

      <SectionTitle title="Access window" />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        <View className="flex-row">
          <DenseValue label="Duration" value={String(row.duration || "—")} wide />
          <DenseValue label="State" value={active ? "Within validity" : "Validity ended"} bordered tone={active ? "success" : "muted"} />
        </View>
        <View className="flex-row border-t border-slate-100">
          <DenseValue label="Created" value={shortDateTime(row.created_at)} />
          <DenseValue label="Conversion" value={converted ? `Gate Pass #${row.gatepass_id}` : "Not converted"} bordered tone={converted ? "success" : "warning"} />
        </View>
        {converted && row.gatepass_id ? <TouchableOpacity onPress={() => router.push(`/(tabs)/erp/gatepass/${row.gatepass_id}` as any)} className="px-3 py-2.5 bg-teal-50 border-t border-teal-100 flex-row items-center"><Ionicons name="open-outline" size={16} color={ACCENT} /><Text className="text-xs font-bold text-teal-800 ml-2 flex-1">Open linked Gate Pass #{row.gatepass_id}</Text><Ionicons name="chevron-forward" size={15} color={ACCENT} /></TouchableOpacity> : null}
      </View>

      {gatePass ? (
        <>
          <SectionTitle title="Work authorization" />
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            <View className="flex-row">
              <DenseValue label="RFX / PO" value={String(row.po_number || "—")} />
              <DenseValue label="Location" value={String(row.work_location || "—")} bordered />
            </View>
            <View className="flex-row border-t border-slate-100">
              <DenseValue label="Stations" value={String(row.stations || "—")} />
              <DenseValue label="Substations" value={String(row.substation || "—")} bordered />
            </View>
            <View className="px-3 py-3 border-t border-slate-100">
              <Text className="text-[9px] uppercase tracking-wide text-slate-400">Work details</Text>
              <Text className="text-sm text-slate-700 leading-5 mt-1">{String(row.work_details || "No work scope recorded")}</Text>
            </View>
          </View>

          <SectionTitle title={`Access roster · ${staff.length} people · ${vehicles.length} vehicles`} />
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            <PersonRow icon="star-outline" title={row.representative_name || `Staff #${row.representative_id || "—"}`} subtitle="Site representative" />
            {staff.map((person: any, index: number) => <PersonRow key={String(person.id || person.staff_id || index)} icon="person-outline" title={person.staff_name || `Staff #${person.staff_id}`} subtitle="Involved employee" bordered />)}
            {!staff.length ? <EmptyRow icon="people-outline" text="No involved employees" bordered /> : null}
            {vehicles.map((vehicle: any, index: number) => <PersonRow key={String(vehicle.id || vehicle.vehicle_id || index)} icon="car-outline" title={vehicleTitle(vehicle)} subtitle={[vehicle.type, vehicle.color].filter(Boolean).join(" · ") || "Assigned vehicle"} bordered />)}
            {!vehicles.length ? <EmptyRow icon="car-outline" text="No vehicles required" bordered /> : null}
          </View>
        </>
      ) : (
        <View className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3 mb-3 flex-row items-start"><Ionicons name="eye-outline" size={19} color="#0369A1" /><View className="ml-2.5 flex-1"><Text className="text-xs font-bold text-sky-900">Site Visit request</Text><Text className="text-[11px] text-sky-700 mt-1 leading-4">This classification intentionally has no vehicle or work-authorization roster.</Text></View></View>
      )}

      <SectionTitle title={`Workflow owners · ${responsibles.length}`} />
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
        {responsibles.map((person: any, index: number) => <PersonRow key={String(person.staff_id || index)} icon="git-network-outline" title={person.staff_name || `Staff #${person.staff_id}`} subtitle={[person.in_charge_mobile_no, person.mobile_no].filter(Boolean).join(" · ") || `${humanize(row.rel_type)} responsible`} bordered={index > 0} />)}
        {!responsibles.length ? <EmptyRow icon="git-network-outline" text="No workflow owner configured" /> : null}
      </View>

      <View className="rounded-2xl border px-3 py-3 flex-row items-center mb-2" style={{ borderColor: converted ? "#99F6E4" : "#FDE68A", backgroundColor: converted ? "#F0FDFA" : "#FFFBEB" }}><Ionicons name={converted ? "checkmark-done-circle-outline" : "arrow-forward-circle-outline"} size={21} color={converted ? ACCENT : "#B45309"} /><View className="ml-2.5 flex-1"><Text className={`text-xs font-bold ${converted ? "text-teal-900" : "text-amber-900"}`}>{converted ? "Request converted successfully" : "Ready-state is permission controlled"}</Text><Text className={`text-[10px] mt-0.5 ${converted ? "text-teal-700" : "text-amber-700"}`}>{converted ? `Linked to Gate Pass #${row.gatepass_id}` : "Use the actions menu when Convert to Gate Pass is available."}</Text></View></View>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) { return <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}24` }}><Text className="text-[10px] font-bold" style={{ color }}>{text}</Text></View>; }
function Metric({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) { return <View className="flex-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2"><View className="flex-row items-center"><Ionicons name={icon} size={13} color="#5EEAD4" /><Text className="text-white text-[11px] font-bold ml-1.5 flex-1" numberOfLines={1}>{value}</Text></View><Text className="text-slate-500 text-[9px] mt-1">{label}</Text></View>; }
function InfoCard({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View className="flex-1 bg-white rounded-2xl shadow-sm px-3 py-3"><View className="flex-row items-center"><Ionicons name={icon} size={15} color={ACCENT} /><Text className="text-[9px] uppercase tracking-wide text-slate-500 ml-1.5">{label}</Text></View><Text className="text-xs font-semibold text-slate-900 mt-1.5" numberOfLines={2}>{value}</Text></View>; }
function DenseValue({ label, value, bordered, wide, tone }: { label: string; value: string; bordered?: boolean; wide?: boolean; tone?: "success" | "warning" | "muted" }) { const color = tone === "success" ? "text-teal-700" : tone === "warning" ? "text-amber-700" : tone === "muted" ? "text-slate-500" : "text-slate-800"; return <View className={`px-3 py-2.5 ${bordered ? "border-l border-slate-100" : ""}`} style={{ flex: wide ? 1.35 : 1 }}><Text className="text-[9px] uppercase tracking-wide text-slate-400">{label}</Text><Text className={`text-[11px] mt-1 font-semibold ${color}`} numberOfLines={2}>{value}</Text></View>; }
function PersonRow({ icon, title, subtitle, bordered }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; bordered?: boolean }) { return <View className={`px-3 py-2.5 flex-row items-center ${bordered ? "border-t border-slate-100" : ""}`}><View className="w-8 h-8 rounded-xl bg-teal-50 items-center justify-center mr-2.5"><Ionicons name={icon} size={16} color={ACCENT} /></View><View className="flex-1"><Text className="text-xs font-semibold text-slate-900" numberOfLines={1}>{title}</Text><Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>{subtitle}</Text></View></View>; }
function EmptyRow({ icon, text, bordered }: { icon: keyof typeof Ionicons.glyphMap; text: string; bordered?: boolean }) { return <View className={`px-3 py-3 flex-row items-center ${bordered ? "border-t border-slate-100" : ""}`}><Ionicons name={icon} size={17} color="#CBD5E1" /><Text className="text-xs text-slate-400 ml-2">{text}</Text></View>; }
function SectionTitle({ title }: { title: string }) { return <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500 px-2 mb-1.5">{title}</Text>; }
function shortDate(value: any): string { if (!value) return "—"; const text = String(value); const date = new Date(text.includes("T") ? text : `${text.slice(0, 10)}T00:00:00`); return Number.isNaN(date.getTime()) ? text.slice(0, 10) : date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" }); }
function shortDateTime(value: any): string { if (!value) return "—"; const date = new Date(String(value).replace(" ", "T")); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
function humanize(value: any): string { return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function vehicleTitle(vehicle: any): string { return [vehicle.plate_code, vehicle.register_number].filter(Boolean).join(" · ") || `Vehicle #${vehicle.vehicle_id || "—"}`; }
