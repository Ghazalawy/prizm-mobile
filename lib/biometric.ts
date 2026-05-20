import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// SecureStore keys
const BIOMETRIC_ENABLED_KEY = "prizm_biometric_enabled";
const BIOMETRIC_ASKED_KEY   = "prizm_biometric_asked";

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
  const v = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return v === "1";
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "1");
  } else {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
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
