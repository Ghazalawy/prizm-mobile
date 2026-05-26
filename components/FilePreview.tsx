import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { WebView } from "react-native-webview";
import Toast from "react-native-toast-message";

import { getSignedUrl } from "@/lib/signed-url";
import { downloadAndShareFile, downloadUrlAndShare } from "@/lib/file-download";

// ─── Types ──────────────────────────────────────────────────────────────

export type PreviewFile = {
  id: number | string;
  file_name?: string;
  filetype?: string;
  filesize?: number | string;
  dateadded?: string;
};

export type FilePreviewProps = {
  /** When non-null the modal is shown. */
  file: PreviewFile | null;
  /** Pre-resolved direct URL (e.g. for images already fetched with authtoken). */
  directUrl?: string | null;
  /** Accent colour inherited from the parent module. */
  color?: string;
  onClose: () => void;
};

// ─── File-type helpers ──────────────────────────────────────────────────

type FileCategory = "image" | "pdf" | "office" | "other";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|heic|heif|svg)$/i;
const PDF_RE = /\.pdf$/i;
const OFFICE_RE = /\.(docx?|xlsx?|pptx?|odt|ods|odp)$/i;

function categorize(file: PreviewFile): FileCategory {
  const mime = (file.filetype || "").toLowerCase();
  const name = (file.file_name || "").toLowerCase();

  if (mime.startsWith("image/") || IMAGE_RE.test(name)) return "image";
  if (mime.includes("pdf") || PDF_RE.test(name)) return "pdf";
  if (
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("powerpoint") ||
    mime.includes("presentation") ||
    mime.includes("opendocument") ||
    OFFICE_RE.test(name)
  )
    return "office";
  return "other";
}

function iconForCategory(cat: FileCategory): keyof typeof Ionicons.glyphMap {
  switch (cat) {
    case "image":
      return "image-outline";
    case "pdf":
      return "document-text-outline";
    case "office":
      return "grid-outline";
    default:
      return "document-outline";
  }
}

function formatBytes(bytes?: number | string): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Main component ─────────────────────────────────────────────────────

export function FilePreview({ file, directUrl, color = "#3B82F6", onClose }: FilePreviewProps) {
  return (
    <Modal
      visible={!!file}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View className="flex-1 bg-[#0F172A]">
        {file ? (
          <PreviewContent file={file} directUrl={directUrl} color={color} onClose={onClose} />
        ) : null}
      </View>
    </Modal>
  );
}

function PreviewContent({
  file,
  directUrl,
  color,
  onClose,
}: {
  file: PreviewFile;
  directUrl?: string | null;
  color: string;
  onClose: () => void;
}) {
  const category = categorize(file);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(category !== "image");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (category === "image") return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSignedUrl(file.id, 600)
      .then((r) => {
        if (!cancelled) setSignedUrl(r.url);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Could not generate preview URL");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file.id, category]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      if (directUrl) {
        await downloadUrlAndShare(directUrl, file.file_name || `file-${file.id}`);
      } else {
        await downloadAndShareFile(file.id, file.file_name || `file-${file.id}`);
      }
    } catch (e: any) {
      Alert.alert("Download failed", e?.message || "Unknown error");
    } finally {
      setDownloading(false);
    }
  }, [file, directUrl]);

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────── */}
      <View
        className="flex-row items-center px-3 pb-2"
        style={{ paddingTop: Platform.OS === "ios" ? 56 : 40 }}
      >
        <TouchableOpacity
          onPress={onClose}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          hitSlop={8}
        >
          <Ionicons name="close" size={22} color="#FFF" />
        </TouchableOpacity>

        <View className="flex-1 mx-3">
          <Text className="text-white font-semibold text-sm" numberOfLines={1}>
            {file.file_name || `File #${file.id}`}
          </Text>
          <Text className="text-slate-400 text-xs" numberOfLines={1}>
            {[file.filetype || "", formatBytes(file.filesize)].filter(Boolean).join(" · ")}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleDownload}
          disabled={downloading}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          hitSlop={8}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="download-outline" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Body ────────────────────────────────────────── */}
      <View className="flex-1">
        {category === "image" ? (
          <ZoomableImage uri={directUrl || ""} />
        ) : loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={color} />
            <Text className="text-slate-400 mt-3">Preparing preview…</Text>
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={() => setError(null)} color={color} />
        ) : category === "pdf" && signedUrl ? (
          <DocumentWebView
            uri={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(signedUrl)}`}
            color={color}
          />
        ) : category === "office" && signedUrl ? (
          <OfficeViewer signedUrl={signedUrl} fileName={file.file_name} color={color} />
        ) : (
          <OtherFileCard file={file} color={color} onDownload={handleDownload} downloading={downloading} />
        )}
      </View>
    </>
  );
}

// ─── Zoomable image with pinch + pan + double-tap ───────────────────────

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const [imgLoading, setImgLoading] = useState(true);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTX.value = 0;
        savedTY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .onUpdate((e) => {
      translateX.value = savedTX.value + e.translationX;
      translateY.value = savedTY.value + e.translationY;
    })
    .onEnd(() => {
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1.5) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTX.value = 0;
        savedTY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan);
  const gesture = Gesture.Exclusive(doubleTap, composed);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View className="flex-1 items-center justify-center">
      {imgLoading ? (
        <ActivityIndicator
          size="large"
          color="#FFF"
          style={{ position: "absolute", zIndex: 10 }}
        />
      ) : null}
      <GestureDetector gesture={gesture}>
        <Animated.Image
          source={{ uri }}
          style={[{ width: SCREEN_W, height: SCREEN_H - 120 }, animatedStyle]}
          resizeMode="contain"
          onLoadStart={() => setImgLoading(true)}
          onLoadEnd={() => setImgLoading(false)}
        />
      </GestureDetector>
    </View>
  );
}

// ─── WebView wrapper for PDFs ───────────────────────────────────────────

function DocumentWebView({ uri, color }: { uri: string; color: string }) {
  const [loading, setLoading] = useState(true);
  const [webError, setWebError] = useState(false);

  if (webError) {
    return (
      <ErrorState
        message="Could not load the document preview. The file may be too large or temporarily unavailable."
        onRetry={() => setWebError(false)}
        color={color}
      />
    );
  }

  return (
    <View className="flex-1">
      {loading ? (
        <View className="absolute inset-0 items-center justify-center z-10">
          <ActivityIndicator size="large" color={color} />
          <Text className="text-slate-400 mt-3">Loading document…</Text>
        </View>
      ) : null}
      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: "#0F172A" }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setWebError(true);
        }}
        startInLoadingState={false}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit
        allowsInlineMediaPlayback
      />
    </View>
  );
}

// ─── Office document viewer with view/edit toggle ───────────────────────

function OfficeViewer({
  signedUrl,
  fileName,
  color,
}: {
  signedUrl: string;
  fileName?: string;
  color: string;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [loading, setLoading] = useState(true);
  const [webError, setWebError] = useState(false);

  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";

  const viewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;

  let editUrl: string;
  if (["xlsx", "xls"].includes(ext)) {
    editUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}&wdAllowInteractivity=True&AllowTyping=True`;
  } else if (["pptx", "ppt"].includes(ext)) {
    editUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
  } else {
    editUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
  }

  const uri = mode === "view" ? viewUrl : editUrl;

  if (webError) {
    return (
      <ErrorState
        message="Could not load the Office viewer. The file may be unsupported or temporarily unavailable."
        onRetry={() => {
          setWebError(false);
          setLoading(true);
        }}
        color={color}
      />
    );
  }

  return (
    <View className="flex-1">
      {/* Mode toggle */}
      <View className="flex-row items-center justify-center py-2 gap-2">
        <ModeButton
          label="View"
          icon="eye-outline"
          active={mode === "view"}
          color={color}
          onPress={() => {
            setMode("view");
            setLoading(true);
          }}
        />
        <ModeButton
          label="Edit"
          icon="create-outline"
          active={mode === "edit"}
          color={color}
          onPress={() => {
            setMode("edit");
            setLoading(true);
          }}
        />
      </View>

      <View className="flex-1">
        {loading ? (
          <View className="absolute inset-0 items-center justify-center z-10">
            <ActivityIndicator size="large" color={color} />
            <Text className="text-slate-400 mt-3">
              {mode === "edit" ? "Opening editor…" : "Loading document…"}
            </Text>
          </View>
        ) : null}
        <WebView
          key={mode}
          source={{ uri }}
          style={{ flex: 1, backgroundColor: "#0F172A" }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setWebError(true);
          }}
          startInLoadingState={false}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
        />
      </View>
    </View>
  );
}

function ModeButton({
  label,
  icon,
  active,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-2 rounded-full"
      style={{ backgroundColor: active ? color : "rgba(255,255,255,0.08)" }}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={15} color={active ? "#FFF" : "#94A3B8"} />
      <Text
        className="ml-1.5 text-sm font-semibold"
        style={{ color: active ? "#FFF" : "#94A3B8" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── "Other" file type card ─────────────────────────────────────────────

function OtherFileCard({
  file,
  color,
  onDownload,
  downloading,
}: {
  file: PreviewFile;
  color: string;
  onDownload: () => void;
  downloading: boolean;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
        style={{ backgroundColor: `${color}1A` }}
      >
        <Ionicons name="document-outline" size={40} color={color} />
      </View>
      <Text className="text-white font-semibold text-lg text-center">
        {file.file_name || `File #${file.id}`}
      </Text>
      <Text className="text-slate-400 text-sm mt-1 text-center">
        {[file.filetype || "Unknown type", formatBytes(file.filesize), file.dateadded]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      <Text className="text-slate-500 text-xs mt-4 text-center">
        This file type cannot be previewed in-app.{"\n"}Download it to view on your device.
      </Text>

      <TouchableOpacity
        onPress={onDownload}
        disabled={downloading}
        className="mt-6 flex-row items-center px-8 py-3.5 rounded-xl"
        style={{ backgroundColor: color }}
        activeOpacity={0.8}
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Ionicons name="download-outline" size={18} color="#FFF" />
            <Text className="text-white font-semibold ml-2">Download & Share</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Error / retry state ────────────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
  color,
}: {
  message: string;
  onRetry: () => void;
  color: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name="cloud-offline-outline" size={56} color="#EF4444" />
      <Text className="text-white font-semibold text-base mt-3 text-center">
        Preview unavailable
      </Text>
      <Text className="text-slate-400 text-sm mt-1 text-center">{message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        className="mt-5 px-6 py-2.5 rounded-xl"
        style={{ backgroundColor: color }}
      >
        <Text className="text-white font-semibold">Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
