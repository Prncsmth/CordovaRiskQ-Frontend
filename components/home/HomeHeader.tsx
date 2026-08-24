import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
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
        <View style={styles.logoBadgeOuter}>
          <BlurView intensity={50} tint="light" style={styles.logoBadge}>
            <Image
              source={require("@/assets/images/riskq.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </BlurView>
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
        style={styles.bellOuter}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/notifications");
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <BlurView intensity={50} tint="light" style={styles.bell}>
          <Ionicons name="notifications" size={18} color="#A70707" />
          {hasUnread ? <View style={styles.dot} /> : null}
        </BlurView>
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
  logoBadgeOuter: {
    width: 40,
    height: 40,
    borderRadius: 14,
    ...SHADOW,
  },
  logoBadge: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
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
  bellOuter: {
    width: 38,
    height: 38,
    borderRadius: 12,
    ...SHADOW,
  },
  bell: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
    justifyContent: "center",
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
