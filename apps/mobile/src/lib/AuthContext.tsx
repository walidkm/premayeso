import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  AuthUser,
  AuthSession,
  loadSession,
  saveSession,
  clearSession,
} from "./auth";
import { refreshTokens } from "./api";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser; accessToken: string };

type AuthContextValue = {
  state: AuthState;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (!session) {
          setState({ status: "unauthenticated" });
          return;
        }

        // Try to refresh proactively so we have a fresh token on boot
        try {
          const tokens = await refreshTokens(session.refreshToken);
          const updated: AuthSession = {
            ...tokens,
            user: session.user,
          };
          await saveSession(updated);
          setState({
            status: "authenticated",
            user: updated.user,
            accessToken: updated.accessToken,
          });
        } catch {
          // Refresh failed (expired 30-day token) → force login
          await clearSession();
          setState({ status: "unauthenticated" });
        }
      } catch {
        setState({ status: "unauthenticated" });
      }
    })();
  }, []);

  const signIn = async (session: AuthSession) => {
    await saveSession(session);
    setState({
      status: "authenticated",
      user: session.user,
      accessToken: session.accessToken,
    });
  };

  const signOut = async () => {
    await clearSession();
    setState({ status: "unauthenticated" });
  };

  return (
    <AuthContext.Provider value={{ state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
