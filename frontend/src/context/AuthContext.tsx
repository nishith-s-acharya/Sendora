import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { api } from "../api/client";
import { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("reachinbox_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [loading, setLoading] = useState(false);

  const loginWithGoogleCredential = useCallback(async (credential: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/google", { credential });
      localStorage.setItem("reachinbox_token", data.token);
      localStorage.setItem("reachinbox_user", JSON.stringify(data.user));
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("reachinbox_token");
    localStorage.removeItem("reachinbox_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithGoogleCredential, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
