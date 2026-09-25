import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "operator_token";

type AuthValue = {
  token: string | null;
  ready: boolean;
  setToken: (token: string | null) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY)
      .then((stored) => setTokenState(stored))
      .catch(() => setTokenState(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      token,
      ready,
      setToken: async (next) => {
        if (next) await SecureStore.setItemAsync(TOKEN_KEY, next);
        else await SecureStore.deleteItemAsync(TOKEN_KEY);
        setTokenState(next);
      },
    }),
    [ready, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider chưa được gắn");
  return value;
}
