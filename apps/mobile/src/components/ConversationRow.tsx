import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Conversation } from "../api/client";
import { copy } from "../copy";
import { spacing, theme } from "../theme";
import { formatClock } from "../use-poll";
import { Avatar } from "./Avatar";

export function ConversationRow({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.lastMessage ?? ""}`}
      onPress={() => onPress(item.id)}
      style={styles.row}
    >
      <Avatar name={item.title} uri={item.avatarUrl} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{formatClock(item.lastMessageAt)}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {item.lastMessage ?? copy.emptyChats}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: theme.listBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.line,
  },
  body: { flex: 1, gap: spacing.xs },
  top: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  title: { flex: 1, color: theme.text, fontSize: 16, fontWeight: "600" },
  time: { color: theme.muted, fontSize: 12 },
  preview: { color: theme.muted, fontSize: 14 },
});
