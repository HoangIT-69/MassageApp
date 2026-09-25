import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { ApiError, api, type ZaloStatus } from "../src/api/client";
import { useAuth } from "../src/auth";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { ErrorText, LoadingState } from "../src/components/StatusText";
import { copy } from "../src/copy";
import { spacing, theme } from "../src/theme";
import { usePoll } from "../src/use-poll";

export default function QrScreen() {
  const { token, ready, setToken } = useAuth();
  const [status, setStatus] = useState<ZaloStatus | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");

  const tick = useCallback(() => {
    if (!token) return;
    void (async () => {
      try {
        const next = await api<ZaloStatus>("/api/zalo/status", token);
        setStatus(next);
        setError("");
        if (next.status !== "connected") {
          const qr = await api<{ image: string }>("/api/zalo/qr", token).catch(() => null);
          setImage(qr?.image ?? null);
        }
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          await setToken(null);
          return;
        }
        setError(caught instanceof ApiError ? caught.message : copy.loadError);
      }
    })();
  }, [setToken, token]);

  usePoll(tick, Boolean(token));

  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  if (status?.status === "connected") return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={copy.qrTitle} />
      <View style={styles.body}>
        <Text style={styles.hint}>{copy.qrHint}</Text>
        {image ? (
          <Image source={{ uri: image }} accessibilityLabel={copy.qrLabel} style={styles.qr} />
        ) : (
          <Text style={styles.hint}>{copy.qrMissing}</Text>
        )}
        {error ? <ErrorText message={error} /> : null}
      </View>
    </View>
  );
}

const QR_SIZE = 260;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.listBg },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  hint: { color: theme.text, textAlign: "center", fontSize: 16 },
  qr: { width: QR_SIZE, height: QR_SIZE, backgroundColor: theme.white },
});
