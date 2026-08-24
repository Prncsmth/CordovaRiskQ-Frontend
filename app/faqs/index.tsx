import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";

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
  const router = useRouter();
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
          </Pressable>
          <Text style={styles.topBarTitle}>Help center</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="sparkles-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>
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
              onPress={() => setCategory(item)}
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
          <Text style={styles.sectionTitle}>Frequently asked</Text>
          <Text style={styles.resultCount}>{filteredFaqs.length} articles</Text>
        </View>

        <View style={styles.faqList}>
          {filteredFaqs.map((faq, index) => {
            const isOpen = openId === faq.id;
            return (
              <View
                key={faq.id}
                style={[styles.faqRow, index === 0 && styles.firstRow]}
              >
                <Pressable
                  onPress={() => setOpenId(isOpen ? null : faq.id)}
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
                {isOpen && <Text style={styles.answer}>{faq.answer}</Text>}
              </View>
            );
          })}
          {filteredFaqs.length === 0 && (
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
        </View>

        <View style={styles.footerNote}>
          <Ionicons name="headset-outline" size={20} color={COLORS.tide} />
          <View style={styles.footerCopy}>
            <Text style={styles.footerTitle}>Still need help?</Text>
            <Text style={styles.footerText}>
              Contact support from your Profile.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={COLORS.tide} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  topBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
  },
  topBarSpacer: { width: 38 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: 0,
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
  chips: { gap: SPACING.sm, paddingVertical: SPACING.lg },
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
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
  },
  resultCount: { color: COLORS.textTertiary, fontSize: TYPOGRAPHY.small },
  faqList: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    ...SHADOW,
  },
  faqRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  firstRow: { borderTopWidth: 0 },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minHeight: 28,
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
    paddingTop: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  emptyState: { alignItems: "center", paddingVertical: SPACING.xxl },
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
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.tideTint,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
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
