import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import type { CategoryId } from "@/components/report/categories";
import CategoryGrid from "@/components/report/CategoryGrid";
import DetailsInput from "@/components/report/DetailsInput";
import PhotoPicker from "@/components/report/PhotoPicker";
import PinnedLocationCard from "@/components/report/PinnedLocationCard";
import {
  CORDOVA_BARANGAYS,
  getNearestBarangay,
} from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import { useReportLocation } from "@/context/ReportLocationContext";
import { getCurrentLocation } from "@/services/location.service";
import { createReport } from "@/services/report.service";
import { FONT_FAMILY, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

const FALLBACK_COORDS = CORDOVA_BARANGAYS.find((b) => b.id === "poblacion")!;
const FALLBACK_LOCATION = {
  address: `Barangay ${FALLBACK_COORDS.name}, Cordova`,
  latitude: FALLBACK_COORDS.latitude,
  longitude: FALLBACK_COORDS.longitude,
};

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [details, setDetails] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const { location: pinnedLocation } = useReportLocation();
  const [gpsLocation, setGpsLocation] = useState(FALLBACK_LOCATION);

  useFocusEffect(
    useCallback(() => {
      getCurrentLocation()
        .then((fix) => {
          if (!fix) return;
          const nearest = getNearestBarangay(fix.latitude, fix.longitude);
          setGpsLocation({
            address: `Barangay ${nearest.name}, Cordova`,
            latitude: fix.latitude,
            longitude: fix.longitude,
          });
        })
        .catch(() => {});
    }, []),
  );

  // Prefers a location the user explicitly pinned from the Evacuation Map
  // tab's pin toggle; otherwise falls back to the GPS-detected barangay.
  const activeLocation = pinnedLocation ?? gpsLocation;
  const canSubmit = category !== null && details.trim().length > 0;

  const handleSubmit = async () => {
    if (!category || details.trim().length === 0 || !token) return;

    try {
      const result = await createReport(token, {
        category,
        details,
        locationLabel: activeLocation.address,
        latitude: activeLocation.latitude,
        longitude: activeLocation.longitude,
      });

      router.push({
        pathname: "/report-confirmation",
        params: { ref: result.ref, category, location: activeLocation.address },
      });
    } catch (err) {
      Alert.alert(
        "Couldn't submit report",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <BackButton onPress={() => router.back()} />

      <View style={styles.section}>
        <Text style={styles.title}>Report an Incident</Text>
        <Text style={styles.subtitle}>Select a category and share details</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Category</Text>
        <CategoryGrid selected={category} onSelect={setCategory} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Pinned Location</Text>
        <PinnedLocationCard
          address={activeLocation.address}
          latitude={activeLocation.latitude}
          longitude={activeLocation.longitude}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Details</Text>
        <DetailsInput value={details} onChangeText={setDetails} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>Photo</Text>
          <Text style={styles.optionalTag}>Optional</Text>
        </View>
        <PhotoPicker
          attached={photoAttached}
          onToggle={() => setPhotoAttached((v) => !v)}
        />
      </View>

      <PrimaryButton
        title="Submit Report"
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </ScrollView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.sm,
  },
  title: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  optionalTag: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  });
}
