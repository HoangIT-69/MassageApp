import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import { ApiError, api } from "../src/api/client";
import { useAuth } from "../src/auth";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { ErrorText, LoadingState } from "../src/components/StatusText";
import { copy } from "../src/copy";
import { radius, spacing, theme } from "../src/theme";

export default function LoginScreen() {
  const { token, ready, setToken } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!ready) return <LoadingState />;
  if (token) return <Redirect href="/" />;

  async function submit(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const session = await api<{ token: string }>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      await setToken(session.token);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : copy.loadError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={copy.loginTitle} />
      <View style={styles.form}>
        <Text style={styles.hint}>{copy.loginHint}</Text>
        <TextInput
          accessibilityLabel={copy.passwordLabel}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        {error ? <ErrorText message={error} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.loginButton}
          disabled={busy || password.length === 0}
          onPress={() => {
            void submit();
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{copy.loginButton}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.listBg },
  form: { padding: spacing.xl, gap: spacing.md },
  hint: { color: theme.muted },
  input: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: theme.text,
  },
  button: {
    backgroundColor: theme.zaloBlue,
    borderRadius: radius.input,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: { color: theme.white, fontWeight: "700" },
});
