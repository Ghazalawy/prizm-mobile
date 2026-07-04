import { ScrollView, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { DenseCard } from "@/components/ui/DenseCard";
import { EntityPill } from "@/components/ui/EntityPill";
import { MetaGrid } from "@/components/ui/MetaGrid";
import { InsightStrip } from "@/components/ui/InsightStrip";
import { DenseListRow } from "@/components/ui/DenseListRow";
import { WorkflowDetailHero } from "@/components/approvals/WorkflowDetailHero";
import { StatWidget } from "@/components/widgets/StatWidget";
import { WIDGET_REGISTRY } from "@/lib/widget-registry";
import { colors } from "@/lib/theme";

/** Dev-only component gallery — navigate via Settings or direct route in __DEV__. */
export default function UiGalleryScreen() {
  if (!__DEV__) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <Text className="text-muted">UI gallery is only available in development builds.</Text>
      </View>
    );
  }

  const tasksWidget = WIDGET_REGISTRY.tasks_summary;

  return (
    <>
      <Stack.Screen options={{ title: "UI Gallery", headerShown: true }} />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4 pb-12">
        <Text className="text-lg font-bold text-foreground mb-4">Density UI Kit</Text>

        <Text className="text-xs uppercase text-muted mb-2">ScreenHeader</Text>
        <ScreenHeader
          title="Payment Request"
          subtitle="MT-26060024"
          onBack={() => router.back()}
        />

        <Text className="text-xs uppercase text-muted mb-2 mt-4">EntityPill</Text>
        <EntityPill label="Payment Request" icon="card-outline" />

        <Text className="text-xs uppercase text-muted mb-2 mt-4">InsightStrip</Text>
        <InsightStrip
          segments={[
            { label: "tasks", value: 64, color: colors.primary, onPress: () => {} },
            { label: "approvals", value: 3, color: "#7C3AED" },
            { label: "overdue", value: 2, color: "#DC2626" },
          ]}
        />

        <Text className="text-xs uppercase text-muted mb-2 mt-4">MetaGrid</Text>
        <DenseCard>
          <MetaGrid
            cells={[
              { label: "Requested by", value: "Galiya VADAKKEVALAPPIL" },
              { label: "Department", value: "Accounts" },
              { label: "Cost center", value: "CC-001 · Operations" },
              { label: "Total", value: "1,351.33 AED" },
            ]}
          />
        </DenseCard>

        <Text className="text-xs uppercase text-muted mb-2 mt-4">WorkflowDetailHero</Text>
        <WorkflowDetailHero
          request={{
            id: 1,
            staff_id: 224,
            title: "Prizm Staff Sim Card Invoices - May 2026",
            number: null,
            prefix: "MT-",
            sequence_number: 26060024,
            display_code: "MT-26060024",
            status: null,
            total_amount: "1351.33",
            requested_date: "2026-06-13 13:39:00",
            department_id: 1,
            department_name: "Accounts",
            currency_id: null,
            currency_symbol: "AED",
            currency_name: null,
            cost_centers: [{ id: 1, code: "CC-001", title: "Operations" }],
            notes: null,
            rel_type: null,
            rel_id: null,
            project_id: null,
            requester_name: "Galiya VADAKKEVALAPPIL",
            requester_profile_image: null,
          }}
          statusLabel="Fully approved"
          tone="approved"
          requestedAt="Jun 13, 2026, 1:39 PM"
          displayedTotal={1351.33}
          formatCurrency={(amt, sym) => (sym ? `${amt.toLocaleString()} ${sym}` : amt.toLocaleString())}
        />

        <Text className="text-xs uppercase text-muted mb-2 mt-4">StatWidget compact / rich</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <StatWidget
              widget={tasksWidget}
              value={64}
              isLoading={false}
              isError={false}
              variant="compact"
            />
          </View>
          <View className="flex-1">
            <StatWidget
              widget={tasksWidget}
              value={64}
              isLoading={false}
              isError={false}
              variant="rich"
              secondaryMetrics={[
                { label: "new", value: 48 },
                { label: "overdue", value: 61, color: "#DC2626" },
                { label: "stale", value: 3 },
              ]}
            />
          </View>
        </View>

        <Text className="text-xs uppercase text-muted mb-2 mt-4">DenseListRow</Text>
        <DenseCard compact className="py-0 px-3">
          <DenseListRow
            title="PROJECT FINANCIAL POSITION UPDATE"
            badges={
              <View className="flex-row">
                <View className="px-1.5 py-0.5 rounded bg-slate-100">
                  <Text className="text-[10px] font-semibold text-slate-600">Not Started</Text>
                </View>
              </View>
            }
            rightMeta={<Text className="text-xs font-medium text-red-600">2d overdue</Text>}
            onPress={() => {}}
          />
        </DenseCard>
      </ScrollView>
    </>
  );
}
