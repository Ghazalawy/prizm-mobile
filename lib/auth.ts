import * as SecureStore from "expo-secure-store";
import { ADMIN_URL, MOBILE_AUTH_URL } from "./config";

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

    if (data.status === true || data.success === true) {
      // Store token if returned
      if (data.token) {
        await setAuthToken(data.token);
      }
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
      message: data.message || "Invalid email or password",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Could not connect to server",
    };
  }
}

// --- Session-based login (admin panel) ---

export async function loginViaAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Step 1: Get CSRF token from login page
    const pageRes = await fetch(`${ADMIN_URL}/authentication`);
    const html = await pageRes.text();

    const csrfMatch = html.match(
      /name="csrf_token_name"\s+value="([^"]+)"/
    );
    const csrf = csrfMatch?.[1] || "";

    // Capture cookies from the page load
    const pageCookies = pageRes.headers.get("set-cookie") || "";

    // Step 2: POST login
    const formData = new URLSearchParams();
    formData.append("csrf_token_name", csrf);
    formData.append("email", email);
    formData.append("password", password);

    const loginRes = await fetch(`${ADMIN_URL}/authentication`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: pageCookies,
      },
      body: formData.toString(),
      redirect: "manual",
    });

    const sessionCookie = loginRes.headers.get("set-cookie");

    // 302/307 redirect to dashboard = success
    if (loginRes.status >= 300 && loginRes.status < 400) {
      const location = loginRes.headers.get("location") || "";
      if (
        location.includes("dashboard") ||
        (location.includes("admin") &&
        !location.includes("authentication"))
      ) {
        if (sessionCookie) {
          await setSessionCookie(sessionCookie);
        }
        // Session login succeeded — also try to get a JWT token via mobile_auth
        // so REST API calls work (session cookies don't help there).
        try {
          const formData2 = new FormData();
          formData2.append("email", email);
          formData2.append("password", password);
          const authRes = await fetch(MOBILE_AUTH_URL, { method: "POST", body: formData2 });
          const authData = await authRes.json();
          if (authData.token) {
            await setAuthToken(authData.token);
            if (authData.staff && typeof authData.staff.staffid === "number") {
              await setStaffProfile({
                staffid: authData.staff.staffid,
                email: authData.staff.email,
                firstname: authData.staff.firstname || "",
                lastname: authData.staff.lastname || "",
                profile_image: authData.staff.profile_image || null,
                phonenumber: authData.staff.phonenumber || null,
              });
            }
          }
        } catch { /* JWT token is optional if session works */ }
        return { success: true };
      }
    }

    return {
      success: false,
      message: "Invalid email or password",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Could not connect to server",
    };
  }
}

// --- Logout ---

export async function logout(): Promise<void> {
  try {
    const cookie = await getSessionCookie();
    if (cookie) {
      await fetch(`${ADMIN_URL}/authentication/logout`, {
        headers: { Cookie: cookie },
      });
    }
  } catch {
    // Ignore logout errors
  }
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
