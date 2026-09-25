import { useCallback, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import {
  AI_PENDING_MS,
  ApiError,
  api,
  type ChatMessage,
  type Conversation,
} from "../../src/api/client";
import { useAuth } from "../../src/auth";
import { AiToggle } from "../../src/components/AiToggle";
import { Composer } from "../../src/components/Composer";
import { MessageBubble } from "../../src/components/MessageBubble";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { ErrorText, LoadingState } from "../../src/components/StatusText";
import { copy } from "../../src/copy";
import { spacing, theme } from "../../src/theme";
import { usePoll } from "../../src/use-poll";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, ready, setToken } = useAuth();
  const [title, setTitle] = useState("Chat");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState("");

  const tick = useCallback(() => {
    if (!token || !id) return;
    void (async () => {
      try {
        const chats = await api<{ conversations: Conversation[] }>("/api/conversations", token);
        const current = chats.conversations.find((item) => item.id === id);
        if (current) {
          setTitle(current.title);
          setAiEnabled(current.aiEnabled);
        }
        const payload = await api<{ messages: ChatMessage[] }>(
          `/api/conversations/${id}/messages?after=0`,
          token,
        );
        setMessages(payload.messages);
        setError("");
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          await setToken(null);
          return;
        }
        setError(caught instanceof ApiError ? caught.message : copy.loadError);
      }
    })();
  }, [id, setToken, token]);

  usePoll(tick, Boolean(token && id));

  async function send(content: string): Promise<void> {
    if (!token || !id) return;
    await api(`/api/conversations/${id}/messages`, token, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    tick();
  }

  async function toggleAi(enabled: boolean): Promise<void> {
    if (!token || !id) return;
    setAiEnabled(enabled);
    try {
      await api(`/api/conversations/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ aiEnabled: enabled }),
      });
    } catch (caught) {
      setAiEnabled(!enabled);
      setError(caught instanceof ApiError ? caught.message : copy.loadError);
    }
  }

  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;
  if (messages === null && !error) return <LoadingState />;

  const latest = messages?.[messages.length - 1];
  const waiting =
    Boolean(aiEnabled) &&
    latest?.direction === "in" &&
    Date.now() - latest.createdAt < AI_PENDING_MS;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title={title}
        right={<AiToggle enabled={aiEnabled} onChange={(value) => void toggleAi(value)} />}
      />
      {error ? (
        <View style={styles.errorWrap}>
          <ErrorText message={error} />
        </View>
      ) : null}
      <FlatList
        data={messages ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
        ListFooterComponent={waiting ? <Text style={styles.pending}>{copy.aiPending}</Text> : null}
      />
      <Composer onSend={send} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.chatBg },
  list: { paddingVertical: spacing.md },
  pending: { textAlign: "center", color: theme.muted, marginBottom: spacing.sm },
  errorWrap: { padding: spacing.sm, backgroundColor: theme.white },
});
