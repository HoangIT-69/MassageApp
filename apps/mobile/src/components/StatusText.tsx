import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { copy } from "../copy";
import { theme } from "../theme";

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.zaloBlue} />
      <Text style={styles.text}>{copy.loading}</Text>
    </View>
  );
}

export function ErrorText({ message }: { message: string }) {
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.listBg,
  },
  text: { color: theme.muted },
  error: { color: theme.danger, textAlign: "center" },
});
