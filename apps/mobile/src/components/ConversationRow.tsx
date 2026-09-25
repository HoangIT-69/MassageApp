import { useEffect, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { Conversation } from "../api/client";
import { copy } from "../copy";
import { spacing, theme } from "../theme";
import { formatClock } from "../use-poll";
import { Avatar } from "./Avatar";

const DELETE_WIDTH = 88;
const SWIPE_START = 12;

export function ConversationRow({
  item,
  onPress,
  onDelete,
}: {
  item: Conversation;
  onPress: (id: string) => void;
  onDelete: (item: Conversation) => void;
}) {
  const translate = useRef(new Animated.Value(0)).current;
  const opened = useRef(0);

  useEffect(() => {
    opened.current = 0;
    translate.setValue(0);
  }, [item.id, translate]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > SWIPE_START && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_event, gesture) => {
        const next = Math.min(0, Math.max(-DELETE_WIDTH, opened.current + gesture.dx));
        translate.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        const next = opened.current + gesture.dx;
        const target = next < -DELETE_WIDTH / 2 ? -DELETE_WIDTH : 0;
        opened.current = target;
        Animated.spring(translate, { toValue: target, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => {
        opened.current = 0;
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
    }),
  ).current;

  function openChat(): void {
    if (opened.current < 0) {
      opened.current = 0;
      Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      return;
    }
    onPress(item.id);
  }

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityLabel={`${copy.remove} ${item.title}`}
        onPress={() => onDelete(item)}
        style={styles.delete}
      >
        <Text style={styles.deleteText}>{copy.remove}</Text>
      </Pressable>
      <Animated.View style={[styles.front, { transform: [{ translateX: translate }] }]} {...pan.panHandlers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.lastMessage ?? ""}`}
          delayLongPress={400}
          onLongPress={() => onDelete(item)}
          onPress={openChat}
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: theme.danger, overflow: "hidden" },
  delete: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: theme.white, fontWeight: "700" },
  front: { backgroundColor: theme.listBg },
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
