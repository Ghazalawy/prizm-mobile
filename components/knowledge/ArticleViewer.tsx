import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { rtlTextStyle, isArabic } from "@/lib/rtl";
import Toast from "react-native-toast-message";
import {
  useKBArticle,
  usePublishKBArticle,
  useUnpublishKBArticle,
  useDeleteKBArticle,
} from "@/lib/queries/knowledge";
import { usePermissions } from "@/lib/permission-context";

// ─── Simple HTML → Text/RN renderer ─────────────────────────────────────

const TAG_RE = /<[^>]+>/g;
const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};
const ENTITY_RE = /&(?:amp|lt|gt|quot|#39|nbsp);/g;

function stripHtml(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "  • ")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(TAG_RE, "")
    .replace(ENTITY_RE, (m) => ENTITY_MAP[m] ?? m);
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

// ─── Article Viewer ──────────────────────────────────────────────────────

export function ArticleViewer({ id }: { id: string | number }) {
  const { data: article, isLoading, isError } = useKBArticle(id);
  const permissions = usePermissions();
  const publish = usePublishKBArticle();
  const unpublish = useUnpublishKBArticle();
  const remove = useDeleteKBArticle();
  const { width } = useWindowDimensions();

  const handleShare = async () => {
    if (!article) return;
    try {
      await Share.share({
        title: article.subject,
        message: `${article.subject}\n\nOpen it from Prizm CRM mobile.`,
      });
    } catch {
      // User cancelled
    }
  };

  const handlePublication = async () => {
    if (!article) return;
    try {
      if (Number(article.active) === 1) await unpublish.mutateAsync(article.articleid);
      else await publish.mutateAsync(article.articleid);
      Toast.show({ type: "success", text1: Number(article.active) === 1 ? "Article unpublished" : "Article published" });
    } catch (error: any) {
      Toast.show({ type: "error", text1: error?.message || "Couldn’t update article" });
    }
  };

  const handleDelete = () => {
    if (!article) return;
    Alert.alert("Delete article", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync(article.articleid);
            Toast.show({ type: "success", text1: "Article deleted" });
            router.replace("/(tabs)/knowledge" as any);
          } catch (error: any) {
            Toast.show({ type: "error", text1: error?.message || "Couldn’t delete article" });
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !article) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
        <Text className="text-sm text-muted mt-3">
          Failed to load article
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-4 py-2 rounded-lg bg-slate-100"
        >
          <Text className="text-sm font-medium text-foreground">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = Number(article.active) === 1;
  const content = article.description
    ? stripHtml(article.description)
    : "No content available.";
  const contentIsArabic = isArabic(content);

  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text className="text-sm font-medium text-muted flex-1 text-center mx-4" numberOfLines={1}>
          Article
        </Text>
        <TouchableOpacity onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 pb-10"
      >
        {/* Title */}
        <Text
          className="text-2xl font-bold text-foreground mb-3 leading-snug"
          style={rtlTextStyle(article.subject)}
        >
          {article.subject}
        </Text>

        {/* Meta badges */}
        <View className="flex-row items-center gap-2 mb-5 flex-wrap">
          {article.group_name && (
            <View
              className="px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: colors.infoBg }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.info }}
              >
                {article.group_name}
              </Text>
            </View>
          )}
          <View
            className="px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: isActive ? colors.successBg : colors.slate100,
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{
                color: isActive ? colors.success : colors.slate500,
              }}
            >
              {isActive ? "Published" : "Draft"}
            </Text>
          </View>
          {article.datecreated && (
            <Text className="text-xs text-muted">
              {new Date(article.datecreated).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
          )}
        </View>

        {/* Content */}
        <View className="bg-white rounded-2xl p-4">
          <Text
            className="text-base text-foreground leading-relaxed"
            style={contentIsArabic ? { writingDirection: "rtl", textAlign: "right" } : undefined}
          >
            {content}
          </Text>
        </View>

        {permissions.canEdit("knowledge_base") ? (
          <View className="flex-row mt-4">
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/erp/knowledge/${article.articleid}/edit` as any)}
              className="flex-1 rounded-xl items-center py-3 bg-slate-100 mr-2"
            >
              <Text className="font-semibold text-slate-700">Edit article</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePublication}
              disabled={publish.isPending || unpublish.isPending}
              className="flex-1 rounded-xl items-center py-3"
              style={{ backgroundColor: isActive ? colors.slate100 : colors.primaryBg }}
            >
              <Text className="font-semibold" style={{ color: isActive ? colors.slate700 : colors.primary }}>
                {isActive ? "Unpublish" : "Publish"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {permissions.canDelete("knowledge_base") ? (
          <TouchableOpacity
            onPress={handleDelete}
            disabled={remove.isPending}
            className="mt-2 rounded-xl items-center py-3 bg-red-50"
          >
            <Text className="font-semibold text-red-600">Delete article</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}
