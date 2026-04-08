import { View, Text } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";

export default function CalendarEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Event Detail" }} />
      <View className="flex-1 bg-surface items-center justify-center p-4">
        <Text className="text-muted">Event #{id}</Text>
      </View>
    </>
  );
}
