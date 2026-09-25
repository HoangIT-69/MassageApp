import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme, spacing } from "../theme";

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={[styles.row, right ? styles.rowWithAction : null]}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.zaloBlue },
  row: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowWithAction: { paddingRight: 180 },
  title: { color: theme.headerText, fontSize: 18, fontWeight: "700", flex: 1 },
});
