"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { StudentIdentity } from "@/lib/browser-api";
import type { ExamPath } from "@/lib/exam-paths";

type StudentSessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: StudentIdentity };

type StudentSessionContextValue = {
  state: StudentSessionState;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  setExamPath: (examPath: ExamPath) => Promise<void>;
};

const StudentSessionContext = createContext<StudentSessionContextValue | null>(null);

async function readSession(): Promise<StudentIdentity | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as StudentIdentity;
}

export function StudentSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<StudentSessionState>({ status: "loading" });

  const refreshSession = async () => {
    const user = await readSession();
    if (!user) {
      setState({ status: "unauthenticated" });
      return;
    }

    setState({ status: "authenticated", user });
  };

  useEffect(() => {
    void refreshSession().catch(() => {
      setState({ status: "unauthenticated" });
    });
  }, []);

  useEffect(() => {
    if (state.status === "unauthenticated" && pathname.startsWith("/app")) {
      router.replace("/login");
    }
  }, [pathname, router, state.status]);

  const signOut = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    setState({ status: "unauthenticated" });
    router.replace("/login");
    router.refresh();
  };

  const setExamPath = async (examPath: ExamPath) => {
    const response = await fetch("/api/auth/exam-path", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam_path: examPath }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Could not update exam path");
    }

    setState((current) => {
      if (current.status !== "authenticated") {
        return current;
      }

      return {
        status: "authenticated",
        user: {
          ...current.user,
          exam_path: examPath,
        },
      };
    });
    router.refresh();
  };

  return (
    <StudentSessionContext.Provider
      value={{ state, refreshSession, signOut, setExamPath }}
    >
      {children}
    </StudentSessionContext.Provider>
  );
}

export function useStudentSession() {
  const context = useContext(StudentSessionContext);
  if (!context) {
    throw new Error("useStudentSession must be used inside StudentSessionProvider");
  }

  return context;
}
