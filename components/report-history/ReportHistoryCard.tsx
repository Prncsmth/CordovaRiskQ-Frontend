import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
import { getCategoryVisual } from "@/components/report/categories";
import { getReportStatusDisplay } from "@/components/report/reportStatusDisplay";
import type { ReportHistoryItem } from "@/services/report.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

const SWIPE_MAX = 120;
const DELETE_THRESHOLD = 80;

type ReportHistoryCardProps = {
  item: ReportHistoryItem;
  onDelete?: () => void;
  deleting?: boolean;
};

export default function ReportHistoryCard({
  item,
  onDelete,
  deleting = false,
}: ReportHistoryCardProps) {
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { label, color, bg } = getReportStatusDisplay(item.status, COLORS);
  const categoryVisual = getCategoryVisual(item.categoryId);
  const translateX = useSharedValue(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // A failed delete (no backend route yet -- see deleteReport's comment in
  // report.service.ts) leaves this card mounted with deleting flipping back
  // to false; a successful one unmounts the card entirely via the parent's
  // list filter, so this only ever fires on failure -- spring the
  // swiped-away card back into place.
  useEffect(() => {
    if (!deleting) {
      translateX.value = withSpring(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleting]);

  // Swiping past the threshold only reveals the confirm dialog -- it never
  // deletes by itself, so an accidental/careless swipe can't lose a report
  // without a deliberate second confirmation.
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
            style={styles.card}
            onPress={() => router.push(`/report-detail/${item.id}`)}
          >
            <Ionicons
              name={categoryVisual.icon}
              size={20}
              color={categoryVisual.color}
              style={styles.icon}
            />

            <View style={styles.textCol}>
              <Text style={styles.category} numberOfLines={1}>
                {item.category}
              </Text>
              <Text style={styles.location} numberOfLines={1}>
                {item.location}
              </Text>
              <Text style={styles.meta}>
                {item.date} · {item.ref}
              </Text>
            </View>

            <View style={[styles.pill, { backgroundColor: bg }]}>
              <Text style={[styles.pillText, { color }]}>{label}</Text>
            </View>
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
          <DialogTitle>Delete report?</DialogTitle>
          <DialogMessage>
            Are you sure you want to delete this report from your history?
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
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
    ...SHADOW,
  },
  // No circle background -- a fixed width keeps every card's text column
  // aligned regardless of which glyph's natural width differs slightly.
  icon: {
    width: 26,
    textAlign: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  location: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  meta: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: 2,
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
