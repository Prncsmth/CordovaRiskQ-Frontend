import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppMap from "@/components/map/AppMap";
import { useReportLocation } from "@/context/ReportLocationContext";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import { isInsideCordova } from "@/utils/geofence";

type PinnedLocationCardProps = {
  address: string;
  latitude: number;
  longitude: number;
  // Where the location came from: the phone's GPS, or a pin the user
  // dropped on the map -- shown so they know which one will be sent.
  source: "gps" | "pinned";
};

const MAP_HEIGHT = 120;

// The report's location, read at a glance: a clean map preview on top (no
// overlays), then the address, one line saying where it came from and
// whether it's inside Cordova, and a clear Change button. The whole card
// opens the map to move the pin.
export default function PinnedLocationCard({
  address,
  latitude,
  longitude,
  source,
}: PinnedLocationCardProps) {
  const router = useRouter();
  const { requestLocationChange } = useReportLocation();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const withinCordova = isInsideCordova(latitude, longitude);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Bumps a shared counter the Map tab watches (see
        // ReportLocationContext) so it can tell "the user just tapped
        // Change again" apart from "this tab merely regained focus" and
        // reset its pin-drop state fresh each time -- route params alone
        // aren't reliably re-delivered to an already-mounted tab screen.
        requestLocationChange();
        router.push({ pathname: "/(tabs)/map", params: { intent: "change-location" } });
      }}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Report location: ${address}. Tap to change.`}
    >
      <View style={styles.mapBox}>
        <AppMap
          // Both map engines only apply `center` on initial mount (see
          // components/map/types.ts); moving an already-mounted camera
          // imperatively via flyTo turned out unreliable in practice (the
          // engine's WebView/camera isn't guaranteed ready by the time a
          // location change fires, and there's no dependable signal for
          // when it becomes so). Keying on the coordinates instead forces a
          // clean remount whenever the location changes, so the map always
          // uses the one code path proven to place it correctly: its own
          // initial mount.
          key={`${latitude.toFixed(5)}-${longitude.toFixed(5)}`}
          style={styles.map}
          center={{ latitude, longitude }}
          zoom={15}
          interactive={false}
          showLayerSwitcher={false}
          markers={[{ id: "pin", latitude, longitude, color: COLORS.primary }]}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.textCol}>
          <Text style={styles.address} numberOfLines={2}>
            {address}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {source === "pinned" ? "Pinned on map" : "Your current location"}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons
              name={withinCordova ? "checkmark-circle" : "alert-circle"}
              size={13}
              color={withinCordova ? COLORS.success : COLORS.warning}
            />
            <Text style={[styles.metaText, { color: withinCordova ? COLORS.success : COLORS.warning }]}>
              {withinCordova ? "Within Cordova" : "Outside Cordova"}
            </Text>
          </View>
        </View>

        <View style={styles.changeButton}>
          <Text style={styles.changeText}>Change</Text>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: RADIUS.lg,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      overflow: "hidden",
      ...SHADOW,
    },
    cardPressed: {
      opacity: 0.92,
    },
    mapBox: {
      height: MAP_HEIGHT,
      backgroundColor: COLORS.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.borderMuted,
    },
    map: {
      ...StyleSheet.absoluteFill,
    },
    body: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      padding: SPACING.md,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
    },
    address: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 4,
    },
    metaText: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
    },
    metaDot: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
    changeButton: {
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: 7,
    },
    changeText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.primary,
    },
  });
}
