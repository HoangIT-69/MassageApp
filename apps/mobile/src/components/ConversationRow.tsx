import { useEffect, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { Conversation } from "../api/client";
import { copy } from "../copy";
import { radius, spacing, theme } from "../theme";
import { formatClock } from "../use-poll";
import { Avatar } from "./Avatar";

const DELETE_WIDTH = 88;
const SWIPE_START = 12;

function createSwipe(): {
  translate: Animated.Value;
  pan: ReturnType<typeof PanResponder.create>;
  reset: () => void;
  closeIfOpen: () => boolean;
} {
  let opened = 0;
  const translate = new Animated.Value(0);
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) =>
      Math.abs(gesture.dx) > SWIPE_START && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_event, gesture) => {
      const next = Math.min(0, Math.max(-DELETE_WIDTH, opened + gesture.dx));
      translate.setValue(next);
    },
    onPanResponderRelease: (_event, gesture) => {
      const next = opened + gesture.dx;
      const target = next < -DELETE_WIDTH / 2 ? -DELETE_WIDTH : 0;
      opened = target;
      Animated.spring(translate, { toValue: target, useNativeDriver: true, bounciness: 0 }).start();
    },
    onPanResponderTerminate: () => {
      opened = 0;
      Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    },
  });
  return {
    translate,
    pan,
    reset() {
      opened = 0;
      translate.setValue(0);
    },
    closeIfOpen() {
      if (opened >= 0) return false;
      opened = 0;
      Animated.spring(translate, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      return true;
    },
  };
}

export function ConversationRow({
  item,
  onPress,
  onDelete,
}: {
  item: Conversation;
  onPress: (id: string) => void;
  onDelete: (item: Conversation) => void;
}) {
  const [swipe] = useState(() => createSwipe());

  useEffect(() => {
    swipe.reset();
  }, [item.id, swipe]);

  function openChat(): void {
    if (swipe.closeIfOpen()) return;
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
      <Animated.View
        style={[styles.front, { transform: [{ translateX: swipe.translate }] }]}
        {...swipe.pan.panHandlers}
      >
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
              <View
                style={[
                  styles.badge,
                  item.channel === "facebook" ? styles.badgeFacebook : styles.badgeZalo,
                ]}
              >
                <Text style={styles.badgeText}>
                  {item.channel === "facebook" ? copy.channelFacebook : copy.channelZalo}
                </Text>
              </View>
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
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.badge },
  badgeZalo: { backgroundColor: theme.zaloBlue },
  badgeFacebook: { backgroundColor: theme.facebookBlue },
  badgeText: { color: theme.white, fontSize: 10, fontWeight: "700" },
  time: { color: theme.muted, fontSize: 12 },
  preview: { color: theme.muted, fontSize: 14 },
});
