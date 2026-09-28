import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

const AVATAR_SIZE = 44;

export function Avatar({ name, uri }: { name: string; uri: string | null }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = uri !== null && failedUri === uri;
  const label = name.trim().charAt(0).toUpperCase() || "?";
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={name}
        style={styles.image}
        onError={() => setFailedUri(uri)}
      />
    );
  }
  return (
    <View style={styles.fallback} accessibilityLabel={name}>
      <Text style={styles.letter}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  fallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.zaloBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: { color: theme.white, fontWeight: "700" },
});
