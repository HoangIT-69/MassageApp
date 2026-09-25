import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Switch, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { ApiError, api, type Conversation, type ZaloStatus } from "../src/api/client";
import { useAuth } from "../src/auth";
import { ConversationRow } from "../src/components/ConversationRow";
import { HeaderButton } from "../src/components/HeaderButton";
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
  const [aiAll, setAiAll] = useState(false);

  const tick = useCallback(() => {
    if (!token) return;
    void (async () => {
      try {
        const link = await api<ZaloStatus>("/api/zalo/status", token);
        setStatus(link.status);
        setAiAll(link.aiAll);
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

  const toggleAll = useCallback(
    async (enabled: boolean) => {
      if (!token) return;
      setAiAll(enabled);
      try {
        await api("/api/zalo/ai", token, { method: "PATCH", body: JSON.stringify({ enabled }) });
        tick();
      } catch (caught) {
        setAiAll(!enabled);
        setError(caught instanceof ApiError ? caught.message : copy.loadError);
      }
    },
    [tick, token],
  );

  const confirmDelete = useCallback(
    (item: Conversation) => {
      if (!token) return;
      Alert.alert(copy.deleteChatTitle, copy.deleteChatHint, [
        { text: copy.cancel, style: "cancel" },
        {
          text: copy.remove,
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await api(`/api/conversations/${item.id}`, token, { method: "DELETE" });
                setItems((current) => (current ?? []).filter((row) => row.id !== item.id));
              } catch (caught) {
                if (caught instanceof ApiError && caught.status === 401) {
                  await setToken(null);
                  return;
                }
                setError(caught instanceof ApiError ? caught.message : copy.loadError);
              }
            })();
          },
        },
      ]);
    },
    [setToken, token],
  );

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
        left={
          <View style={styles.allAi}>
            <Text style={styles.allAiLabel}>{copy.aiAllLabel}</Text>
            <Switch
              accessibilityLabel={copy.aiAllSwitch}
              value={aiAll}
              onValueChange={(value) => void toggleAll(value)}
              trackColor={{ false: theme.line, true: theme.headerText }}
              thumbColor={aiAll ? theme.zaloBlue : theme.white}
            />
          </View>
        }
        right={
          <View style={styles.actions}>
            <HeaderButton label={copy.manage} onPress={() => router.push("/manage")} />
            <HeaderButton label={copy.logout} disabled={loggingOut} onPress={confirmLogout} />
          </View>
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
          <ConversationRow
            item={item}
            onPress={(id) => router.push(`/chat/${id}`)}
            onDelete={confirmDelete}
          />
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
  actions: { flexDirection: "row", alignItems: "center" },
  allAi: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  allAiLabel: { color: theme.headerText, fontWeight: "700" },
});
