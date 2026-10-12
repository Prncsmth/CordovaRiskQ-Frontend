// components/map/ResponderMarker.tsx
// One responder on the Mapbox map (MapMarker icon "responder"): a RiskQ-red
// circle with a white vehicle or walking symbol and a small RiskQ logo
// badge. No name -- names live in the screen's responder chips.
//
// When its coordinate changes it glides there over MARKER_GLIDE_MS instead
// of jumping. The glide lives entirely in this component's own state, so
// only this marker re-renders while it moves -- not the map, not the other
// responders (memo + primitive props; MapboxMap passes a stable onPress).
// A new position arriving mid-glide restarts the glide from wherever the
// marker currently is toward the new target -- one animation at a time,
// never a pile of competing ones -- and unmounting cancels it.
//
// Rendered with MarkerView (a React view) rather than a native symbol layer:
// a symbol layer needs the icons as bitmap images, which this project
// doesn't have, while Ionicons + the existing logo asset render here as-is.
// With a handful of responders that's cheap.
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import type { Coordinates } from "@/services/location.service";
import { RADIUS, SHADOW } from "@/theme";
import {
  distanceMeters,
  easeInOutCubic,
  interpolateCoordinate,
  MARKER_GLIDE_MS,
  MARKER_SNAP_METERS,
} from "@/utils/liveTracking";

// ~30 fps is plenty for a marker sliding a few meters and halves the work
// on a low-end Android phone compared with every animation frame.
const FRAME_INTERVAL_MS = 32;

type Props = {
  MarkerView: React.ComponentType<any>;
  id: string;
  latitude: number;
  longitude: number;
  movement: "vehicle" | "walking";
  selected: boolean;
  color: string;
  accessibilityLabel?: string;
  onPress: (id: string) => void;
};

function ResponderMarker({
  MarkerView,
  id,
  latitude,
  longitude,
  movement,
  selected,
  color,
  accessibilityLabel,
  onPress,
}: Props) {
  const [position, setPosition] = useState<Coordinates>({ latitude, longitude });
  // Where the marker is drawn right now (mid-glide too), so a new target
  // starts from there rather than from the old target.
  const shownRef = useRef<Coordinates>(position);

  useEffect(() => {
    const from = shownRef.current;
    const to = { latitude, longitude };
    if (from.latitude === to.latitude && from.longitude === to.longitude) return;

    let frame: number | null = null;
    const show = (next: Coordinates) => {
      shownRef.current = next;
      setPosition(next);
    };

    if (distanceMeters(from, to) > MARKER_SNAP_METERS) {
      frame = requestAnimationFrame(() => show(to));
      return () => {
        if (frame !== null) cancelAnimationFrame(frame);
      };
    }

    const startedAt = Date.now();
    let lastFrameAt = 0;
    const step = () => {
      const now = Date.now();
      const t = Math.min(1, (now - startedAt) / MARKER_GLIDE_MS);
      if (t >= 1) {
        show(to);
        frame = null;
        return;
      }
      if (now - lastFrameAt >= FRAME_INTERVAL_MS) {
        lastFrameAt = now;
        show(interpolateCoordinate(from, to, easeInOutCubic(t)));
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [latitude, longitude]);

  const size = selected ? 42 : 34;

  return (
    // allowOverlap/allowOverlapWithPuck: MarkerView defaults both to false,
    // which makes Mapbox HIDE a marker whenever it overlaps another marker
    // or the citizen's own blue dot -- two responders close together (or
    // one reaching the citizen) would vanish. Overlapping is fine; hiding
    // isn't. isSelected draws the focused responder on top.
    <MarkerView
      coordinate={[position.longitude, position.latitude]}
      allowOverlap
      allowOverlapWithPuck
      isSelected={selected}
    >
      <Pressable
        hitSlop={8}
        onPress={() => onPress(id)}
        style={styles.wrap}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? "Responder"}
      >
        {selected && <View style={[styles.halo, { backgroundColor: color }]} />}
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              backgroundColor: color,
              borderWidth: selected ? 3 : 2,
            },
          ]}
        >
          <Ionicons name={movement === "walking" ? "walk" : "car"} size={selected ? 22 : 18} color="#fff" />
        </View>
        <View style={styles.badge}>
          <Image source={require("@/assets/images/riskq.png")} style={styles.badgeLogo} resizeMode="contain" />
        </View>
      </Pressable>
    </MarkerView>
  );
}

export default memo(ResponderMarker);

const styles = StyleSheet.create({
  wrap: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    opacity: 0.22,
  },
  circle: {
    borderRadius: RADIUS.full,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  badge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  badgeLogo: {
    width: 14,
    height: 14,
  },
});
