import { useFocusEffect, useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import type { CategoryId } from "@/components/report/categories";
import CategoryGrid from "@/components/report/CategoryGrid";
import DetailsInput from "@/components/report/DetailsInput";
import PhotoPicker from "@/components/report/PhotoPicker";
import PinnedLocationCard from "@/components/report/PinnedLocationCard";
import ReportFirstTimeGuide from "@/components/tour/ReportFirstTimeGuide";
import {
    CORDOVA_BARANGAYS,
    getNearestBarangay,
} from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import * as authStorage from "@/context/authStorage";
import { useReportLocation } from "@/context/ReportLocationContext";
import { getCurrentLocation } from "@/services/location.service";
import { createReport } from "@/services/report.service";
import {
    FONT_FAMILY,
    SPACING,
    TYPOGRAPHY,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

const FALLBACK_COORDS = CORDOVA_BARANGAYS.find((b) => b.id === "poblacion")!;
const FALLBACK_LOCATION = {
  address: `Barangay ${FALLBACK_COORDS.name}, Cordova`,
  latitude: FALLBACK_COORDS.latitude,
  longitude: FALLBACK_COORDS.longitude,
};
const REPORT_GUIDE_SEEN_KEY = "report_guide_seen_users";

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [details, setDetails] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);
  const { location: pinnedLocation } = useReportLocation();
  const [gpsLocation, setGpsLocation] = useState(FALLBACK_LOCATION);
  const [showReportGuide, setShowReportGuide] = useState(false);
  const reportScrollRef = useRef<ScrollView>(null);
  const categoryTargetRef = useRef<View>(null);
  const locationTargetRef = useRef<View>(null);
  const detailsTargetRef = useRef<View>(null);
  const submitTargetRef = useRef<View>(null);

  useEffect(() => {
    if (!user?.id) return;
    authStorage
      .getItem(REPORT_GUIDE_SEEN_KEY)
      .then((raw) => {
        const seenUsers = raw ? JSON.parse(raw) : {};
        setShowReportGuide(!seenUsers[user.id]);
      })
      .catch(() => setShowReportGuide(true));
  }, [user?.id]);

  const finishReportGuide = () => {
    if (user?.id) {
      authStorage
        .getItem(REPORT_GUIDE_SEEN_KEY)
        .then((raw) => {
          const seenUsers = raw ? JSON.parse(raw) : {};
          return authStorage.setItem(
            REPORT_GUIDE_SEEN_KEY,
            JSON.stringify({ ...seenUsers, [user.id]: true }),
          );
        })
        .catch(() => {});
    }
    setShowReportGuide(false);
  };

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
    <View style={styles.flex}>
      <ScrollView
        ref={reportScrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
        ]}
      >
        <BackButton onPress={() => router.back()} />
        <View style={styles.section}>
          <Text style={styles.title}>Report an Incident</Text>
          <Text style={styles.subtitle}>
            Select a category and share details
          </Text>
        </View>
        <View
          ref={categoryTargetRef}
          collapsable={false}
          style={styles.section}
        >
          <Text style={styles.sectionHeading}>Category</Text>
          <CategoryGrid selected={category} onSelect={setCategory} />
        </View>
        <View
          ref={locationTargetRef}
          collapsable={false}
          style={styles.section}
        >
          <Text style={styles.sectionHeading}>Pinned Location</Text>
          <PinnedLocationCard
            address={activeLocation.address}
            latitude={activeLocation.latitude}
            longitude={activeLocation.longitude}
          />
        </View>
        <View ref={detailsTargetRef} collapsable={false} style={styles.section}>
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
            onToggle={() => setPhotoAttached((value) => !value)}
          />
        </View>
        <View ref={submitTargetRef} collapsable={false}>
          <PrimaryButton
            title="Submit Report"
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </View>
      </ScrollView>
      {showReportGuide ? (
        <ReportFirstTimeGuide
          targetRefs={[
            categoryTargetRef,
            locationTargetRef,
            detailsTargetRef,
            submitTargetRef,
          ]}
          scrollRef={reportScrollRef}
          onFinish={finishReportGuide}
        />
      ) : null}
    </View>
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
