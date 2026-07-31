import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ContactSupportCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text style={styles.message}>
        If you have any other query you can reach out to us.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/contact-support")}
        hitSlop={8}
      >
        <Text style={styles.link}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryTint,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    gap: SPACING.xs,
  },
  message: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  link: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
});
