import { StyleSheet, Text, View } from "react-native";
import type { ChatMessage } from "../api/client";
import { copy } from "../copy";
import { radius, spacing, theme } from "../theme";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const outgoing = message.direction === "out";
  return (
    <View style={[styles.row, outgoing ? styles.outRow : styles.inRow]}>
      <View style={[styles.bubble, outgoing ? styles.outBubble : styles.inBubble]}>
        {message.source === "ai" ? <Text style={styles.ai}>{copy.aiLabel}</Text> : null}
        <Text style={styles.text}>{message.content}</Text>
        {message.status === "failed" ? <Text style={styles.failed}>{copy.sendFailed}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: spacing.xs, paddingHorizontal: spacing.md },
  inRow: { alignItems: "flex-start" },
  outRow: { alignItems: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: radius.bubble, padding: spacing.md },
  inBubble: { backgroundColor: theme.incoming },
  outBubble: { backgroundColor: theme.outgoing },
  text: { color: theme.text, fontSize: 16 },
  ai: { color: theme.zaloBlue, fontSize: 11, fontWeight: "700", marginBottom: spacing.xs },
  failed: { color: theme.danger, fontSize: 12, marginTop: spacing.xs },
});
