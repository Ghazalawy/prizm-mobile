import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import {
  VAULT_FAILURE_LIMIT,
  classifyVaultFailure,
  deriveBiometricGate,
  normalizeBiometricAccount,
  shouldKeepVaultForAccount,
  type BiometricGate,
} from "./biometric-policy";

export type { BiometricGate } from "./biometric-policy";

// SecureStore keys
const BIOMETRIC_ENABLED_KEY = "prizm_biometric_enabled";
const BIOMETRIC_ASKED_KEY   = "prizm_biometric_asked";
const BIOMETRIC_CREDENTIALS_KEY = "prizm_biometric_credentials";
const BIOMETRIC_CREDENTIALS_READY_KEY = "prizm_biometric_credentials_ready";
const BIOMETRIC_ACCOUNT_KEY = "prizm_biometric_account";
const BIOMETRIC_VAULT_FAILURES_KEY = "prizm_biometric_vault_failures";

export type BiometricCredentials = {
  email: string;
  password: string;
};

export type BiometricUnlockResult =
  | { ok: true; credentials: BiometricCredentials }
  | { ok: false; reason: "cancelled" | "unusable" };

/**
 * Does this device have biometric hardware AND at least one enrolled fingerprint/face?
 * Both must be true before we can prompt the user.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHw     = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHw && isEnrolled;
  } catch {
    return false;
  }
}

/**
 * Did the user opt in via the "Enable fingerprint?" alert or settings toggle?
 * This is the opt-in flag ALONE — it says nothing about whether a credential
 * vault exists. Gate an app-open unlock prompt on this; gate re-authentication
 * after token expiry on `resolveBiometricGate().canSignIn`.
 */
export async function isBiometricOptedIn(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY)) === "1";
  } catch {
    return false;
  }
}

/**
 * The durable answer to "what can fingerprint do on this device right now".
 * Every consumer reads this instead of assembling its own combination of
 * flags: a login screen that guesses wrong shows a password form to someone
 * who enrolled a fingerprint, which is the whole bug this replaces.
 */
export async function resolveBiometricGate(): Promise<BiometricGate> {
  const [available, optedIn, hasVault] = await Promise.all([
    isBiometricAvailable(),
    isBiometricOptedIn(),
    hasBiometricCredentials(),
  ]);
  return deriveBiometricGate({ available, optedIn, hasVault });
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "1");
  } else {
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      clearBiometricVault(),
    ]);
  }
}

/**
 * Drop the stored secret while KEEPING the opt-in. Used whenever the vault
 * can't be trusted (OS key invalidated, account switch, interrupted write):
 * the user still wants fingerprint sign-in, so the app re-offers enrolment
 * instead of silently reverting them to password-only forever.
 */
export async function clearBiometricVault(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_READY_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_ACCOUNT_KEY),
    SecureStore.deleteItemAsync(BIOMETRIC_VAULT_FAILURES_KEY),
  ]);
}

/**
 * Store the credentials needed to obtain a fresh JWT after expiry or an
 * explicit sign-out. The secret itself is protected by the OS biometric/
 * device-credential gate; the separate marker can be checked without opening
 * a biometric prompt on every render.
 */
export async function saveBiometricCredentials(
  email: string,
  password: string,
): Promise<void> {
  const payload: BiometricCredentials = { email: email.trim(), password };
  await SecureStore.setItemAsync(
    BIOMETRIC_CREDENTIALS_KEY,
    JSON.stringify(payload),
    {
      requireAuthentication: true,
      authenticationPrompt: "Confirm fingerprint sign-in",
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );
  // Write the account marker BEFORE the ready flag: a crash between the two
  // leaves an unreadable-but-unclaimed vault, which the account check below
  // discards, rather than a vault that claims to be ready for nobody.
  await SecureStore.setItemAsync(
    BIOMETRIC_ACCOUNT_KEY,
    normalizeBiometricAccount(payload.email),
  );
  await Promise.all([
    SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "1"),
    SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_READY_KEY, "1"),
    SecureStore.deleteItemAsync(BIOMETRIC_VAULT_FAILURES_KEY),
  ]);
}

/**
 * A password login may switch the device to another staff account. Never
 * leave the previous account's fingerprint credential available after that
 * switch: a later sign-out could otherwise sign the user back into the wrong
 * account. Returns true only when the existing vault belongs to `email`.
 */
export async function keepBiometricCredentialsForAccount(
  email: string,
): Promise<boolean> {
  const [ready, storedAccount] = await Promise.all([
    hasBiometricCredentials(),
    SecureStore.getItemAsync(BIOMETRIC_ACCOUNT_KEY).catch(() => null),
  ]);
  if (!ready) return false;
  if (shouldKeepVaultForAccount(storedAccount, email)) return true;

  // Either a genuine account switch, or a vault whose owner we can't prove.
  // Drop the secret so a fingerprint can never sign in as the previous staff
  // member — but keep the opt-in, so the caller offers enrolment for THIS
  // account. Wiping the opt-in too is what left upgraded devices with a
  // password-only login screen and no way back.
  await clearBiometricVault();
  return false;
}

export async function hasBiometricCredentials(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_READY_KEY)) === "1";
  } catch {
    return false;
  }
}

async function readVaultFailures(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_VAULT_FAILURES_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Record one failed vault read and decide whether the vault is merely being
 * cancelled or is permanently gone. See VAULT_FAILURE_LIMIT.
 */
async function registerVaultFailure(): Promise<BiometricUnlockResult> {
  const failures = (await readVaultFailures()) + 1;
  if (classifyVaultFailure(failures, VAULT_FAILURE_LIMIT) === "unusable") {
    await clearBiometricVault();
    return { ok: false, reason: "unusable" };
  }
  await SecureStore.setItemAsync(
    BIOMETRIC_VAULT_FAILURES_KEY,
    String(failures),
  ).catch(() => undefined);
  return { ok: false, reason: "cancelled" };
}

/**
 * Reading this value displays the operating-system authentication prompt.
 * Returns a reason on failure so the caller can tell "you cancelled, try
 * again" apart from "this vault is gone, re-enable it once with a password".
 */
export async function unlockBiometricCredentials(): Promise<BiometricUnlockResult> {
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY, {
      requireAuthentication: true,
      authenticationPrompt: "Sign in to Prizm CRM",
    });
  } catch {
    // Ambiguous: a cancel and a destroyed keystore key both land here.
    return registerVaultFailure();
  }

  // An empty read may mean the entry is gone, but some platforms report a
  // cancelled prompt the same way. Count it instead of assuming: discarding a
  // working credential because of one stray tap is the worse mistake.
  if (!raw) return registerVaultFailure();

  let parsed: Partial<BiometricCredentials> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<BiometricCredentials>;
  } catch {
    parsed = null;
  }
  if (!parsed?.email || !parsed?.password) {
    await clearBiometricVault();
    return { ok: false, reason: "unusable" };
  }

  await SecureStore.deleteItemAsync(BIOMETRIC_VAULT_FAILURES_KEY).catch(() => undefined);
  return { ok: true, credentials: { email: parsed.email, password: parsed.password } };
}

/** True after the first time we've shown the "Enable fingerprint?" alert. */
export async function hasAskedAboutBiometric(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(BIOMETRIC_ASKED_KEY);
  return v === "1";
}

export async function markBiometricAsked(): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ASKED_KEY, "1");
}

/**
 * Show the OS biometric prompt. Returns true on success, false on cancel/error.
 * Falls back to device PIN if biometric is temporarily unavailable.
 */
export async function promptBiometric(
  reason = "Unlock Prizm CRM"
): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: "Use password",
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    return res.success;
  } catch {
    return false;
  }
}
