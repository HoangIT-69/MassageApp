import { Pressable, StyleSheet, Text } from "react-native";
import { spacing, theme } from "../theme";

export function HeaderButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={styles.button}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  text: { color: theme.headerText, fontSize: 15, fontWeight: "600" },
});
