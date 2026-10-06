// components/notifications/NotificationRow.tsx
// Tappable card used by the Notifications screen's Today/Earlier sections;
// owns the per-type icon and the tap-through route for each notification.
// "announcement" is the one type with its own distinct "sender card" look
// (RiskQ logo + "Cordova RISKQ" + time, matching the Home advisory banner
// and the admin composer's own preview) -- it's the one notification type
// that's actually a broadcast FROM Cordova RiskQ/the admin, so it's the
// only one that gets that byline. Every other type (SOS, incident status,
// roster updates, ...) keeps the original plain type-icon layout, just
// system-generated updates about the citizen's/responder's own activity,
// not a named sender.
// Swipe-left-to-delete follows the same Gesture.Pan pattern as SOSButton.tsx.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogMessage,
  DialogTitle,
} from "@/components/common/Dialog";
import { getNotificationReadDisplay } from "@/components/notifications/notificationReadDisplay";
import type { AppNotification, NotificationType } from "@/services/notification.service";
import { FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import { formatRelativeTime, formatShortDateTime } from "@/utils/formatter";

const SWIPE_MAX = 120;
const DELETE_THRESHOLD = 80;

const FALLBACK_ROUTE_BY_TYPE: Record<
  NotificationType,
  "/(tabs)/report-history" | "/(tabs)/home" | "/responder"
> = {
  // "announcement" falls back to home only for notification rows created
  // before the backend started sending a referenceId -- see
  // getNotificationRoute below, which routes a referenceId'd announcement
  // to /announcement-detail/[id] instead, matching
  // hooks/useNotificationDeepLink.ts's push-notification behavior.
  incident_status: "/(tabs)/report-history",
  announcement: "/(tabs)/home",
  tide_risk: "/(tabs)/home",
  new_incident: "/responder",
  roster_update: "/responder",
  team_ring: "/responder",
};

const RESPONDER_NOTIFICATION_TYPES: NotificationType[] = [
  "new_incident",
  "roster_update",
  "team_ring",
];

function getNotificationRoute(item: AppNotification) {
  if (item.type === "incident_status" && item.referenceId) {
    return `/report-detail/${item.referenceId}` as const;
  }
  if (RESPONDER_NOTIFICATION_TYPES.includes(item.type) && item.referenceId) {
    return `/responder/${item.referenceId}` as const;
  }
  if (item.type === "announcement" && item.referenceId) {
    return { pathname: "/announcement-detail/[id]", params: { id: item.referenceId } } as const;
  }
  return FALLBACK_ROUTE_BY_TYPE[item.type] ?? "/(tabs)/home";
}

export default function NotificationRow({
  item,
  onDelete,
  deleting = false,
}: {
  item: AppNotification;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));
  const { icon, color, bg, border } = getNotificationReadDisplay(item, COLORS);

  // A failed delete (no backend route yet -- see deleteNotification's
  // comment in notification.service.ts) leaves this row mounted with
  // deleting flipping back to false; a successful one unmounts the row
  // entirely via the parent's list filter, so this only ever fires on
  // failure -- spring the swiped-away card back into place.
  useEffect(() => {
    if (!deleting) {
      translateX.value = withSpring(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleting]);

  // Swiping past the threshold only reveals the confirm dialog -- it never
  // deletes by itself, so an accidental/careless swipe can't lose a
  // notification without a deliberate second confirmation.
  function handleCancelDelete() {
    setShowConfirm(false);
    translateX.value = withSpring(0);
  }

  function handleConfirmDelete() {
    setShowConfirm(false);
    translateX.value = withTiming(-500, { duration: 200 }, (finished) => {
      if (finished && onDelete) runOnJS(onDelete)();
    });
  }

  const pan = Gesture.Pan()
    .enabled(!!onDelete && !deleting)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      translateX.value = Math.max(-SWIPE_MAX, Math.min(0, event.translationX));
    })
    .onEnd(() => {
      if (translateX.value < -DELETE_THRESHOLD && onDelete) {
        translateX.value = withTiming(-SWIPE_MAX, { duration: 150 }, (finished) => {
          if (finished) runOnJS(setShowConfirm)(true);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  return (
    <View style={styles.swipeWrap}>
      {onDelete && (
        <View style={styles.deleteBackground}>
          {deleting ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          )}
        </View>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={animatedStyle}>
          <Pressable
            style={[
              styles.card,
              { borderColor: border, borderWidth: item.read ? 1 : 1.5 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(getNotificationRoute(item));
            }}
            onPressIn={() => {
              scale.value = withTiming(0.98, { duration: 100 });
            }}
            onPressOut={() => {
              scale.value = withTiming(1, { duration: 100 });
            }}
          >
            {item.type === "announcement" ? (
              <>
                <View style={styles.senderLogoCircle}>
                  <Image
                    source={require("@/assets/images/riskq.png")}
                    style={styles.senderLogoImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.textCol}>
                  <View style={styles.headerRow}>
                    <Text style={styles.senderName} numberOfLines={1}>
                      Cordova RISKQ
                    </Text>
                    <Text style={styles.dateText} numberOfLines={1}>
                      {formatShortDateTime(item.createdAt)}
                    </Text>
                    {!item.read && (
                      <View style={[styles.pill, { backgroundColor: bg }]}>
                        <Text style={[styles.pillText, { color }]}>New</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={14} color={COLORS.white} />
                </View>
              </>
            ) : (
              <>
                <Ionicons name={icon} size={20} color={color} style={styles.icon} />

                <View style={styles.textCol}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={styles.meta}>{formatRelativeTime(item.createdAt)}</Text>
                </View>

                {!item.read && (
                  <View style={[styles.pill, { backgroundColor: bg }]}>
                    <Text style={[styles.pillText, { color }]}>New</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>

      <Modal
        transparent
        visible={showConfirm}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <Dialog>
          <DialogIcon name="trash-outline" color={COLORS.danger} />
          <DialogTitle>Delete notification?</DialogTitle>
          <DialogMessage>
            Are you sure you want to delete this notification?
          </DialogMessage>
          <DialogActions>
            <DialogButton label="Cancel" variant="secondary" onPress={handleCancelDelete} />
            <DialogButton label="Delete" variant="primary" onPress={handleConfirmDelete} />
          </DialogActions>
        </Dialog>
      </Modal>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    swipeWrap: {
      borderRadius: RADIUS.lg,
    },
    deleteBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "flex-end",
      justifyContent: "center",
      paddingRight: SPACING.lg,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm + SPACING.xs,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md + 2,
      ...SHADOW,
    },
    // No circle background -- a fixed width keeps the row's text column
    // aligned regardless of which glyph's natural width differs slightly.
    icon: {
      width: 26,
      textAlign: "center",
    },
    textCol: {
      flex: 1,
      gap: SPACING.xs,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.text,
    },
    body: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      lineHeight: 19,
    },
    meta: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginTop: 2,
    },
    senderLogoCircle: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      borderWidth: 1,
      borderColor: COLORS.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    senderLogoImage: {
      width: 16,
      height: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    senderName: {
      flex: 1,
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.text,
    },
    dateText: {
      flexShrink: 0,
      fontSize: 11,
      color: COLORS.textTertiary,
    },
    // Background is always overridden inline with the type's own color
    // (getNotificationReadDisplay) -- this is just a sane fallback.
    typeBadge: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    pill: {
      borderRadius: RADIUS.full,
      paddingVertical: 4,
      paddingHorizontal: SPACING.sm,
      alignSelf: "flex-start",
    },
    pillText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
  });
}
