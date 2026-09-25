import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { ApiError, api, type Conversation, type ZaloStatus } from "../src/api/client";
import { useAuth } from "../src/auth";
import { ConversationRow } from "../src/components/ConversationRow";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { ErrorText, LoadingState } from "../src/components/StatusText";
import { copy } from "../src/copy";
import { spacing, theme } from "../src/theme";
import { usePoll } from "../src/use-poll";

export default function ConversationListScreen() {
  const { token, ready, setToken } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const tick = useCallback(() => {
    if (!token) return;
    void (async () => {
      try {
        const link = await api<ZaloStatus>("/api/zalo/status", token);
        setStatus(link.status);
        if (link.status !== "connected") return;
        const payload = await api<{ conversations: Conversation[] }>("/api/conversations", token);
        setItems(payload.conversations);
        setError("");
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

  const logout = useCallback(async () => {
    if (!token || loggingOut) return;
    setLoggingOut(true);
    try {
      await api("/api/zalo/logout", token, { method: "POST" });
      setStatus("disconnected");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await setToken(null);
        return;
      }
      setError(caught instanceof ApiError ? caught.message : copy.loadError);
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, setToken, token]);

  const confirmLogout = useCallback(() => {
    Alert.alert(copy.logoutTitle, copy.logoutHint, [
      { text: copy.cancel, style: "cancel" },
      { text: copy.logout, style: "destructive", onPress: () => void logout() },
    ]);
  }, [logout]);

  if (!ready || (token && status === null && !error)) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  if (status && status !== "connected") return <Redirect href="/qr" />;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={copy.appTitle}
        right={
          <Pressable
            accessibilityLabel={copy.logout}
            disabled={loggingOut}
            onPress={confirmLogout}
            style={styles.logout}
          >
            <Text style={styles.logoutText}>{copy.logout}</Text>
          </Pressable>
        }
      />
      {error ? (
        <View style={styles.errorWrap}>
          <ErrorText message={error} />
        </View>
      ) : null}
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationRow item={item} onPress={(id) => router.push(`/chat/${id}`)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>{copy.emptyChats}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.listBg },
  empty: { textAlign: "center", color: theme.muted, marginTop: spacing.xl },
  errorWrap: { padding: spacing.md },
  logout: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  logoutText: { color: theme.headerText, fontSize: 15, fontWeight: "600" },
});
