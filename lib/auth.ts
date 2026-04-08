import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { AUTH_URL, OAUTH_URL, API_BASE_URL } from "./config";

const SESSION_KEY = "prizm_session_cookie";

export async function getSessionCookie(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function setSessionCookie(cookie: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, cookie);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function checkSession(): Promise<boolean> {
  const cookie = await getSessionCookie();
  if (!cookie) return false;

  try {
    const res = await fetch(`${AUTH_URL}/session`, {
      headers: { cookie },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loginWithOAuth(): Promise<string | null> {
  const redirectUri = Linking.createURL("oauth/callback");
  const authUrl = `${OAUTH_URL}/mobile?redirect_uri=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type === "success" && result.url) {
    const url = new URL(result.url);
    const sessionCookie = url.searchParams.get("session");
    if (sessionCookie) {
      await setSessionCookie(sessionCookie);
      return sessionCookie;
    }
  }
  return null;
}

export async function logout(): Promise<void> {
  const cookie = await getSessionCookie();
  if (cookie) {
    try {
      await fetch(`${AUTH_URL}/logout`, {
        method: "POST",
        headers: { cookie },
      });
    } catch {
      // Ignore logout API errors
    }
  }
  await clearSession();
}
