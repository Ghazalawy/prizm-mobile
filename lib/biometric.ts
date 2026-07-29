import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// SecureStore keys
const BIOMETRIC_ENABLED_KEY = "prizm_biometric_enabled";
const BIOMETRIC_ASKED_KEY   = "prizm_biometric_asked";
const BIOMETRIC_CREDENTIALS_KEY = "prizm_biometric_credentials";
const BIOMETRIC_CREDENTIALS_READY_KEY = "prizm_biometric_credentials_ready";
const BIOMETRIC_ACCOUNT_KEY = "prizm_biometric_account";

export type BiometricCredentials = {
  email: string;
  password: string;
};

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

/** Did the user opt in via the "Enable fingerprint?" alert or settings toggle? */
export async function isBiometricEnabled(): Promise<boolean> {
  const [enabled, ready] = await Promise.all([
    SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
    SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_READY_KEY),
  ]);
  return enabled === "1" && ready === "1";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "1");
  } else {
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_READY_KEY),
      SecureStore.deleteItemAsync(BIOMETRIC_ACCOUNT_KEY),
    ]);
  }
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
  await Promise.all([
    SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "1"),
    SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_READY_KEY, "1"),
    SecureStore.setItemAsync(BIOMETRIC_ACCOUNT_KEY, payload.email.toLowerCase()),
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

  const requestedAccount = email.trim().toLowerCase();
  if (storedAccount === requestedAccount) return true;

  // An old installation may have a credential without an account marker.
  // Treat that as ambiguous rather than risking a cross-account login.
  await setBiometricEnabled(false);
  return false;
}

export async function hasBiometricCredentials(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_READY_KEY)) === "1";
  } catch {
    return false;
  }
}

/** Reading this value displays the operating-system authentication prompt. */
export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY, {
      requireAuthentication: true,
      authenticationPrompt: "Sign in to Prizm CRM",
    });
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BiometricCredentials>;
    if (!parsed.email || !parsed.password) return null;
    return { email: parsed.email, password: parsed.password };
  } catch {
    return null;
  }
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
