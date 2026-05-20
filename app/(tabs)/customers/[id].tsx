import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useState, useCallback, ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import { getCustomer } from "@/lib/api";
import {
  useCountryName,
  useCurrencyName,
} from "@/lib/reference-data";

type Customer = {
  userid: number;
  company: string;
  vat?: string;
  phonenumber?: string;
  website?: string;
  default_currency?: number | string;
  default_language?: string;
  active?: number | string;
  // Primary address
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: number | string;
  // Billing address
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: number | string;
  // Shipping address
  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: number | string;
  // Meta
  datecreated?: string;
  registration_confirmed?: number | string;
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const [refreshing, setRefreshing] = useState(false);

  const q = useQuery({
    queryKey: ["customers", "detail", customerId],
    queryFn: () => getCustomer(customerId) as Promise<Customer>,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await q.refetch();
    setRefreshing(false);
  }, [q]);

  const customer = q.data;

  return (
    <View className="flex-1 bg-surface">
      {/* Top bar */}
      <View className="bg-white px-4 py-3 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-3 text-lg font-semibold text-foreground flex-1" numberOfLines={1}>
          {customer?.company ?? "Customer"}
        </Text>
      </View>

      {q.isLoading && !customer ? (
        <View className="py-20 items-center">
          <ActivityIndicator size="large" color="#0284C7" />
        </View>
      ) : q.isError ? (
        <View className="px-8 py-20 items-center">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load</Text>
          <Text className="text-muted text-sm mt-1 text-center">
            {(q.error as Error)?.message || "Unknown error"}
          </Text>
          <TouchableOpacity
            onPress={() => q.refetch()}
            className="mt-4 bg-primary px-6 py-2 rounded-lg"
            activeOpacity={0.7}
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !customer ? (
        <View className="px-8 py-20 items-center">
          <Text className="text-muted">Customer not found</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284C7" />
          }
        >
          <CustomerBody customer={customer} />
        </ScrollView>
      )}
    </View>
  );
}

function CustomerBody({ customer }: { customer: Customer }) {
  // FK resolution via cached reference data
  const countryName        = useCountryName(customer.country);
  const billingCountryName = useCountryName(customer.billing_country);
  const shippingCountryName = useCountryName(customer.shipping_country);
  const currencyName       = useCurrencyName(customer.default_currency);

  const isActive    = String(customer.active ?? "") === "1";
  const isConfirmed = String(customer.registration_confirmed ?? "") === "1";

  const hasPrimaryAddress  = !!(customer.address || customer.city || customer.state || customer.zip || countryName);
  const hasBillingAddress  = !!(customer.billing_street || customer.billing_city || customer.billing_state || customer.billing_zip || billingCountryName);
  const hasShippingAddress = !!(customer.shipping_street || customer.shipping_city || customer.shipping_state || customer.shipping_zip || shippingCountryName);

  return (
    <View className="p-3">
      {/* Hero */}
      <View className="bg-white rounded-2xl p-5 mb-3 shadow-sm">
        <Text className="text-2xl font-bold text-foreground" selectable>
          {customer.company}
        </Text>
        <View className="flex-row items-center mt-2 flex-wrap">
          <Badge
            color={isActive ? "#16A34A" : "#64748B"}
            label={isActive ? "Active" : "Inactive"}
          />
          {isConfirmed ? (
            <Badge color="#0284C7" label="Registered" className="ml-2" />
          ) : null}
          <Text className="text-xs text-muted ml-3">ID #{customer.userid}</Text>
        </View>
      </View>

      {/* Customer details */}
      <Section title="Customer Details">
        <Field label="Company" value={customer.company} />
        <Field label="VAT Number" value={customer.vat} />
        <Field label="Phone" value={customer.phonenumber} kind="phone" />
        <Field label="Website" value={customer.website} kind="url" />
        <Field label="Currency" value={currencyName} />
        <Field label="Language" value={customer.default_language} />
      </Section>

      {/* Primary address */}
      {hasPrimaryAddress ? (
        <Section title="Address">
          <Field label="Street" value={customer.address} />
          <Field label="City" value={customer.city} />
          <Field label="State" value={customer.state} />
          <Field label="Zip Code" value={customer.zip} />
          <Field label="Country" value={countryName} />
        </Section>
      ) : null}

      {/* Billing */}
      {hasBillingAddress ? (
        <Section title="Billing Address">
          <Field label="Street" value={customer.billing_street} />
          <Field label="City" value={customer.billing_city} />
          <Field label="State" value={customer.billing_state} />
          <Field label="Zip Code" value={customer.billing_zip} />
          <Field label="Country" value={billingCountryName} />
        </Section>
      ) : null}

      {/* Shipping */}
      {hasShippingAddress ? (
        <Section title="Shipping Address">
          <Field label="Street" value={customer.shipping_street} />
          <Field label="City" value={customer.shipping_city} />
          <Field label="State" value={customer.shipping_state} />
          <Field label="Zip Code" value={customer.shipping_zip} />
          <Field label="Country" value={shippingCountryName} />
        </Section>
      ) : null}

      {/* Meta */}
      <Section title="Meta">
        <Field label="Customer since" value={customer.datecreated} kind="date" />
      </Section>

      {/* "Coming soon" preview of tabs being built */}
      <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-2">
        <View className="flex-row items-center mb-2">
          <Ionicons name="construct-outline" size={18} color="#B45309" />
          <Text className="text-amber-900 font-semibold ml-2">More tabs coming soon</Text>
        </View>
        <Text className="text-amber-800 text-xs leading-relaxed">
          Contacts, Notes, Statement, Invoices, Payments, Proposals, Credit Notes, Estimates,
          Subscriptions, Portal Credentials, Expenses, Contracts, Projects, Tasks, Tickets,
          Files, Vault, Reminders, Map — these are being built natively. For now,
          open ms.prizm-energy.com to use those tabs on this customer.
        </Text>
      </View>
    </View>
  );
}

// ─── Layout primitives ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  // Filter out null children (Field renders null when empty) — if all children
  // are null, we don't show the section at all.
  const hasContent = Array.isArray(children)
    ? children.some((c) => c)
    : !!children;
  if (!hasContent) return null;
  return (
    <View className="mb-3">
      <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-1.5">
        {title}
      </Text>
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {children}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  kind,
}: {
  label: string;
  value: any;
  kind?: "phone" | "url" | "email" | "date";
}) {
  if (value === null || value === undefined || value === "" || value === "0000-00-00" || value === "0000-00-00 00:00:00") {
    return null;
  }
  const s = String(value);
  return (
    <View className="px-4 py-3 border-b border-gray-50 last:border-b-0">
      <Text className="text-xs text-muted">{label}</Text>
      <View className="mt-1">{renderValue(s, kind)}</View>
    </View>
  );
}

function renderValue(s: string, kind?: "phone" | "url" | "email" | "date") {
  if (kind === "phone" && /[\d+]/.test(s)) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(`tel:${s.replace(/[^+\d]/g, "")}`)}>
        <Text className="text-primary underline">{s}</Text>
      </TouchableOpacity>
    );
  }
  if (kind === "email") {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${s}`)}>
        <Text className="text-primary underline">{s}</Text>
      </TouchableOpacity>
    );
  }
  if (kind === "url") {
    const url = /^https?:\/\//.test(s) ? s : `https://${s}`;
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url)}>
        <Text className="text-primary underline" numberOfLines={2}>{s}</Text>
      </TouchableOpacity>
    );
  }
  if (kind === "date" && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      const d = new Date(s.replace(" ", "T"));
      if (!isNaN(d.getTime())) {
        return (
          <Text className="text-foreground">
            {d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </Text>
        );
      }
    } catch {}
  }
  return <Text className="text-foreground" selectable>{s}</Text>;
}

function Badge({
  color,
  label,
  className = "",
}: {
  color: string;
  label: string;
  className?: string;
}) {
  return (
    <View
      className={`px-2 py-0.5 rounded-full ${className}`}
      style={{ backgroundColor: `${color}22` }}
    >
      <Text className="text-[11px] font-semibold uppercase" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
