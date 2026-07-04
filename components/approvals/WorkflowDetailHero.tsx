import { View, Text, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DenseCard } from "@/components/ui/DenseCard";
import { MetaGrid, type MetaGridCell } from "@/components/ui/MetaGrid";
import { rtlTextStyle } from "@/lib/rtl";
import { API_URL } from "@/lib/config";
import type { PRHeader } from "@/lib/queries/purchase-request";

type Tone = "pending" | "your-turn" | "approved" | "rejected";

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  pending: { bg: "#FEF3C7", fg: "#B45309" },
  "your-turn": { bg: "#DBEAFE", fg: "#1D4ED8" },
  approved: { bg: "#DCFCE7", fg: "#15803D" },
  rejected: { bg: "#FEE2E2", fg: "#B91C1C" },
};

type WorkflowDetailHeroProps = {
  request: PRHeader;
  statusLabel: string;
  tone: Tone;
  requestedAt: string | null;
  displayedTotal: number;
  totalMismatch?: boolean;
  formatCurrency: (amount: number, symbol: string | null) => string;
};

function Avatar({
  staffid,
  profileImage,
  name,
  size = 28,
}: {
  staffid: number;
  profileImage: string | null;
  name: string;
  size?: number;
}) {
  const uri = profileImage
    ? profileImage.startsWith("http")
      ? profileImage
      : `${API_URL.replace(/\/api\/?$/, "")}/uploads/staff_profile_images/${profileImage}`
    : null;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: "700", color: "#475569" }}>
        {initials || `#${staffid}`}
      </Text>
    </View>
  );
}

/** Dense hero card for workflow approval detail screens. */
export function WorkflowDetailHero({
  request,
  statusLabel,
  tone,
  requestedAt,
  displayedTotal,
  totalMismatch,
  formatCurrency,
}: WorkflowDetailHeroProps) {
  const t = TONE_STYLES[tone];
  const costCenterLabel = (request.cost_centers || [])
    .map((cc) => `${cc.code || ""}${cc.code && cc.title ? " · " : ""}${cc.title || ""}`.trim())
    .filter(Boolean)
    .join(", ");

  const cells: MetaGridCell[] = [
    {
      label: "Requested by",
      value: (
        <View className="flex-row items-center mt-0.5">
          <Avatar
            staffid={request.staff_id}
            profileImage={request.requester_profile_image}
            name={request.requester_name || ""}
          />
          <Text className="text-sm font-semibold text-foreground ml-2 flex-1" numberOfLines={1}>
            {request.requester_name?.trim() || `Staff #${request.staff_id}`}
          </Text>
        </View>
      ),
    },
    {
      label: "Department",
      value: request.department_name || "—",
    },
    {
      label: "Cost center",
      value: costCenterLabel || "—",
    },
    {
      label: "Total",
      value: (
        <View className="flex-row items-center flex-wrap">
          <Text className="text-base font-bold text-foreground">
            {formatCurrency(displayedTotal, request.currency_symbol) || "—"}
          </Text>
          {totalMismatch ? (
            <View className="ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: "#FEF3C7" }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#B45309" }}>MISMATCH</Text>
            </View>
          ) : null}
        </View>
      ),
    },
  ];

  return (
    <DenseCard>
      <Text
        className="text-base font-bold text-foreground pr-2"
        numberOfLines={2}
        style={rtlTextStyle(request.title)}
      >
        {request.title || "Untitled request"}
      </Text>

      <View className="flex-row items-center justify-between mt-2">
        <View
          className="flex-row items-center px-2.5 py-1 rounded-full"
          style={{ backgroundColor: t.bg }}
        >
          <Ionicons
            name={
              tone === "approved"
                ? "checkmark-circle"
                : tone === "rejected"
                ? "close-circle"
                : tone === "your-turn"
                ? "person-circle-outline"
                : "time-outline"
            }
            size={13}
            color={t.fg}
          />
          <Text className="text-xs font-medium ml-1" style={{ color: t.fg }}>
            {statusLabel}
          </Text>
        </View>
        {requestedAt ? (
          <Text className="text-xs text-muted shrink-0 ml-2" numberOfLines={1}>
            {requestedAt}
          </Text>
        ) : null}
      </View>

      <MetaGrid cells={cells} />
    </DenseCard>
  );
}
