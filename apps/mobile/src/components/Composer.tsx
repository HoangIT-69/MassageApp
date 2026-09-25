import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { copy } from "../copy";
import { radius, spacing, theme } from "../theme";

export function Composer({ onSend }: { onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const disabled = sending || text.trim().length === 0;

  async function submit(): Promise<void> {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.bar}>
      <TextInput
        accessibilityLabel={copy.composerLabel}
        value={text}
        onChangeText={setText}
        placeholder={copy.composerLabel}
        style={styles.input}
        multiline
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.sendLabel}
        disabled={disabled}
        onPress={() => {
          void submit();
        }}
        style={[styles.send, disabled ? styles.sendOff : null]}
      >
        <Text style={styles.sendText}>{copy.sendLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: theme.white,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radius.input,
    backgroundColor: theme.chatBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: theme.text,
  },
  send: {
    backgroundColor: theme.zaloBlue,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: theme.white, fontWeight: "700" },
});
