import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { Text, TouchableOpacity, View } from "react-native";
import { apiRequest } from "@/lib/api";

type DepartmentImapToolsProps = {
  id?: string;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
};

type ImapResult = {
  status?: boolean;
  message?: string;
  data?: { folders?: string[]; folder?: string };
};

export function DepartmentImapTools({ id, values, onChange }: DepartmentImapToolsProps) {
  const imapMutation = useMutation({
    mutationFn: async (action: "folders" | "test_imap") => {
      const payload = {
        email: values.email || "",
        imap_username: values.imap_username || "",
        host: values.host || "",
        password: values.password || "",
        encryption: values.encryption || "",
        folder: values.folder || "",
      };
      return apiRequest(`setup_api/departments/${id || 0}/${action}`, {
        method: "POST",
        body: JSON.stringify(payload),
      }) as Promise<ImapResult>;
    },
  });

  const folders = imapMutation.data?.data?.folders || [];
  const resultMessage = imapMutation.isError
    ? (imapMutation.error as Error)?.message || "IMAP connection failed"
    : imapMutation.data?.message;

  return (
    <View className="mb-3">
      <Text className="text-xs text-muted uppercase tracking-wide px-2 mb-1.5">
        Mailbox Tools
      </Text>
      <View className="bg-white rounded-2xl shadow-sm px-4 py-4">
        <View className="flex-row items-start">
          <View className="w-9 h-9 rounded-xl bg-teal-50 items-center justify-center mr-3">
            <Ionicons name="mail-outline" size={20} color="#0F766E" />
          </View>
          <View className="flex-1">
            <Text className="text-foreground font-semibold">Incoming email connection</Text>
            <Text className="text-muted text-xs mt-0.5 leading-4">
              Check this mailbox or discover selectable folders before saving.
            </Text>
          </View>
        </View>

        <View className="flex-row mt-3">
          <ActionButton
            title="Retrieve folders"
            icon="refresh-outline"
            busy={imapMutation.isPending && imapMutation.variables === "folders"}
            disabled={imapMutation.isPending}
            onPress={() => imapMutation.mutate("folders")}
          />
          <View className="w-2" />
          <ActionButton
            title="Test connection"
            icon="pulse-outline"
            busy={imapMutation.isPending && imapMutation.variables === "test_imap"}
            disabled={imapMutation.isPending}
            onPress={() => imapMutation.mutate("test_imap")}
          />
        </View>

        {folders.length > 0 ? (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-xs text-muted mb-2">Select a mailbox folder</Text>
            <View className="flex-row flex-wrap">
              {folders.map((folder) => {
                const selected = folder === values.folder;
                return (
                  <TouchableOpacity
                    key={folder}
                    onPress={() => onChange("folder", folder)}
                    className={`rounded-full px-3 py-1.5 mr-2 mb-2 ${selected ? "bg-teal-700" : "bg-gray-100"}`}
                  >
                    <Text className={`text-xs font-medium ${selected ? "text-white" : "text-foreground"}`}>
                      {folder}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {resultMessage ? (
          <View className={`mt-3 rounded-xl px-3 py-2.5 flex-row items-start ${imapMutation.isError ? "bg-red-50" : "bg-emerald-50"}`}>
            <Ionicons
              name={imapMutation.isError ? "alert-circle-outline" : "checkmark-circle-outline"}
              size={18}
              color={imapMutation.isError ? "#DC2626" : "#059669"}
            />
            <Text className={`flex-1 ml-2 text-xs leading-4 ${imapMutation.isError ? "text-red-700" : "text-emerald-700"}`}>
              {resultMessage}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  title,
  icon,
  busy,
  disabled,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      className={`flex-1 h-10 rounded-xl border border-teal-200 bg-teal-50 flex-row items-center justify-center ${disabled ? "opacity-60" : ""}`}
    >
      <Ionicons name={busy ? "hourglass-outline" : icon} size={17} color="#0F766E" />
      <Text className="text-teal-800 text-xs font-semibold ml-1.5">{title}</Text>
    </TouchableOpacity>
  );
}
