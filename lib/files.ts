import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { API_URL } from "./config";
import { getAuthToken } from "./auth";

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
 * Upload a picked file as an attachment to any entity in Perfex. Encodes the
 * file as base64 and POSTs to /api/files/upload_bytes, which writes both the
 * DB row in tblfiles and the bytes to disk via the standard Files helper.
 *
 * Returns the created tblfiles row on success.
 */
export async function uploadAttachment(params: UploadParams): Promise<{ id: number; file_name: string }> {
  const token = await getAuthToken();
  const content_base64 = await FileSystem.readAsStringAsync(params.file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const res = await fetch(`${API_URL}/files/upload_bytes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { authtoken: token } : {}),
    },
    body: JSON.stringify({
      rel_type: params.relType,
      rel_id: params.relId,
      file_name: params.file.name,
      file_mime_type: params.file.mimeType,
      visible_to_customer: params.visibleToCustomer ? 1 : 0,
      content_base64,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try { message = JSON.parse(text).message || message; } catch {}
    throw new Error(message);
  }

  const j = await res.json();
  // upload_bytes_post returns { status: true, id: N, file_name: "..." }
  return { id: Number(j.id ?? j.data?.id ?? 0), file_name: j.file_name ?? params.file.name };
}
