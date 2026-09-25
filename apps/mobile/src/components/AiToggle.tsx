import { StyleSheet, Switch, Text, View } from "react-native";
import { copy } from "../copy";
import { spacing, theme } from "../theme";

export function AiToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{copy.aiLabel}</Text>
      <Switch
        accessibilityLabel={copy.aiSwitch}
        value={enabled}
        onValueChange={onChange}
        trackColor={{ false: theme.line, true: theme.headerText }}
        thumbColor={enabled ? theme.zaloBlue : theme.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  label: { color: theme.headerText, fontWeight: "700" },
});
