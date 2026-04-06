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
import { getMe, refreshTokens, setExamPathApi } from "./api";
import {
  DEFAULT_EXAM_PATH,
  type ExamPath,
  normalizeExamPath,
} from "./examPath";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "authenticated";
      user: AuthUser;
      accessToken: string;
      examPath: ExamPath;
    };

type AuthContextValue = {
  state: AuthState;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  setExamPath: (path: ExamPath) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const resolveExamPath = async (): Promise<ExamPath> => {
    const storedExamPath = await loadExamPath();
    if (storedExamPath) {
      return storedExamPath;
    }

    try {
      const me = await getMe();
      const serverExamPath = normalizeExamPath(me.exam_path);
      const resolved = serverExamPath ?? DEFAULT_EXAM_PATH;
      await saveExamPath(resolved);
      return resolved;
    } catch {
      await saveExamPath(DEFAULT_EXAM_PATH);
      return DEFAULT_EXAM_PATH;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();

        if (!session) {
          setState({ status: "unauthenticated" });
          return;
        }

        // Refresh tokens proactively on boot
        try {
          const tokens = await refreshTokens(session.refreshToken);
          const updated: AuthSession = { ...tokens, user: session.user };
          await saveSession(updated);
          const examPath = await resolveExamPath();
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
    const examPath = await resolveExamPath();
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

  const setExamPath = async (path: ExamPath) => {
    await setExamPathApi(path);
    await saveExamPath(path);
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
