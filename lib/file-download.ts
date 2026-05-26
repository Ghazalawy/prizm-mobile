import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import { buildAuthHeaders } from "./api";
import { API_URL } from "./config";

/**
 * Download a tblfiles attachment to the device cache and open the system
 * share sheet so the user can save / AirDrop / send it.
 */
export async function downloadAndShareFile(
  fileId: number | string,
  fileName: string,
): Promise<void> {
  const headers = await buildAuthHeaders();
  const url = `${API_URL}/files/download/${encodeURIComponent(String(fileId))}`;
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF ]/g, "_");
  const localUri = `${FileSystem.cacheDirectory}${safeFileName}`;

  Toast.show({ type: "info", text1: "Downloading…", text2: fileName, visibilityTime: 2000 });

  const result = await FileSystem.downloadAsync(url, localUri, { headers });

  if (result.status !== 200) {
    throw new Error(`Download failed (HTTP ${result.status})`);
  }

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(result.uri, {
      mimeType: result.headers?.["content-type"] || "application/octet-stream",
      dialogTitle: fileName,
      UTI: Platform.OS === "ios" ? utTypeForName(fileName) : undefined,
    });
  } else {
    Toast.show({ type: "success", text1: "Downloaded", text2: fileName });
  }
}

/**
 * Download a file from an arbitrary URL (e.g. report images) and share it.
 */
export async function downloadUrlAndShare(
  url: string,
  fileName: string,
): Promise<void> {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-\u0600-\u06FF ]/g, "_");
  const localUri = `${FileSystem.cacheDirectory}${safeFileName}`;

  Toast.show({ type: "info", text1: "Downloading…", text2: fileName, visibilityTime: 2000 });

  const result = await FileSystem.downloadAsync(url, localUri);

  if (result.status !== 200) {
    throw new Error(`Download failed (HTTP ${result.status})`);
  }

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(result.uri, {
      mimeType: result.headers?.["content-type"] || "application/octet-stream",
      dialogTitle: fileName,
    });
  } else {
    Toast.show({ type: "success", text1: "Downloaded", text2: fileName });
  }
}

function utTypeForName(name: string): string | undefined {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "com.adobe.pdf",
    doc: "com.microsoft.word.doc",
    docx: "org.openxmlformats.wordprocessingml.document",
    xls: "com.microsoft.excel.xls",
    xlsx: "org.openxmlformats.spreadsheetml.sheet",
    ppt: "com.microsoft.powerpoint.ppt",
    pptx: "org.openxmlformats.presentationml.presentation",
    zip: "com.pkware.zip-archive",
    txt: "public.plain-text",
    csv: "public.comma-separated-values-text",
  };
  return ext ? map[ext] : undefined;
}
