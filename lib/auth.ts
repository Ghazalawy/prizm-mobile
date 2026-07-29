import * as SecureStore from "expo-secure-store";
import { ADMIN_URL, API_URL, MOBILE_AUTH_URL } from "./config";

const TOKEN_KEY = "prizm_auth_token";
const SESSION_KEY = "prizm_session_cookie";
const PROFILE_KEY = "prizm_staff_profile";

/** The current authenticated staff record. Stored on login, read by
 * Action Center / My Activity / anywhere that needs the staffid. */
export type StaffProfile = {
  staffid: number;
  email: string;
  firstname: string;
  lastname: string;
  profile_image?: string | null;
  phonenumber?: string | null;
};

// --- Token storage ---

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

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

export async function getStaffProfile(): Promise<StaffProfile | null> {
  try {
    const raw = await SecureStore.getItemAsync(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StaffProfile;
  } catch {
    return null;
  }
}

export async function setStaffProfile(profile: StaffProfile): Promise<void> {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(PROFILE_KEY);
}

// --- Login via mobile_auth.php ---

export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await fetch(MOBILE_AUTH_URL, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if ((data.status === true || data.success === true) && data.token) {
      await setAuthToken(data.token);
      // Store the staff profile (mobile_auth.php returns it under `staff`).
      // The Action Center, My Activity feed, and any feature that needs the
      // current staffid reads this via getStaffProfile() / useCurrentUser().
      if (data.staff && typeof data.staff.staffid === "number") {
        await setStaffProfile({
          staffid: data.staff.staffid,
          email: data.staff.email,
          firstname: data.staff.firstname || "",
          lastname: data.staff.lastname || "",
          profile_image: data.staff.profile_image || null,
          phonenumber: data.staff.phonenumber || null,
        });
      }
      // Store session cookie if returned in headers
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        await setSessionCookie(setCookie);
      }
      return { success: true };
    }

    return {
      success: false,
      message:
        data.message ||
        (data.status === true
          ? "The server signed in but did not issue a mobile access token."
          : "Invalid email or password"),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Could not connect to server",
    };
  }
}

// --- REST login fallback -------------------------------------------------

/**
 * Authenticate through the CSRF-exempt REST namespace. Mobile must never
 * depend on an admin-panel session POST: that flow needs a browser cookie +
 * CSRF pair and can report success without issuing the JWT required by every
 * native data request.
 */
export async function loginViaApi(
  email: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_URL}/login/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    const token = data?.token || data?.result?.token;

    if (!res.ok || data?.status !== true || !token) {
      return {
        success: false,
        message: data?.message || `Sign-in failed (HTTP ${res.status})`,
      };
    }

    await setAuthToken(token);

    // The REST login response is deliberately small; hydrate the staff profile
    // through the normal authenticated self-service endpoint.
    const profileRes = await fetch(`${API_URL}/my/profile`, {
      headers: { "Content-Type": "application/json", authtoken: token },
    });
    const profileBody = await profileRes.json().catch(() => null);
    const profile = profileBody?.data;
    if (profile && Number(profile.staffid) > 0) {
      await setStaffProfile({
        staffid: Number(profile.staffid),
        email: profile.email || email,
        firstname: profile.firstname || "",
        lastname: profile.lastname || "",
        profile_image: profile.profile_image || null,
        phonenumber: profile.phonenumber || null,
      });
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Could not connect to server",
    };
  }
}

// --- Logout ---

export async function logout(): Promise<void> {
  await clearSession();
}

// --- Check if session is valid ---

export async function checkSession(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;

  try {
    // Quick check: hit a lightweight API endpoint
    const res = await fetch(`${ADMIN_URL}/dashboard`, {
      redirect: "manual",
    });
    // If it doesn't redirect to auth, session is valid
    return res.status === 200;
  } catch {
    return false;
  }
}
