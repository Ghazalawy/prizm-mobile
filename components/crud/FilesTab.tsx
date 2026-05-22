import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listEntities, normalizeList, deleteEntity, buildQS } from "@/lib/api";
import {
  pickDocument,
  pickImage,
  takePhoto,
  uploadAttachment,
} from "@/lib/files";
import { API_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/auth";
import Toast from "react-native-toast-message";

type FilesTabProps = {
  /** Perfex rel_type — "customer", "project", "task", "invoice", "lead", ... */
  relType: string;
  /** Parent entity ID. */
  relId: string;
  /** Tint colour from the parent module. */
  color: string;
};

/**
 * Attachments tab. Lists tblfiles rows scoped by rel_type+rel_id, with
 * Camera / Gallery / Document buttons up top to upload. Each row shows the
 * filename, size, who added it, and tappable open-in-app + delete.
 */
export function FilesTab({ relType, relId, color }: FilesTabProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const q = useQuery({
    queryKey: ["files", relType, relId],
    queryFn: () => listEntities("files", { rel_type: relType, rel_id: relId } as any),
  });

  const rows = normalizeList(q.data).items as FileRow[];

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["files", relType, relId] }),
    [queryClient, relType, relId]
  );

  const handleUpload = useCallback(
    async (
      sourceLabel: string,
      pick: () => Promise<{ uri: string; name: string; mimeType: string } | null>
    ) => {
      setUploading(true);
      try {
        const file = await pick();
        if (!file) return;
        await uploadAttachment({ relType, relId, file });
        Toast.show({ type: "success", text1: "Uploaded", text2: file.name });
        await invalidate();
      } catch (err: any) {
        Alert.alert(`${sourceLabel} upload failed`, err?.message || "Unknown error");
      } finally {
        setUploading(false);
      }
    },
    [relType, relId, invalidate]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEntity("files", id),
    onSuccess: () => invalidate(),
    onError: (err: any) => {
      Alert.alert("Couldn't delete", err?.message || "Unknown error");
    },
  });

  const handleDelete = useCallback(
    (file: FileRow) => {
      Alert.alert(
        "Delete file?",
        file.file_name,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMutation.mutate(Number(file.id)),
          },
        ]
      );
    },
    [deleteMutation]
  );

  const handleOpen = useCallback(async (file: FileRow) => {
    // Sign the download URL with the user's authtoken so the browser can fetch it.
    const token = await getAuthToken();
    const url = `${API_URL}/files/download/${encodeURIComponent(file.id)}${buildQS({ authtoken: token ?? "" })}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Couldn't open", "Your browser couldn't open the file.")
    );
  }, []);

  return (
    <View className="flex-1">
      {/* Upload actions */}
      <View className="flex-row items-center px-3 pt-3 pb-2 bg-surface">
        <UploadButton
          icon="camera-outline"
          label="Camera"
          color={color}
          disabled={uploading}
          onPress={() => handleUpload("Camera", takePhoto)}
        />
        <UploadButton
          icon="images-outline"
          label="Gallery"
          color={color}
          disabled={uploading}
          onPress={() => handleUpload("Gallery", pickImage)}
        />
        <UploadButton
          icon="document-outline"
          label="File"
          color={color}
          disabled={uploading}
          onPress={() => handleUpload("File", pickDocument)}
        />
      </View>

      {uploading ? (
        <View className="flex-row items-center px-4 py-2 bg-amber-50">
          <ActivityIndicator color="#B45309" />
          <Text className="text-amber-900 ml-2 text-sm">Uploading…</Text>
        </View>
      ) : null}

      {q.isLoading && !q.data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={color} />
        </View>
      ) : q.isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={48} color="#EF4444" />
          <Text className="text-foreground font-semibold mt-3">Couldn&apos;t load files</Text>
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="document-outline" size={48} color="#94A3B8" />
          <Text className="text-muted mt-3">No files yet</Text>
          <Text className="text-muted text-xs mt-1 text-center">
            Tap Camera / Gallery / File above to attach.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-3 shadow-sm flex-row items-center">
              <View
                className="w-10 h-10 rounded-lg items-center justify-center"
                style={{ backgroundColor: `${color}1A` }}
              >
                <Ionicons name={iconForMime(item.filetype)} size={20} color={color} />
              </View>
              <TouchableOpacity
                className="flex-1 ml-3"
                onPress={() => handleOpen(item)}
                activeOpacity={0.7}
              >
                <Text className="text-foreground font-medium" numberOfLines={1}>
                  {item.file_name || `File #${item.id}`}
                </Text>
                <Text className="text-xs text-muted mt-0.5">
                  {[formatBytes(item.filesize), item.dateadded].filter(Boolean).join(" · ")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                hitSlop={12}
                disabled={deleteMutation.isPending}
                className="ml-2 w-9 h-9 rounded-lg items-center justify-center bg-red-50"
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

function UploadButton({
  icon,
  label,
  color,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="flex-1 mx-1 flex-row items-center justify-center bg-white rounded-xl py-3 shadow-sm"
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text className="text-foreground font-medium ml-2 text-sm">{label}</Text>
    </TouchableOpacity>
  );
}

type FileRow = {
  id: number | string;
  file_name?: string;
  filetype?: string;
  filesize?: number | string;
  dateadded?: string;
};

function iconForMime(mime?: string): keyof typeof Ionicons.glyphMap {
  if (!mime) return "document-outline";
  if (mime.startsWith("image/")) return "image-outline";
  if (mime.startsWith("video/")) return "videocam-outline";
  if (mime.startsWith("audio/")) return "musical-notes-outline";
  if (mime.includes("pdf")) return "document-text-outline";
  if (mime.includes("sheet") || mime.includes("excel")) return "grid-outline";
  if (mime.includes("word") || mime.includes("doc")) return "document-text-outline";
  return "document-outline";
}

function formatBytes(bytes?: number | string): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
