import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";

type Faq = {
  id: string;
  category: "Safety" | "Reports" | "Account";
  question: string;
  answer: string;
};

const FAQS: Faq[] = [
  {
    id: "sos",
    category: "Safety",
    question: "When should I use the SOS button?",
    answer:
      "Use SOS when you or someone nearby faces an immediate emergency. Share your location and keep your phone available for responders.",
  },
  {
    id: "evacuation",
    category: "Safety",
    question: "How do I find the nearest evacuation center?",
    answer:
      "Open Map from the home screen to view evacuation centers near your current location. Tap a marker to see its details and status.",
  },
  {
    id: "report",
    category: "Reports",
    question: "How do I report an incident?",
    answer:
      "Open Report, choose the incident type, add the location and details, then submit. You can follow its status from Report History.",
  },
  {
    id: "privacy",
    category: "Reports",
    question: "Who can see my incident report?",
    answer:
      "Reports are shared with authorized response teams so they can assess the situation and coordinate an appropriate response.",
  },
  {
    id: "phone",
    category: "Account",
    question: "Why do I need to add a phone number?",
    answer:
      "Your phone number helps responders contact you when an incident needs clarification or when urgent assistance is being coordinated.",
  },
  {
    id: "offline",
    category: "Account",
    question: "What happens if my connection is unstable?",
    answer:
      "Keep the app open and try again when your connection returns. For immediate danger, call your local emergency hotline directly.",
  },
];

export default function FaqsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Faq["category"]>("All");
  const [openId, setOpenId] = useState<string | null>("sos");

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return FAQS.filter((faq) => {
      const matchesCategory = category === "All" || faq.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${faq.question} ${faq.answer}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <View style={styles.hero}>
        <LinearGradient
          colors={COLORS.iconTileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroIcon}
        >
          <Ionicons name="sparkles-outline" size={22} color={COLORS.primary} />
        </LinearGradient>
        <Text style={styles.eyebrow}>RISKQ GUIDE</Text>
        <Text style={styles.title}>Answers, when you need them.</Text>
        <Text style={styles.subtitle}>
          Quick guidance for staying safe, reporting incidents, and getting
          help.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={19} color={COLORS.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search questions"
          placeholderTextColor={COLORS.textTertiary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={COLORS.textTertiary}
            />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {(["All", "Safety", "Reports", "Account"] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCategory(item);
            }}
            style={[styles.chip, category === item && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                category === item && styles.chipTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Frequently Asked</Text>
        <Text style={styles.resultCount}>{filteredFaqs.length} articles</Text>
      </View>

      {filteredFaqs.length > 0 ? (
        <View style={styles.card}>
          {filteredFaqs.map((faq, index) => (
            <View
              key={faq.id}
              style={index < filteredFaqs.length - 1 ? styles.rowDivider : undefined}
            >
              <FaqRow
                faq={faq}
                isOpen={openId === faq.id}
                onToggle={() =>
                  setOpenId((current) => (current === faq.id ? null : faq.id))
                }
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="search-outline"
            size={28}
            color={COLORS.textTertiary}
          />
          <Text style={styles.emptyTitle}>No matching questions</Text>
          <Text style={styles.emptyText}>
            Try another search or category.
          </Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.footerNote, pressed && styles.pressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/contact-support");
        }}
      >
        <Ionicons name="headset-outline" size={20} color={COLORS.tide} />
        <View style={styles.footerCopy}>
          <Text style={styles.footerTitle}>Still need help?</Text>
          <Text style={styles.footerText}>Contact support directly.</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={COLORS.tide} />
      </Pressable>
    </ScrollView>
  );
}

function FaqRow({
  faq,
  isOpen,
  onToggle,
}: {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          onPressIn={() => {
            scale.value = withTiming(0.98, { duration: 100 });
          }}
          onPressOut={() => {
            scale.value = withTiming(1, { duration: 100 });
          }}
          style={styles.questionRow}
        >
          <View
            style={[
              styles.categoryDot,
              faq.category === "Safety" && styles.safetyDot,
            ]}
          />
          <Text style={styles.question}>{faq.question}</Text>
          <Ionicons
            name={isOpen ? "remove" : "add"}
            size={18}
            color={isOpen ? COLORS.primary : COLORS.textSecondary}
          />
        </Pressable>
      </Animated.View>
      {isOpen && <Text style={styles.answer}>{faq.answer}</Text>}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  backButton: {
    position: "absolute",
    left: 0,
  },
  headerTitle: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  hero: { paddingTop: SPACING.xs, paddingBottom: SPACING.sm },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    ...SHADOW_LG,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  title: {
    fontFamily: FONT_FAMILY.display,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 36,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 22,
    marginTop: SPACING.sm,
    maxWidth: 330,
  },
  searchWrap: {
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    paddingVertical: 0,
  },
  chips: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.text },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  chipTextActive: { color: COLORS.white },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  resultCount: { color: COLORS.textTertiary, fontSize: TYPOGRAPHY.small },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    ...SHADOW,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minHeight: 28,
    paddingVertical: SPACING.md,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.tide,
  },
  safetyDot: { backgroundColor: COLORS.primary },
  question: {
    flex: 1,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 21,
    fontWeight: "700",
  },
  answer: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 22,
    paddingLeft: 16,
    paddingBottom: SPACING.md,
    paddingRight: SPACING.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    marginTop: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    marginTop: SPACING.xs,
  },
  footerNote: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tideTint,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  pressed: { opacity: 0.85 },
  footerCopy: { flex: 1 },
  footerTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    marginTop: 2,
  },
  });
}
