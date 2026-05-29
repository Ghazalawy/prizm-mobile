import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, normalizeList } from "@/lib/api";
import Toast from "react-native-toast-message";

type NotesPanelProps = {
  queryKey: (string | number)[];
  fetchEndpoint: string;
  postEndpoint: string;
  parentIdKey: string;
  parentId: string;
  accent?: string;
  placeholder?: string;
};

export function NotesPanel({
  queryKey,
  fetchEndpoint,
  postEndpoint,
  parentIdKey,
  parentId,
  accent = "#2563EB",
  placeholder = "Add a note…",
}: NotesPanelProps) {
  const [draft, setDraft] = useState("");
  const qc = useQueryClient();

  const notes = useQuery({
    queryKey,
    queryFn: async () => normalizeList(await apiRequest(fetchEndpoint)),
    enabled: !!parentId,
  });

  const addNote = useMutation({
    mutationFn: async (description: string) =>
      apiRequest(postEndpoint, {
        method: "POST",
        body: JSON.stringify({ [parentIdKey]: parentId, description, content: description }),
      }),
    onSuccess: async () => {
      setDraft("");
      await qc.invalidateQueries({ queryKey });
      Toast.show({ type: "success", text1: "Note added" });
    },
    onError: (e: Error) => Toast.show({ type: "error", text1: "Failed", text2: e.message }),
  });

  const items = notes.data?.items ?? [];

  return (
    <View className="flex-1">
      <View className="px-4 py-3 border-b border-slate-100 bg-white flex-row items-end gap-2">
        <TextInput
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-foreground min-h-[40px]"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <TouchableOpacity
          onPress={() => draft.trim() && addNote.mutate(draft.trim())}
          disabled={!draft.trim() || addNote.isPending}
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: accent }}
        >
          {addNote.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {notes.isLoading && !notes.data ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={accent} />
        </View>
      ) : items.length === 0 ? (
        <View className="py-8 items-center px-6">
          <Ionicons name="document-text-outline" size={36} color="#CBD5E1" />
          <Text className="text-sm text-muted mt-2 text-center">No notes yet</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          contentContainerStyle={{ padding: 12 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <View className="bg-white rounded-xl p-3 shadow-sm">
              <Text className="text-sm text-foreground">{item.description || item.content || ""}</Text>
              {item.dateadded ? (
                <Text className="text-xs text-muted mt-1">{String(item.dateadded).slice(0, 16)}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
