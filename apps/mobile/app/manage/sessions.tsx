import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { ApiError, api, type Conversation } from "../../src/api/client";
import { useAuth } from "../../src/auth";
import { ManageFrame } from "../../src/admin/ui";
import { SessionSheet } from "../../src/components/SessionSheet";
import { ErrorText, LoadingState } from "../../src/components/StatusText";
import { copy } from "../../src/copy";
import { spacing, theme } from "../../src/theme";
import { usePoll } from "../../src/use-poll";

export default function SessionsScreen() {
  const { token, ready, setToken } = useAuth();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const tick = useCallback(() => {
    if (!token) return;
    void (async () => {
      try {
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

  if (!ready || (token && items === null && !error)) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;

  return (
    <ManageFrame title={copy.manageSessions}>
      {error ? <ErrorText message={error} /> : null}
      <ScrollView>
        {(items ?? []).map((item) => (
          <Pressable
            key={item.id}
            accessibilityLabel={item.title}
            onPress={() => setOpenId(item.id)}
            style={styles.row}
          >
            <View style={styles.text}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage ?? copy.emptyChats}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {token ? (
        <SessionSheet
          visible={openId !== null}
          conversationId={openId}
          token={token}
          onClose={() => setOpenId(null)}
          onChanged={tick}
        />
      ) : null}
    </ManageFrame>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  text: { flex: 1 },
  title: { color: theme.text, fontSize: 16, fontWeight: "600" },
  preview: { color: theme.muted, marginTop: spacing.xs },
});
