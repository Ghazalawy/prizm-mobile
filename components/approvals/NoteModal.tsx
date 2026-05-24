import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

/**
 * Reusable modal that prompts for a note before an approve/reject action.
 *
 * - `mode="approve"` — note is OPTIONAL, the button stays enabled even
 *   when the field is blank. Confirm color = green.
 * - `mode="reject"` — note is REQUIRED, minLength = 3. Confirm button is
 *   disabled until that's met. Confirm color = red.
 *
 * Both modes show the same canvas-style sheet (slides up from bottom),
 * so the user has a consistent muscle memory whether they're approving
 * or rejecting. The note text is what the approver wants to record under
 * their stamp in the approval timeline.
 *
 * Why a single component instead of two: 95% of the layout + behaviour is
 * shared. The only differences are the title, the verb on the button, the
 * tint, and whether the field is required — easy to express via props,
 * harder to keep in sync if forked.
 */
export type NoteMode = "approve" | "reject";

export function NoteModal({
  visible,
  mode,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  mode: NoteMode;
  busy: boolean;
  onCancel: () => void;
  /** Receives the trimmed note. Caller fires the network call + closes us
   *  on success. */
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();

  // Reset the field every time the modal re-opens so the user doesn't see
  // a stale note from a previous action.
  useEffect(() => {
    if (visible) setNote("");
  }, [visible]);

  const trimmed = note.trim();
  const valid = mode === "approve" ? true : trimmed.length >= 3;
  const cfg = mode === "approve"
    ? {
        title: "Approve request",
        hint: "Optional note — anything you'd like recorded under your approval stamp.",
        placeholder: "Add a note (optional)…",
        confirmLabel: "Approve",
        confirmIcon: "checkmark-done-circle-outline" as const,
        confirmBg: "#16A34A",
        confirmBgDisabled: "#16A34A",
        icon: "checkmark-circle" as const,
        iconColor: "#16A34A",
      }
    : {
        title: "Reject request",
        hint: "A reason is required. The requester sees this note under the red stamp.",
        placeholder: "Reason for rejection…",
        confirmLabel: "Reject",
        confirmIcon: "close-circle-outline" as const,
        confirmBg: "#DC2626",
        confirmBgDisabled: "#FCA5A5",
        icon: "close-circle" as const,
        iconColor: "#DC2626",
      };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent={Platform.OS === "android"}
      // navigationBarTranslucent on Android (RN 0.74+) lets the Modal
      // draw under the system nav bar so our own paddingBottom (insets.bottom)
      // is the SOLE thing keeping the action buttons clear of the nav bar.
      // Without this, the OS draws an opaque nav bar over the modal and
      // hides the Approve/Cancel buttons.
      navigationBarTranslucent={Platform.OS === "android"}
    >
      {/* Backdrop — tap to dismiss (unless busy). */}
      <Pressable
        onPress={busy ? undefined : onCancel}
        style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.55)" }}
      />
      <KeyboardAvoidingView
        // On iOS the keyboard pushes the sheet; on Android the system
        // adjustResize handles it. behavior="padding" only on iOS.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingHorizontal: 18,
            paddingTop: 14,
            // Bottom padding = visual gap + the device's bottom safe-area
            // inset (nav bar / gesture pill). Without insets.bottom the
            // Approve/Cancel buttons sink behind the Android nav bar on
            // 3-button-nav phones AND under the gesture pill on
            // gesture-nav phones. 16px floor for devices with zero inset.
            paddingBottom: Math.max(16, insets.bottom) + 12,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: -3 },
            elevation: 16,
          }}
        >
          {/* Drag handle — visual cue this is a sheet */}
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#CBD5E1",
              marginBottom: 12,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
            <Text className="text-base font-bold text-foreground ml-2">
              {cfg.title}
            </Text>
          </View>
          <Text className="text-xs text-muted mb-3">{cfg.hint}</Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={cfg.placeholder}
            placeholderTextColor="#94A3B8"
            multiline
            // 5 lines feels enough for a reason without overwhelming the
            // sheet — the field scrolls if the approver writes more.
            numberOfLines={5}
            maxLength={500}
            style={{
              minHeight: 110,
              maxHeight: 200,
              textAlignVertical: "top",
              backgroundColor: "#F8FAFC",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: "#0F172A",
              borderWidth: 1,
              borderColor: mode === "reject" && note.length > 0 && !valid
                ? "#FCA5A5"
                : "#E2E8F0",
            }}
            autoFocus={mode === "reject"}
            editable={!busy}
          />
          {mode === "reject" ? (
            <Text className="text-[11px] mt-1.5" style={{ color: valid ? "#94A3B8" : "#DC2626" }}>
              {trimmed.length}/500 · minimum 3 characters
            </Text>
          ) : (
            <Text className="text-[11px] mt-1.5 text-muted">
              {trimmed.length}/500
            </Text>
          )}

          <View className="flex-row mt-4">
            <TouchableOpacity
              onPress={onCancel}
              disabled={busy}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: "#F1F5F9",
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <Text className="text-foreground font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => valid && !busy && onConfirm(trimmed)}
              disabled={!valid || busy}
              activeOpacity={0.85}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: valid ? cfg.confirmBg : cfg.confirmBgDisabled,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                opacity: !valid && mode === "reject" ? 0.6 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name={cfg.confirmIcon} size={18} color="white" />
                  <Text className="text-white font-semibold ml-1.5">
                    {cfg.confirmLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
