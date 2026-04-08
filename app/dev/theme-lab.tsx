import { View, Text, ScrollView } from "react-native";
import { Stack } from "expo-router";

export default function ThemeLabScreen() {
  const colors = [
    { name: "Primary", class: "bg-primary" },
    { name: "Primary 50", class: "bg-primary-50" },
    { name: "Primary 100", class: "bg-primary-100" },
    { name: "Success", class: "bg-success" },
    { name: "Warning", class: "bg-warning" },
    { name: "Destructive", class: "bg-destructive" },
    { name: "Surface", class: "bg-surface" },
    { name: "Card", class: "bg-card" },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Theme Lab" }} />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="p-4">
        <Text className="text-xl font-bold text-foreground mb-4">Color Palette</Text>
        {colors.map((c) => (
          <View key={c.name} className="flex-row items-center mb-3">
            <View className={`w-12 h-12 rounded-xl ${c.class} border border-gray-200`} />
            <Text className="text-foreground font-medium ml-3">{c.name}</Text>
            <Text className="text-muted text-sm ml-2">{c.class}</Text>
          </View>
        ))}

        <Text className="text-xl font-bold text-foreground mt-6 mb-4">Typography</Text>
        <Text className="text-3xl font-bold text-foreground mb-2">Heading 1</Text>
        <Text className="text-2xl font-bold text-foreground mb-2">Heading 2</Text>
        <Text className="text-xl font-semibold text-foreground mb-2">Heading 3</Text>
        <Text className="text-base text-foreground mb-2">Body text</Text>
        <Text className="text-sm text-muted mb-2">Muted text</Text>
        <Text className="text-xs text-muted">Caption</Text>
      </ScrollView>
    </>
  );
}
