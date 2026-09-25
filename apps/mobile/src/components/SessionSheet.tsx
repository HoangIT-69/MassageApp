import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ApiError, api } from "../api/client";
import { FACT_LABEL } from "../admin/types";
import { copy } from "../copy";
import { spacing, theme } from "../theme";

const STAGES = [
  ["chao_hoi", copy.stageChaoHoi],
  ["tu_van", copy.stageTuVan],
  ["len_don", copy.stageLenDon],
  ["cho_xac_nhan", copy.stageChoXacNhan],
  ["chot", copy.stageChot],
] as const;

type SessionView = {
  zaloName: string;
  aiEnabled: boolean;
  stage: string;
  facts: { id: string; kind: string; content: string }[];
  summary: string;
};

export function SessionSheet({
  visible,
  conversationId,
  token,
  onClose,
  onChanged,
}: {
  visible: boolean;
  conversationId: string | null;
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!visible || !conversationId) return;
    void (async () => {
      try {
        const payload = await api<SessionView>(`/api/conversations/${conversationId}/session`, token);
        setSession(payload);
        setError("");
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : copy.loadError);
      }
    })();
  }, [conversationId, token, visible]);

  function confirmClear(): void {
    if (!conversationId) return;
    Alert.alert(copy.clearContextTitle, copy.clearContextHint, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.clearContext,
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await api(`/api/conversations/${conversationId}/context`, token, { method: "DELETE" });
              onChanged();
              load();
            } catch (caught) {
              setError(caught instanceof ApiError ? caught.message : copy.loadError);
            }
          })();
        },
      },
    ]);
  }

  async function toggleAi(enabled: boolean): Promise<void> {
    if (!conversationId || !session) return;
    setSession({ ...session, aiEnabled: enabled });
    try {
      await api(`/api/conversations/${conversationId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ aiEnabled: enabled }),
      });
      onChanged();
    } catch (caught) {
      setSession({ ...session, aiEnabled: !enabled });
      setError(caught instanceof ApiError ? caught.message : copy.loadError);
    }
  }

  return (
    <Modal animationType="slide" visible={visible} onShow={load} onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{copy.sessionTitle}</Text>
          <Pressable accessibilityLabel={copy.back} onPress={onClose}>
            <Text style={styles.close}>{copy.back}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.section}>{copy.facts}</Text>
          {(session?.facts.length ?? 0) === 0 ? <Text style={styles.meta}>{copy.noFacts}</Text> : null}
          {session?.facts.map((fact) => (
            <Text key={fact.id} style={styles.meta}>
              {FACT_LABEL[fact.kind] ?? fact.kind}: {fact.content}
            </Text>
          ))}
          <Text style={styles.section}>{copy.summary}</Text>
          <Text style={styles.meta}>{session?.summary || copy.noSummary}</Text>
          <Pressable accessibilityLabel={copy.clearContext} onPress={confirmClear} style={styles.clear}>
            <Text style={styles.clearText}>{copy.clearContext}</Text>
          </Pressable>
          <View style={styles.aiRow}>
            <Text style={styles.section}>{copy.aiLabel}</Text>
            <Switch
              accessibilityLabel={copy.aiSwitch}
              value={Boolean(session?.aiEnabled)}
              onValueChange={(value) => void toggleAi(value)}
              trackColor={{ false: theme.line, true: theme.zaloBlue }}
              thumbColor={theme.white}
            />
          </View>
          <Text style={styles.section}>Trạng thái hiện tại</Text>
          {STAGES.map(([id, label]) => {
            const active = session?.stage === id;
            return (
              <Text key={id} style={active ? styles.active : styles.meta}>
                {active ? "● " : "○ "}
                {label}
              </Text>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.listBg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: theme.zaloBlue,
  },
  title: { color: theme.headerText, fontSize: 18, fontWeight: "700" },
  close: { color: theme.headerText, fontWeight: "700" },
  body: { padding: spacing.lg, gap: spacing.sm },
  section: { color: theme.text, fontSize: 16, fontWeight: "700", marginTop: spacing.md },
  meta: { color: theme.muted },
  active: { color: theme.zaloBlue, fontWeight: "700" },
  error: { color: theme.danger },
  clear: { marginTop: spacing.md },
  clearText: { color: theme.danger, fontWeight: "700" },
  aiRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
