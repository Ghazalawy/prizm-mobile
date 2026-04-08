import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type MenuItemProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  color?: string;
};

function MenuItem({ title, icon, href, color = "#0F172A" }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={() => router.push(href as any)}
      className="bg-white flex-row items-center px-4 py-4 border-b border-gray-100"
      activeOpacity={0.7}
    >
      <View className="w-10 h-10 rounded-lg bg-primary-50 items-center justify-center mr-3">
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text className="text-foreground font-medium flex-1">{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  return (
    <ScrollView className="flex-1 bg-surface">
      <View className="mt-2 bg-white rounded-xl overflow-hidden mx-4 mb-4">
        <MenuItem title="Leads" icon="people-outline" href="/leads" />
        <MenuItem title="Clients" icon="business-outline" href="/clients" />
        <MenuItem title="Invoices" icon="document-text-outline" href="/invoices" />
        <MenuItem title="Estimates" icon="calculator-outline" href="/estimates" />
        <MenuItem title="Contracts" icon="document-outline" href="/contracts" />
        <MenuItem title="Expenses" icon="wallet-outline" href="/expenses" />
        <MenuItem title="Tickets" icon="ticket-outline" href="/tickets" />
        <MenuItem title="Calendar" icon="calendar-outline" href="/calendar" />
        <MenuItem title="Notifications" icon="notifications-outline" href="/notifications" />
      </View>
    </ScrollView>
  );
}
