// responder/components/incident-detail/IncidentPhoto.tsx
// The reporter's photo of the incident (uploaded with the report, see
// services/report.service.ts#uploadReportPhoto). A thumbnail in the
// incident details; tap for a full-screen view. Renders nothing when the
// report has no photo.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RADIUS, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export default function IncidentPhoto({
  uri,
  style,
}: {
  uri: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  if (!uri) return null;

  return (
    <View style={style}>
      <Text style={styles.label}>Photo from reporter</Text>
      <Pressable
        onPress={() => !failed && setOpen(true)}
        style={styles.thumbWrap}
        accessibilityRole="imagebutton"
        accessibilityLabel="Photo from reporter. Tap to view full screen."
      >
        {failed ? (
          <View style={styles.placeholder}>
            <Ionicons name="image-outline" size={22} color={COLORS.textTertiary} />
            <Text style={styles.placeholderText}>Photo couldn&apos;t load</Text>
          </View>
        ) : (
          <>
            <Image
              source={{ uri }}
              style={styles.thumb}
              resizeMode="cover"
              onLoadEnd={() => setLoading(false)}
              onError={() => setFailed(true)}
            />
            {loading && (
              <View style={styles.placeholder}>
                <ActivityIndicator color={COLORS.textSecondary} />
              </View>
            )}
            <View style={styles.expandBadge}>
              <Ionicons name="expand-outline" size={14} color={COLORS.white} />
            </View>
          </>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.viewer}>
          <Image source={{ uri }} style={styles.fullImage} resizeMode="contain" />
          <Pressable
            onPress={() => setOpen(false)}
            style={[styles.closeButton, { top: insets.top + SPACING.sm }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      marginBottom: SPACING.xs,
    },
    thumbWrap: {
      height: 180,
      borderRadius: RADIUS.md,
      overflow: "hidden",
      backgroundColor: COLORS.surface,
    },
    thumb: {
      width: "100%",
      height: "100%",
    },
    placeholder: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.xs,
    },
    placeholderText: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
    expandBadge: {
      position: "absolute",
      right: SPACING.sm,
      bottom: SPACING.sm,
      width: 28,
      height: 28,
      borderRadius: RADIUS.full,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    viewer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },
    fullImage: {
      width: "100%",
      height: "100%",
    },
    closeButton: {
      position: "absolute",
      right: SPACING.md,
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
