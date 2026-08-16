import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING } from "@/theme";

type HomeHeaderProps = {
  hasUnread: boolean;
};

export default function HomeHeader({ hasUnread }: HomeHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <View style={styles.logoBadge}>
          <Image
            source={require("@/assets/images/riskq.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.wordmark}>
          <View style={styles.brandLine}>
            <Text style={styles.brandText}>C</Text>
            <Image
              source={require("@/assets/images/cordova-logo.png")}
              style={styles.monogram}
              resizeMode="contain"
            />
            <Text style={styles.brandText}>RDOVA</Text>
          </View>
          <View style={styles.riskLine}>
            <Text style={styles.riskText}>RISKQ</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.bell}
        onPress={() => router.push("/notifications")}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications" size={18} color="#A70707" />
        {hasUnread ? <View style={styles.dot} /> : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.xs,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F3E4E4",
    ...SHADOW,
  },
  logo: {
    width: 24,
    height: 24,
  },
  wordmark: {
    flexDirection: "column",
    alignItems: "flex-start",
    flexShrink: 1,
    marginLeft: 2,
  },
  brandLine: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: -1,
  },
  riskLine: {
    alignSelf: "flex-start",
    marginTop: 0,
  },
  brandText: {
    color: "#A70707",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  riskText: {
    color: "#FE6B47",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  monogram: {
    width: 15,
    height: 15,
    marginHorizontal: 2,
    marginBottom: 1,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3E4E4",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
});
