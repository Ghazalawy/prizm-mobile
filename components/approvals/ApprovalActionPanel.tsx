import { ActivityIndicator, Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL, BASE_URL } from "@/lib/config";
import { buildAuthHeaders, parseApiResponse } from "@/lib/api";
import Toast from "react-native-toast-message";
import { NoteModal, type NoteMode } from "./NoteModal";

/**
 * Bottom action panel for a Purchase Request approval screen.
 *
 * v2 (this file) ships the REAL native approve/reject flow:
 *   - "Approve" → opens NoteModal in approve-mode (note optional) →
 *     POST /api/purchase_api/requests/{id}/approve { note? }
 *   - "Reject"  → opens NoteModal in reject-mode  (note REQUIRED, 3+) →
 *     POST /api/purchase_api/requests/{id}/reject  { note }
 *
 * On success: toast + invalidate the cached PR approval state so the
 * parent screen redraws with the new stamp + the typed note under it.
 *
 * On failure: toast with the server message. The web-fallback link is
 * kept as a tiny last-resort affordance for the rare edge case where
 * the mobile endpoint returns 5xx — but it's no longer the primary
 * action.
 *
 * Auth: backend enforces "you are the current approver for this PR's
 * active stage" (via prz_purchase_request_statusdetail.is_current_status
 * = 1 AND approver = caller). We additionally hide the buttons entirely
 * for viewers who aren't currently the approver — the same flag the old
 * read-only banner used.
 */
export function ApprovalActionPanel({
  isCurrentApprover,
  statusDetailID,
  webFallbackPath,
  requestId,
}: {
  isCurrentApprover: boolean;
  /** The specific tblprzpurcahse_req_statusdetail.id this viewer should
   *  act on. From viewer.actionable_status_detail_id on the read endpoint.
   *  Sent to the backend so it updates the EXACT row instead of guessing,
   *  matching the web admin's approval_process(rowID, status) pattern. */
  statusDetailID: number;
  /** Perfex web URL fragment for the rare "Open in web" backup link,
   *  relative to /MS/admin/. */
  webFallbackPath: string;
  /** PR id — used by the approve/reject endpoint URL. */
  requestId: number;
}) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<NoteMode | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ kind, note }: { kind: NoteMode; note: string }) => {
      // buildAuthHeaders adds authtoken + X-Impersonate-Staff-Id (View-As)
      // so admin-while-viewing-as-X's approve action posts as X.
      const headers = await buildAuthHeaders();
      const res = await fetch(
        `${API_URL}/purchase_api/requests/${encodeURIComponent(String(requestId))}/${kind}`,
        {
          method: "POST",
          headers,
          // Send statusDetailID so the backend updates the right row.
          // Backend re-verifies it belongs to the viewer before mutating,
          // so a tampered ID can't approve someone else's stage.
          body: JSON.stringify({ note, statusDetailID }),
        },
      );
      const { body, invalidToken } = await parseApiResponse(res, !!headers["authtoken"]);
      if (invalidToken) throw new Error("Session expired");
      if (!res.ok) {
        const msg =
          (typeof body === "object" && body?.message) ||
          (typeof body === "string" ? body : null) ||
          `HTTP ${res.status}`;
        throw new Error(String(msg).slice(0, 220));
      }
      if (body && body.status === false) {
        throw new Error(body.message || "Action failed");
      }
      return body;
    },
    onSuccess: (_data, vars) => {
      Toast.show({
        type: "success",
        text1: vars.kind === "approve" ? "Approved ✓" : "Rejected",
        text2:
          vars.kind === "approve"
            ? "The next approver has been notified."
            : "Reason recorded.",
      });
      setModal(null);
      // Refresh both the approval-state query (drives the timeline) and
      // the inbox (so the approval badge decrements). Key matches the
      // shape used by lib/queries/purchase-request.ts.
      qc.invalidateQueries({ queryKey: ["purchase_request_approval", requestId] });
      qc.invalidateQueries({ queryKey: ["inbox"] });
    },
    onError: (err: any) => {
      Toast.show({
        type: "error",
        text1: "Action failed",
        text2: err?.message?.slice(0, 140) ?? "Please try again.",
      });
    },
  });

  const openInWeb = useCallback(async () => {
    const url = `${BASE_URL}/MS/admin/${webFallbackPath.replace(/^\/+/, "")}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open web", "Browser couldn't open the link.");
    }
  }, [webFallbackPath]);

  // Non-approver path: render NOTHING. The Approvers grid above this
  // panel already shows every approver's stamp + the viewer's "YOU"
  // pill, which is plenty of "what's my role here?" signal. The old
  // eye-banner ("You're not the current approver — view only") was
  // redundant and the user explicitly asked for it gone.
  if (!isCurrentApprover) return null;

  return (
    <View className="bg-white rounded-2xl px-4 py-4 mb-3 shadow-sm">
      <Text className="text-xs uppercase tracking-wide text-muted mb-3">
        Your action
      </Text>

      <View className="flex-row">
        {/* Approve — green primary action */}
        <TouchableOpacity
          onPress={() => setModal("approve")}
          disabled={mutation.isPending}
          activeOpacity={0.85}
          style={{
            flex: 1,
            paddingVertical: 13,
            borderRadius: 12,
            backgroundColor: "#16A34A",
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            marginRight: 8,
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending && mutation.variables?.kind === "approve" ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-done-circle-outline" size={18} color="white" />
              <Text className="text-white font-semibold ml-1.5">Approve</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Reject — red secondary action */}
        <TouchableOpacity
          onPress={() => setModal("reject")}
          disabled={mutation.isPending}
          activeOpacity={0.85}
          style={{
            flex: 1,
            paddingVertical: 13,
            borderRadius: 12,
            backgroundColor: "#DC2626",
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending && mutation.variables?.kind === "reject" ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color="white" />
              <Text className="text-white font-semibold ml-1.5">Reject</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Tiny tertiary fallback — only here for the rare 5xx case where
          a stage's underlying state is corrupt and only the web admin
          can untangle it. Most users will never tap this. */}
      <TouchableOpacity
        onPress={openInWeb}
        activeOpacity={0.7}
        className="mt-3 self-center flex-row items-center"
      >
        <Ionicons name="open-outline" size={12} color="#94A3B8" />
        <Text className="text-[11px] text-muted ml-1">Open in web admin</Text>
      </TouchableOpacity>

      <NoteModal
        visible={modal !== null}
        mode={modal ?? "approve"}
        busy={mutation.isPending}
        onCancel={() => {
          if (!mutation.isPending) setModal(null);
        }}
        onConfirm={(note) => {
          if (modal) {
            mutation.mutate({ kind: modal, note });
          }
        }}
      />
    </View>
  );
}
