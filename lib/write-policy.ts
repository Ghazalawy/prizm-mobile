import { BUILD_FLAGS } from "./build-info";

/**
 * Writes the mobile app must never send, whatever screen or link asks.
 *
 * Customer contacts are Perfex client-portal users: creating or activating one
 * hands an outside party a login to the ERP, and Perfex e-mails them on
 * creation. Prizm does not give customers system access, so the feature is
 * switched off (BUILD_FLAGS.customerContactWrites). Reading contacts stays
 * allowed — phone and e-mail are still shown to staff.
 */
const CUSTOMER_CONTACT_WRITE_RE = /^\/?(?:customers\/contacts|contacts)(?:[/?]|$)/i;

export const CUSTOMER_CONTACT_WRITES_DISABLED_MESSAGE =
  "Customer contacts are view-only in the mobile app.";

export function blockedWriteReason(endpoint: string, method: string | undefined): string | null {
  const verb = (method || "GET").toUpperCase();
  if (verb === "GET" || verb === "HEAD") return null;
  if (!BUILD_FLAGS.customerContactWrites && CUSTOMER_CONTACT_WRITE_RE.test(endpoint)) {
    return CUSTOMER_CONTACT_WRITES_DISABLED_MESSAGE;
  }
  return null;
}
