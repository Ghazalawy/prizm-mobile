import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import { DateInput } from "@/components/crud/DateInput";
import {
  useSubmitLeave,
  LEAVE_REL_TYPES,
  TYPE_OF_LEAVE,
} from "@/lib/queries/my";

/**
 * Submit a leave request. Reachable via the FAB on the My Leave screen.
 *
 * Fields: rel_type (radio), type_of_leave (radio — only when rel_type === 1),
 * start date, end date, reason. Validates client-side then POSTs to
 * /api/my/leave/request which wraps Timesheets_model::add_requisition_ajax.
 */
export default function LeaveNewScreen() {
  const [relType, setRelType] = useState<number>(1); // default: Leave
  const [typeOfLeave, setTypeOfLeave] = useState<number>(8); // default: Annual
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const submit = useSubmitLeave();

  const canSubmit = useMemo(
    () => startDate.length >= 10 && endDate.length >= 10 && !submit.isPending,
    [startDate, endDate, submit.isPending]
  );

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert("Missing dates", "Please pick a start and end date.");
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Invalid range", "End date must be on or after start date.");
      return;
    }

    // Perfex expects datetime — pad to start of day / end of day
    const start_time = `${startDate} 09:00:00`;
    const end_time = `${endDate} 18:00:00`;

    submit.mutate(
      {
        rel_type: relType,
        type_of_leave: relType === 1 ? typeOfLeave : undefined,
        start_time,
        end_time,
        subject: subject || undefined,
        reason: reason || undefined,
      },
      {
        onSuccess: () => {
          Toast.show({
            type: "success",
            text1: "Leave request submitted",
            text2: "You'll be notified when your approver acts on it",
          });
          router.back();
        },
        onError: (err: any) => {
          Alert.alert("Submit failed", err?.message || "Please try again.");
        },
      }
    );
  };

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "Request Leave",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="px-2">
              <Ionicons name="chevron-back" size={28} color="#0284C7" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Leave type */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <Text className="text-xs uppercase text-muted tracking-wide mb-3">
            Type of absence
          </Text>
          {LEAVE_REL_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setRelType(t.id)}
              className="flex-row items-center py-2"
              activeOpacity={0.7}
            >
              <Ionicons
                name={relType === t.id ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={relType === t.id ? "#0284C7" : "#94A3B8"}
              />
              <Text
                className={`ml-3 text-sm ${
                  relType === t.id ? "text-foreground font-medium" : "text-muted"
                }`}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Type-of-leave sub-picker (only when rel_type === 1) */}
        {relType === 1 ? (
          <View className="mx-4 mt-4 bg-white rounded-2xl p-4">
            <Text className="text-xs uppercase text-muted tracking-wide mb-3">
              Leave kind
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {TYPE_OF_LEAVE.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTypeOfLeave(t.id)}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: typeOfLeave === t.id ? "#0284C7" : "#F1F5F9",
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: typeOfLeave === t.id ? "#FFFFFF" : "#475569" }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {/* Dates */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <Text className="text-xs uppercase text-muted tracking-wide mb-3">
            Dates
          </Text>
          <View className="mb-3">
            <Text className="text-xs text-muted mb-1">Start date</Text>
            <DateInput
              value={startDate}
              onChange={setStartDate}
              mode="date"
              placeholder="Pick start date"
            />
          </View>
          <View>
            <Text className="text-xs text-muted mb-1">End date</Text>
            <DateInput
              value={endDate}
              onChange={setEndDate}
              mode="date"
              placeholder="Pick end date"
            />
          </View>
        </View>

        {/* Subject + reason */}
        <View className="mx-4 mt-4 bg-white rounded-2xl p-4">
          <Text className="text-xs uppercase text-muted tracking-wide mb-3">
            Details
          </Text>
          <Text className="text-xs text-muted mb-1">Subject (optional)</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Family trip"
            placeholderTextColor="#94A3B8"
            className="border border-slate-200 rounded-lg px-3 py-2 text-foreground"
            style={{ minHeight: 40 }}
          />
          <Text className="text-xs text-muted mb-1 mt-3">Reason (optional)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Brief reason — visible to your approver"
            placeholderTextColor="#94A3B8"
            multiline
            className="border border-slate-200 rounded-lg px-3 py-2 text-foreground"
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className="mx-4 mt-6 rounded-2xl py-4 items-center justify-center"
          style={{
            backgroundColor: canSubmit ? "#0284C7" : "#94A3B8",
            opacity: canSubmit ? 1 : 0.7,
          }}
          activeOpacity={0.85}
        >
          {submit.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Submit leave request
            </Text>
          )}
        </TouchableOpacity>

        <Text className="text-xs text-muted text-center mx-6 mt-3">
          Your request will be sent to your assigned approver based on the
          timesheets approval rules. You can cancel from the My Leave screen
          while it's still pending.
        </Text>
      </ScrollView>
    </View>
  );
}
