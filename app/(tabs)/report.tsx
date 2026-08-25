import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import type { CategoryId } from "@/components/report/categories";
import CategoryGrid from "@/components/report/CategoryGrid";
import DetailsInput from "@/components/report/DetailsInput";
import PhotoPicker from "@/components/report/PhotoPicker";
import PinnedLocationCard from "@/components/report/PinnedLocationCard";
import { CORDOVA_BARANGAYS } from "@/constants/cordovaBarangays";
import { useReportLocation } from "@/context/ReportLocationContext";
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
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { location } = useReportLocation();
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [details, setDetails] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);

  // Defaults to the municipal fallback until the user pins their actual
  // location from the Evacuation Map tab's pin toggle.
  const activeLocation = location ?? FALLBACK_LOCATION;
  const canSubmit = category !== null && details.trim().length > 0;

  const handleSubmit = async () => {
    if (!category || details.trim().length === 0) return;

    const result = await createReport({
      category,
      location: activeLocation.address,
      latitude: activeLocation.latitude,
      longitude: activeLocation.longitude,
      details,
      hasPhoto: photoAttached,
    });

    router.push({
      pathname: "/report-confirmation",
      params: { ref: result.ref, category, location: activeLocation.address },
    });
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
