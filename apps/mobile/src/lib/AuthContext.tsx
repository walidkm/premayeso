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
  loadExamPath,
  saveExamPath,
  clearExamPath,
} from "./auth";
import { refreshTokens, setExamPathApi } from "./api";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "authenticated";
      user: AuthUser;
      accessToken: string;
      examPath: string | null;
    };

type AuthContextValue = {
  state: AuthState;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  setExamPath: (path: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const [session, examPath] = await Promise.all([
          loadSession(),
          loadExamPath(),
        ]);

        if (!session) {
          setState({ status: "unauthenticated" });
          return;
        }

        // Refresh tokens proactively on boot
        try {
          const tokens = await refreshTokens(session.refreshToken);
          const updated: AuthSession = { ...tokens, user: session.user };
          await saveSession(updated);
          setState({
            status: "authenticated",
            user: updated.user,
            accessToken: updated.accessToken,
            examPath,
          });
        } catch {
          await clearSession();
          await clearExamPath();
          setState({ status: "unauthenticated" });
        }
      } catch {
        setState({ status: "unauthenticated" });
      }
    })();
  }, []);

  const signIn = async (session: AuthSession) => {
    await saveSession(session);
    const examPath = await loadExamPath();
    setState({
      status: "authenticated",
      user: session.user,
      accessToken: session.accessToken,
      examPath,
    });
  };

  const signOut = async () => {
    await clearSession();
    await clearExamPath();
    setState({ status: "unauthenticated" });
  };

  const setExamPath = async (path: string) => {
    await saveExamPath(path);
    await setExamPathApi(path);
    setState((prev) => {
      if (prev.status !== "authenticated") return prev;
      return { ...prev, examPath: path };
    });
  };

  return (
    <AuthContext.Provider value={{ state, signIn, signOut, setExamPath }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
