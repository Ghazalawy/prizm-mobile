import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { memo, useState } from "react";
import {
  useCustomerDetail,
  useCustomerContacts,
  useCreateCustomerContact,
  useDeleteCustomerContact,
  useCustomerInvoices,
  useCustomerEstimates,
  useCustomerProjects,
  useCustomerContracts,
  useCustomerTasks,
  useCustomerTickets,
  useCustomerProposals,
  useCustomerExpenses,
  useCustomerFinancialSummary,
} from "@/lib/queries/customers";
import { FilesTab } from "@/components/crud/FilesTab";
import { colors } from "@/lib/theme";
import { navigateInAppOrExternalLink } from "@/lib/native-routing";

const ACCENT = colors.primary;

const TABS = [
  { key: "overview", title: "Overview" },
  { key: "contacts", title: "Contacts" },
  { key: "invoices", title: "Invoices" },
  { key: "estimates", title: "Estimates" },
  { key: "projects", title: "Projects" },
  { key: "contracts", title: "Contracts" },
  { key: "tasks", title: "Tasks" },
  { key: "tickets", title: "Tickets" },
  { key: "proposals", title: "Proposals" },
  { key: "expenses", title: "Expenses" },
  { key: "files", title: "Files" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const detail = useCustomerDetail(id!);
  const financials = useCustomerFinancialSummary(id!);

  if (detail.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <View className="flex-1 items-center justify-center px-8 bg-slate-50">
        <Ionicons name="cloud-offline-outline" size={46} color="#EF4444" />
        <Text className="text-slate-900 font-semibold mt-3">Couldn&apos;t load customer</Text>
        <TouchableOpacity
          onPress={() => detail.refetch()}
          className="mt-4 px-5 py-2 rounded-lg"
          style={{ backgroundColor: ACCENT }}
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const c = detail.data;
  const isActive = String(c.active) === "1";

  return (
    <View className="flex-1 bg-slate-50">
      {/* Hero Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        {/* Back + title */}
        <View className="flex-row items-center mb-3">
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-[9px] font-bold uppercase tracking-[1.2px] text-sky-600 mb-0.5">CRM · Customer</Text>
            <View className="flex-row items-center">
              <Text className="text-xl font-bold text-slate-900 flex-1" numberOfLines={1}>
                {c.company || "Unnamed"}
              </Text>
              <View
                className="px-2 py-0.5 rounded-full ml-2"
                style={{ backgroundColor: isActive ? "#DCFCE7" : "#F1F5F9" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: isActive ? "#15803D" : "#64748B" }}
                >
                  {isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            {(c.name || c.contact_name) ? (
              <Text className="text-sm text-slate-600 mt-0.5">{c.name || c.contact_name}</Text>
            ) : null}
          </View>
        </View>

        {/* Contact row */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1 mb-3">
          {c.phonenumber ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${c.phonenumber}`)}
              className="flex-row items-center"
            >
              <Ionicons name="call-outline" size={14} color="#0284C7" />
              <Text className="text-sm text-sky-700 ml-1">{c.phonenumber}</Text>
            </TouchableOpacity>
          ) : null}
          {c.email ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`mailto:${c.email}`)}
              className="flex-row items-center"
            >
              <Ionicons name="mail-outline" size={14} color="#0284C7" />
              <Text className="text-sm text-sky-700 ml-1">{c.email}</Text>
            </TouchableOpacity>
          ) : null}
          {c.website ? (
            <TouchableOpacity
              onPress={() => {
                const url = c.website.startsWith("http") ? c.website : `https://${c.website}`;
                void navigateInAppOrExternalLink(url);
              }}
              className="flex-row items-center"
            >
              <Ionicons name="globe-outline" size={14} color="#0284C7" />
              <Text className="text-sm text-sky-700 ml-1" numberOfLines={1}>
                {c.website}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick action row */}
        <View className="flex-row gap-2">
          {c.phonenumber ? (
            <QuickAction
              icon="call-outline"
              label="Call"
              color="#16A34A"
              onPress={() => Linking.openURL(`tel:${c.phonenumber}`)}
            />
          ) : null}
          {c.email ? (
            <QuickAction
              icon="mail-outline"
              label="Email"
              color="#2563EB"
              onPress={() => Linking.openURL(`mailto:${c.email}`)}
            />
          ) : null}
          <QuickAction
            icon="document-text-outline"
            label="Invoice"
            color="#DC2626"
            onPress={() => router.push({ pathname: "/(tabs)/invoices/new" as any, params: { clientid: id } })}
          />
          <QuickAction
            icon="checkbox-outline"
            label="Task"
            color="#F59E0B"
            onPress={() => router.push({ pathname: "/(tabs)/tasks/new" as any, params: { rel_type: "customer", rel_id: id } })}
          />
        </View>
      </View>

      {/* Financial Summary */}
      {financials.data && (
        <View className="bg-white mx-3 mt-3 p-4 rounded-xl shadow-sm">
          <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">Financial Summary</Text>
          <View className="flex-row justify-between">
            <FinancialStat label="Invoiced" value={financials.data.totalInvoiced} color="#0F172A" />
            <FinancialStat label="Paid" value={financials.data.totalPaid} color="#16A34A" />
            <FinancialStat label="Outstanding" value={financials.data.outstandingBalance} color="#DC2626" />
          </View>
          <View className="flex-row mt-2 gap-3">
            <Text className="text-xs text-slate-500">
              {financials.data.invoiceCount} invoices
            </Text>
            <Text className="text-xs text-green-700">
              {financials.data.paidCount} paid
            </Text>
            <Text className="text-xs text-amber-700">
              {financials.data.unpaidCount} unpaid
            </Text>
            {financials.data.overdueCount > 0 && (
              <Text className="text-xs text-red-600">
                {financials.data.overdueCount} overdue
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View className="mt-3">
        <FlatList
          data={TABS as any}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t: any) => t.key}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
          renderItem={({ item: tab }: any) => (
            <TouchableOpacity
              onPress={() => setActiveTab(tab.key)}
              className="px-3 py-2 rounded-full"
              style={{
                backgroundColor: activeTab === tab.key ? ACCENT : "#F1F5F9",
              }}
              activeOpacity={0.7}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: activeTab === tab.key ? "#FFF" : "#475569" }}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Tab Content */}
      <View className="flex-1 mt-2">
        {activeTab === "overview" && <OverviewTab data={c} />}
        {activeTab === "contacts" && <ContactsTab customerId={id!} />}
        {activeTab === "invoices" && <InvoicesTab customerId={id!} />}
        {activeTab === "estimates" && <EstimatesTab customerId={id!} />}
        {activeTab === "projects" && <ProjectsTab customerId={id!} />}
        {activeTab === "contracts" && <ContractsTab customerId={id!} />}
        {activeTab === "tasks" && <TasksTab customerId={id!} />}
        {activeTab === "tickets" && <TicketsTab customerId={id!} />}
        {activeTab === "proposals" && <ProposalsTab customerId={id!} />}
        {activeTab === "expenses" && <ExpensesTab customerId={id!} />}
        {activeTab === "files" && <FilesTab relType="customer" relId={id!} color="#0284C7" />}
      </View>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 py-2 rounded-lg items-center"
      style={{ backgroundColor: `${color}10` }}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text className="text-[10px] font-medium mt-0.5" style={{ color }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FinancialStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold" style={{ color }}>
        {value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </Text>
      <Text className="text-[10px] text-slate-500 mt-0.5">{label}</Text>
    </View>
  );
}

// ─── Tab: Overview ───────────────────────────────────────────────────────

function OverviewTab({ data: c }: { data: any }) {
  return (
    <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <SectionCard title="Company Details">
        <InfoRow label="VAT" value={c.vat} />
        <InfoRow label="Currency" value={c.default_currency ? `ID: ${c.default_currency}` : null} />
        <InfoRow label="Language" value={c.default_language} />
      </SectionCard>

      <SectionCard title="Billing Address">
        <InfoRow label="Street" value={c.billing_street} />
        <InfoRow label="City" value={c.billing_city} />
        <InfoRow label="State" value={c.billing_state} />
        <InfoRow label="Zip" value={c.billing_zip} />
      </SectionCard>

      <SectionCard title="Shipping Address">
        <InfoRow label="Street" value={c.shipping_street} />
        <InfoRow label="City" value={c.shipping_city} />
        <InfoRow label="State" value={c.shipping_state} />
        <InfoRow label="Zip" value={c.shipping_zip} />
      </SectionCard>

      {c.address ? (
        <SectionCard title="Address">
          <InfoRow label="Street" value={c.address} />
          <InfoRow label="City" value={c.city} />
          <InfoRow label="State" value={c.state} />
          <InfoRow label="Zip" value={c.zip} />
        </SectionCard>
      ) : null}
    </ScrollView>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-xl p-4 mt-3 shadow-sm">
      <Text className="text-xs font-semibold text-slate-500 uppercase mb-2">{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value || value === "0" || value === "0000-00-00") return null;
  return (
    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="text-sm text-slate-900 font-medium flex-1 text-right" numberOfLines={2}>
        {String(value)}
      </Text>
    </View>
  );
}

// ─── Tab: Contacts ───────────────────────────────────────────────────────

function ContactsTab({ customerId }: { customerId: string }) {
  const { data, isLoading, refetch } = useCustomerContacts(customerId);
  const createContact = useCreateCustomerContact();
  const deleteContact = useDeleteCustomerContact();
  const [showForm, setShowForm] = useState(false);
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phonenumber, setPhonenumber] = useState("");

  const handleCreate = () => {
    if (!firstname.trim() || !email.trim()) {
      Alert.alert("Required", "First name and email are required.");
      return;
    }
    createContact.mutate(
      {
        customer_id: Number(customerId),
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: email.trim(),
        phonenumber: phonenumber.trim() || undefined,
        password: "ChangeMe123!",
        active: 1,
      } as any,
      {
        onSuccess: () => {
          setShowForm(false);
          setFirstname("");
          setLastname("");
          setEmail("");
          setPhonenumber("");
          refetch();
        },
        onError: (e: Error) => Alert.alert("Failed", e.message),
      }
    );
  };

  const handleDelete = (contactId: number, name: string) => {
    Alert.alert("Delete contact", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteContact.mutate(
            { id: contactId, customerId },
            {
              onSuccess: () => refetch(),
              onError: (e: Error) => Alert.alert("Failed", e.message),
            }
          ),
      },
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (!data || data.length === 0) {
    return (
      <View className="flex-1">
        {showForm ? (
          <ContactForm
            firstname={firstname}
            lastname={lastname}
            email={email}
            phonenumber={phonenumber}
            onChangeFirst={setFirstname}
            onChangeLast={setLastname}
            onChangeEmail={setEmail}
            onChangePhone={setPhonenumber}
            onCancel={() => setShowForm(false)}
            onSave={handleCreate}
            saving={createContact.isPending}
          />
        ) : (
          <View className="flex-1 items-center justify-center py-12 px-6">
            <Ionicons name="person-outline" size={36} color="#CBD5E1" />
            <Text className="text-sm text-slate-400 mt-2">No contacts</Text>
            <TouchableOpacity onPress={() => setShowForm(true)} className="mt-4 px-4 py-2 rounded-lg bg-primary">
              <Text className="text-white font-medium">Add Contact</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="px-3 py-2 flex-row justify-end">
        <TouchableOpacity onPress={() => setShowForm((v) => !v)} className="px-3 py-1.5 rounded-lg bg-primary">
          <Text className="text-white text-xs font-semibold">{showForm ? "Cancel" : "Add Contact"}</Text>
        </TouchableOpacity>
      </View>
      {showForm ? (
        <ContactForm
          firstname={firstname}
          lastname={lastname}
          email={email}
          phonenumber={phonenumber}
          onChangeFirst={setFirstname}
          onChangeLast={setLastname}
          onChangeEmail={setEmail}
          onChangePhone={setPhonenumber}
          onCancel={() => setShowForm(false)}
          onSave={handleCreate}
          saving={createContact.isPending}
        />
      ) : null}
      <FlatList
      data={data}
      keyExtractor={(c) => String(c.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item: contact }) => (
        <View className="bg-white rounded-xl p-3.5 shadow-sm">
          <View className="flex-row items-center">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-sm font-semibold text-slate-900">
                  {contact.firstname} {contact.lastname}
                </Text>
                {contact.is_primary === 1 && (
                  <View className="ml-2 px-1.5 py-0.5 rounded bg-sky-100">
                    <Text className="text-[9px] font-bold text-sky-700">PRIMARY</Text>
                  </View>
                )}
              </View>
              {contact.title && (
                <Text className="text-xs text-slate-500 mt-0.5">{contact.title}</Text>
              )}
              <Text className="text-xs text-slate-600 mt-0.5">{contact.email}</Text>
            </View>
            <View className="flex-row gap-2">
              {contact.phonenumber && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${contact.phonenumber}`)}
                  className="w-8 h-8 rounded-full bg-green-50 items-center justify-center"
                >
                  <Ionicons name="call-outline" size={15} color="#16A34A" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => Linking.openURL(`mailto:${contact.email}`)}
                className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
              >
                <Ionicons name="mail-outline" size={15} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  handleDelete(
                    contact.id,
                    `${contact.firstname} ${contact.lastname || ""}`.trim() || contact.email
                  )
                }
                className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={15} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    />
    </View>
  );
}

function ContactForm({
  firstname,
  lastname,
  email,
  phonenumber,
  onChangeFirst,
  onChangeLast,
  onChangeEmail,
  onChangePhone,
  onCancel,
  onSave,
  saving,
}: {
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  onChangeFirst: (v: string) => void;
  onChangeLast: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePhone: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View className="mx-3 mb-2 bg-white rounded-xl p-3 shadow-sm">
      <TextInput className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder="First name *" value={firstname} onChangeText={onChangeFirst} />
      <TextInput className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder="Last name" value={lastname} onChangeText={onChangeLast} />
      <TextInput className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder="Email *" value={email} onChangeText={onChangeEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput className="border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" placeholder="Phone" value={phonenumber} onChangeText={onChangePhone} keyboardType="phone-pad" />
      <View className="flex-row gap-2">
        <TouchableOpacity onPress={onCancel} className="flex-1 py-2 rounded-lg bg-slate-100 items-center">
          <Text className="text-slate-700 font-medium">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary items-center" style={{ opacity: saving ? 0.6 : 1 }}>
          <Text className="text-white font-medium">{saving ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tab: Invoices ───────────────────────────────────────────────────────

function InvoicesTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerInvoices(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="document-text-outline" text="No invoices" />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/invoices/${item.id}` as any)}
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <View className="flex-row items-center">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                {item.invoice_number || item.number || `#${item.id}`}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">{item.date}</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-slate-900">
                {Number(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <StatusPill status={item.status} type="invoice" />
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Tab: Estimates ──────────────────────────────────────────────────────

function EstimatesTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerEstimates(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="reader-outline" text="No estimates" />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/estimates/${item.id}` as any)}
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <View className="flex-row items-center">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                {item.estimate_number || item.number || `#${item.id}`}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">{item.date}</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-slate-900">
                {Number(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
              <StatusPill status={item.status} type="estimate" />
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Tab: Projects ───────────────────────────────────────────────────────

function ProjectsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerProjects(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="folder-outline" text="No projects" />;

  const statusLabels: Record<string, string> = {
    "1": "Not Started",
    "2": "In Progress",
    "3": "On Hold",
    "4": "Finished",
    "5": "Cancelled",
  };

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/projects/${item.id}` as any)}
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>{item.name}</Text>
          <View className="flex-row items-center mt-1.5">
            <View className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden mr-3">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Number(item.progress || 0))}%`,
                  backgroundColor: Number(item.progress) >= 100 ? "#16A34A" : "#2563EB",
                }}
              />
            </View>
            <Text className="text-xs text-slate-500">{item.progress || 0}%</Text>
          </View>
          <View className="flex-row items-center mt-1 gap-3">
            <Text className="text-xs text-slate-500">
              {statusLabels[String(item.status)] || `Status ${item.status}`}
            </Text>
            {item.deadline && (
              <Text className="text-xs text-slate-400">Due: {item.deadline}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Tab: Contracts ──────────────────────────────────────────────────────

function ContractsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerContracts(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="document-lock-outline" text="No contracts" />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/contracts/${item.id}` as any)}
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>{item.subject}</Text>
          <View className="flex-row items-center mt-1 gap-3">
            {item.contract_value && (
              <Text className="text-xs font-semibold text-slate-700">
                {Number(item.contract_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            )}
            <Text className="text-xs text-slate-500">
              {item.datestart} → {item.dateend || "Ongoing"}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Tab: Tasks ──────────────────────────────────────────────────────────

function TasksTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerTasks(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="checkbox-outline" text="No tasks" />;

  const priorityColors: Record<string, string> = {
    "1": "#64748B",
    "2": "#F59E0B",
    "3": "#EA580C",
    "4": "#DC2626",
  };

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/tasks/${item.id}` as any)}
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <View className="flex-row items-center">
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: priorityColors[String(item.priority)] || "#64748B" }}
            />
            <Text className="text-sm font-medium text-slate-900 flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <StatusPill status={item.status} type="task" />
          </View>
          {item.duedate && (
            <Text className="text-xs text-slate-500 mt-1 ml-4">Due: {item.duedate}</Text>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Tab: Tickets ────────────────────────────────────────────────────────

function TicketsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerTickets(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="help-buoy-outline" text="No tickets" />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.ticketid || item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/tickets/${item.ticketid || item.id}` as any)}
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>{item.subject}</Text>
          <View className="flex-row items-center mt-1 gap-3">
            <StatusPill status={item.status} type="ticket" />
            <Text className="text-xs text-slate-500">{item.date}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Tab: Proposals ──────────────────────────────────────────────────────

function ProposalsTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerProposals(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="newspaper-outline" text="No proposals" />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/proposals/${item.id}` as any)}
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>{item.subject}</Text>
          <View className="flex-row items-center mt-1 gap-3">
            {item.total && (
              <Text className="text-xs font-semibold text-slate-700">
                {Number(item.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            )}
            <Text className="text-xs text-slate-500">{item.date}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Tab: Expenses ───────────────────────────────────────────────────────

function ExpensesTab({ customerId }: { customerId: string }) {
  const { data, isLoading } = useCustomerExpenses(customerId);

  if (isLoading) return <LoadingState />;
  if (!data || data.items.length === 0) return <EmptyState icon="receipt-outline" text="No expenses" />;

  return (
    <FlatList
      data={data.items}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item }) => (
        <TouchableOpacity
          className="bg-white rounded-xl p-3.5 shadow-sm"
          activeOpacity={0.72}
        >
          <View className="flex-row items-center">
            <View className="flex-1">
              <Text className="text-sm font-medium text-slate-900" numberOfLines={1}>
                {item.expense_name || item.category_name || `Expense #${item.id}`}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">{item.date}</Text>
            </View>
            <Text className="text-sm font-bold text-slate-900">
              {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <ActivityIndicator size="small" color={ACCENT} />
    </View>
  );
}

function EmptyState({ icon, text }: { icon: any; text: string }) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <Ionicons name={icon} size={36} color="#CBD5E1" />
      <Text className="text-sm text-slate-400 mt-2">{text}</Text>
    </View>
  );
}

const STATUS_CONFIGS: Record<string, Record<string, { label: string; bg: string; color: string }>> = {
  invoice: {
    "1": { label: "Unpaid", bg: "#FEF2F2", color: "#DC2626" },
    "2": { label: "Sent", bg: "#EFF6FF", color: "#2563EB" },
    "3": { label: "Partial", bg: "#FFFBEB", color: "#D97706" },
    "4": { label: "Paid", bg: "#F0FDF4", color: "#16A34A" },
    "5": { label: "Cancelled", bg: "#F1F5F9", color: "#64748B" },
    "6": { label: "Draft", bg: "#F1F5F9", color: "#64748B" },
  },
  estimate: {
    "1": { label: "Draft", bg: "#F1F5F9", color: "#64748B" },
    "2": { label: "Sent", bg: "#EFF6FF", color: "#2563EB" },
    "3": { label: "Declined", bg: "#FEF2F2", color: "#DC2626" },
    "4": { label: "Accepted", bg: "#F0FDF4", color: "#16A34A" },
    "5": { label: "Expired", bg: "#F1F5F9", color: "#94A3B8" },
  },
  task: {
    "1": { label: "Not Started", bg: "#F1F5F9", color: "#64748B" },
    "2": { label: "Awaiting", bg: "#FFFBEB", color: "#D97706" },
    "3": { label: "Testing", bg: "#F5F3FF", color: "#7C3AED" },
    "4": { label: "In Progress", bg: "#EFF6FF", color: "#2563EB" },
    "5": { label: "Complete", bg: "#F0FDF4", color: "#16A34A" },
  },
  ticket: {
    "1": { label: "Open", bg: "#FEF2F2", color: "#DC2626" },
    "2": { label: "In Progress", bg: "#EFF6FF", color: "#2563EB" },
    "3": { label: "Answered", bg: "#F0FDF4", color: "#16A34A" },
    "4": { label: "On Hold", bg: "#FFFBEB", color: "#D97706" },
    "5": { label: "Closed", bg: "#F1F5F9", color: "#64748B" },
  },
};

function StatusPill({ status, type }: { status: any; type: string }) {
  const s = String(status);
  const config = STATUS_CONFIGS[type]?.[s] || { label: s, bg: "#F1F5F9", color: "#64748B" };
  return (
    <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: config.bg }}>
      <Text className="text-[10px] font-semibold" style={{ color: config.color }}>
        {config.label}
      </Text>
    </View>
  );
}
