import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import { API_URL } from "./config";
import { buildAuthHeaders, parseApiResponse } from "./api";
import { getSessionGeneration } from "./auth-events";

/**
 * Picked file from any source (camera / gallery / document picker). Normalised
 * shape — the caller doesn't need to know which picker produced it.
 */
export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
};

export type NativePastedFile = {
  uri: string;
  fileName?: string | null;
  name?: string | null;
  type?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  sizeBytes?: number | null;
};

export function normalizePastedFile(file: NativePastedFile): PickedFile {
  const mimeType = file.type || file.mimeType || "application/octet-stream";
  const ext = extensionForMime(mimeType);
  return {
    uri: file.uri,
    name: file.fileName || file.name || `pasted-${Date.now()}${ext}`,
    mimeType,
    sizeBytes: file.fileSize ?? file.sizeBytes ?? undefined,
  };
}

export async function pickClipboardImage(): Promise<PickedFile | null> {
  const hasImage = await Clipboard.hasImageAsync();
  if (!hasImage) return null;

  const result = await Clipboard.getImageAsync({ format: "png" });
  if (!result?.data) return null;

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Device cache is unavailable.");
  }

  const dir = `${cacheDir}clipboard/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);

  const name = `pasted-${Date.now()}.png`;
  const uri = `${dir}${name}`;
  const base64 = result.data.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri,
    name,
    mimeType: "image/png",
    sizeBytes: Math.floor((base64.length * 3) / 4),
  };
}

/** Launch the camera. Returns null if user cancelled or denied permission. */
export async function takePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName || `photo-${Date.now()}.jpg`,
    mimeType: a.mimeType || "image/jpeg",
    sizeBytes: a.fileSize,
  };
}

/** Pick from photo library. */
export async function pickImage(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.85,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.fileName || `media-${Date.now()}`,
    mimeType: a.mimeType || "image/jpeg",
    sizeBytes: a.fileSize,
  };
}

/** Pick any document (PDF, Office docs, etc.). */
export async function pickDocument(): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.name || `file-${Date.now()}`,
    mimeType: a.mimeType || "application/octet-stream",
    sizeBytes: a.size,
  };
}

type UploadParams = {
  relType: string;
  relId: string | number;
  file: PickedFile;
  visibleToCustomer?: boolean;
};

/**
 * Upload a picked file as an attachment to any entity in Perfex via
 * multipart/form-data — bytes never base64-encoded in JSON.
 */
export async function uploadAttachment(params: UploadParams): Promise<{ id: number; file_name: string }> {
  const gen = getSessionGeneration();
  const tokenHeaders = await buildAuthHeaders();
  const { "Content-Type": _drop, ...headers } = tokenHeaders as Record<string, string>;

  const form = new FormData();
  form.append("file", {
    uri: params.file.uri,
    name: params.file.name,
    type: params.file.mimeType,
  } as unknown as Blob);
  form.append("rel_type", params.relType);
  form.append("rel_id", String(params.relId));
  form.append("filetype", params.file.mimeType);
  if (params.visibleToCustomer) {
    form.append("visible_to_customer", "1");
  }

  const res = await fetch(`${API_URL}/files/upload_multipart`, {
    method: "POST",
    headers,
    body: form,
  });

  const token = tokenHeaders["authtoken"];
  const { body: j, invalidToken } = await parseApiResponse(res, !!token, gen);
  if (invalidToken) throw new Error("Session expired");
  if (!res.ok) {
    const message =
      (j && typeof j === "object" && j.message) || `HTTP ${res.status}`;
    throw new Error(message);
  }

  const data = (j as { data?: { file_id?: number; file_name?: string }; id?: number; file_name?: string })?.data ?? j;
  return {
    id: Number((data as { file_id?: number; id?: number }).file_id ?? (data as { id?: number }).id ?? 0),
    file_name: (data as { file_name?: string }).file_name ?? params.file.name,
  };
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  if (mimeType.includes("gif")) return ".gif";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("pdf")) return ".pdf";
  return "";
}
