import { apiRequest } from "./api";

export type SignedUrlResult = {
  url: string;
  file_id: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  expires_at: string;
};

/**
 * Mint a time-limited, publicly accessible URL for a tblfiles row.
 * Backed by GET /api/files/signed_url/{id} (JWT-auth) which returns a
 * signature-authenticated URL at /api/files/serve/{id}?exp=…&sig=….
 */
export async function getSignedUrl(
  fileId: number | string,
  ttlSeconds = 900,
): Promise<SignedUrlResult> {
  const res = await apiRequest(
    `files/signed_url/${encodeURIComponent(String(fileId))}?ttl_seconds=${ttlSeconds}`,
  );
  return res.data ?? res;
}
