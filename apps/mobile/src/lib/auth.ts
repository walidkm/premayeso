/**
 * Auth store — wraps AsyncStorage for JWT persistence.
 *
 * Tokens are stored under two keys:
 *   "pm_access"   – short-lived access JWT  (1 h)
 *   "pm_refresh"  – long-lived refresh JWT  (30 d)
 *   "pm_user"     – JSON-serialised user profile
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY  = "pm_access";
const REFRESH_KEY = "pm_refresh";
const USER_KEY    = "pm_user";

export type AuthUser = {
  id: string;
  phone: string;
  role: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

// ── Persist ───────────────────────────────────────────────────

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setMany({
    [ACCESS_KEY]:  session.accessToken,
    [REFRESH_KEY]: session.refreshToken,
    [USER_KEY]:    JSON.stringify(session.user),
  });
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeMany([ACCESS_KEY, REFRESH_KEY, USER_KEY]);
}

export async function loadSession(): Promise<AuthSession | null> {
  const result = await AsyncStorage.getMany([ACCESS_KEY, REFRESH_KEY, USER_KEY]);
  const access   = result[ACCESS_KEY];
  const refresh  = result[REFRESH_KEY];
  const userJson = result[USER_KEY];

  if (!access || !refresh || !userJson) return null;

  try {
    const user: AuthUser = JSON.parse(userJson);
    return { accessToken: access, refreshToken: refresh, user };
  } catch {
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_KEY);
}
