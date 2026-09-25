import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../../src/auth";
import { ManageFrame } from "../../src/admin/ui";
import { LoadingState } from "../../src/components/StatusText";
import { copy } from "../../src/copy";
import { spacing, theme } from "../../src/theme";

const LINKS = [
  { href: "/manage/shop", label: copy.manageShop },
  { href: "/manage/staff", label: copy.manageStaff },
  { href: "/manage/customers", label: copy.manageCustomers },
  { href: "/manage/bookings", label: copy.manageBookings },
  { href: "/manage/sessions", label: copy.manageSessions },
] as const;

export default function ManageHome() {
  const { token, ready } = useAuth();
  const router = useRouter();
  if (!ready) return <LoadingState />;
  if (!token) return <Redirect href="/login" />;

  return (
    <ManageFrame title={copy.manageTitle}>
      <View>
        {LINKS.map((link) => (
          <Pressable
            key={link.href}
            accessibilityLabel={link.label}
            onPress={() => router.push(link.href)}
            style={styles.row}
          >
            <Text style={styles.label}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </ManageFrame>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
  },
  label: { color: theme.text, fontSize: 16, fontWeight: "600" },
});
