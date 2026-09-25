import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenHeader } from "../components/ScreenHeader";
import { copy } from "../copy";
import { radius, spacing, theme } from "../theme";

export function ManageFrame({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={title}
        left={
          <Pressable accessibilityLabel={copy.back} onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>{copy.back}</Text>
          </Pressable>
        }
      />
      {children}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  multiline,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboard?: "default" | "numeric" | "phone-pad";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboard ?? "default"}
        style={[styles.input, multiline ? styles.area : null]}
      />
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.primary}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function QuietButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={styles.quiet}>
      <Text style={styles.quietText}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ message, error }: { message: string; error: string }) {
  return (
    <View style={styles.notice}>
      {message ? <Text style={styles.saved}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.listBg },
  back: { paddingVertical: spacing.xs },
  backText: { color: theme.headerText, fontSize: 15, fontWeight: "600" },
  field: { gap: spacing.xs },
  label: { color: theme.muted, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: theme.text,
    fontSize: 16,
    backgroundColor: theme.white,
  },
  area: { minHeight: 88, textAlignVertical: "top" },
  primary: {
    backgroundColor: theme.zaloBlue,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  primaryText: { color: theme.headerText, fontWeight: "700" },
  quiet: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    backgroundColor: theme.white,
  },
  quietText: { color: theme.text, fontWeight: "600" },
  notice: { gap: spacing.xs },
  saved: { color: theme.zaloBlue },
  error: { color: theme.danger },
});

export const cardStyle = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  title: { color: theme.text, fontSize: 16, fontWeight: "700" },
  meta: { color: theme.muted, fontSize: 14 },
});
