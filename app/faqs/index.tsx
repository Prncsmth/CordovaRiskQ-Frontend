import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import FaqRow, { type Faq } from "@/components/faqs/FaqRow";
import FaqFirstTimeGuide from "@/components/tour/FaqFirstTimeGuide";
import { useAuth } from "@/context/AuthContext";
import * as authStorage from "@/context/authStorage";
import type { Measurable } from "@/context/TourContext";
import {
    FONT_FAMILY,
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

// Answers describe the app as it works today -- keep them in step when a
// flow changes (e.g. how a report location is picked).
const FAQS: Faq[] = [
  {
    id: "sos",
    category: "Safety",
    question: "When should I use SOS?",
    answer:
      "Use SOS only for an immediate emergency. Slide the SOS button on Home and confirm -- responders get your live location right away. Keep your phone with you so they can reach you.",
  },
  {
    id: "responder",
    category: "Safety",
    question: "How do I know a responder is coming?",
    answer:
      "Once a responder accepts, tap Track Responder (on the SOS screen, or on your report in Report History). You'll see them on the map, their estimated arrival time, and a Call button.",
  },
  {
    id: "evacuation",
    category: "Safety",
    question: "How do I find the nearest evacuation center?",
    answer:
      "Your nearest center is shown on Home. For all centers, open the Map tab and tap a pin to see its details, status, and directions.",
  },
  {
    id: "marker",
    category: "Safety",
    question: "What do the map pins mean?",
    answer:
      "Green pins are open evacuation centers, red pins are full ones, and the blue dot is you. Tap a pin for its details.",
  },
  {
    id: "report",
    category: "Reports",
    question: "How do I report an incident?",
    answer:
      "Open Report, choose the incident type, check the pinned location, add details (and a photo if you can), then tap Submit Report.",
  },
  {
    id: "pin",
    category: "Reports",
    question: "How do I change the report location?",
    answer:
      "Your current location is used by default. To use a different spot, tap the Pinned Location card on the Report screen, then tap the place on the map. Reports must be inside Cordova.",
  },
  {
    id: "history",
    category: "Reports",
    question: "Where can I check my report status?",
    answer:
      "Open Report History from the bottom navigation. Each report shows its current status, from Pending Review to Resolved.",
  },
  {
    id: "privacy",
    category: "Reports",
    question: "Who can see my report?",
    answer:
      "Only authorized response teams, so they can assess the situation and coordinate help.",
  },
  {
    id: "phone",
    category: "Account",
    question: "Why do I need a phone number?",
    answer:
      "It lets responders contact you when they need more details or are on their way to help.",
  },
  {
    id: "notifications",
    category: "Account",
    question: "How do I manage notifications?",
    answer: "Open Profile, then Settings, and turn Push Notifications on or off.",
  },
  {
    id: "profile",
    category: "Account",
    question: "How do I update my profile?",
    answer: "Open Profile, then User Profile, to update your name and phone number.",
  },
  {
    id: "offline",
    category: "Account",
    question: "What if I have no internet connection?",
    answer:
      "SOS and reports need a connection to reach responders. If you're in danger and can't connect, call an emergency hotline directly -- calls work without mobile data.",
  },
];

const CATEGORIES = ["Safety", "Reports", "Account"] as const;

const FAQ_GUIDE_SEEN_KEY = "faq_guide_seen_users";

export default function FaqsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Faq["category"]>("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showFaqGuide, setShowFaqGuide] = useState(false);
  const searchTargetRef = useRef<View>(null);
  const categoryTargetRef = useRef<View>(null);
  const questionTargetRef = useRef<View>(null);

  useEffect(() => {
    if (!user?.id) return;
    authStorage
      .getItem(FAQ_GUIDE_SEEN_KEY)
      .then((raw) => {
        const seenUsers = raw ? JSON.parse(raw) : {};
        setShowFaqGuide(!seenUsers[user.id]);
      })
      .catch(() => setShowFaqGuide(true));
  }, [user?.id]);

  const finishFaqGuide = () => {
    if (user?.id) {
      authStorage
        .getItem(FAQ_GUIDE_SEEN_KEY)
        .then((raw) => {
          const seenUsers = raw ? JSON.parse(raw) : {};
          return authStorage.setItem(
            FAQ_GUIDE_SEEN_KEY,
            JSON.stringify({ ...seenUsers, [user.id]: true }),
          );
        })
        .catch(() => {});
    }
    setShowFaqGuide(false);
  };

  const normalizedQuery = query.trim().toLowerCase();
  const filteredFaqs = useMemo(
    () =>
      FAQS.filter((faq) => {
        const matchesCategory = category === "All" || faq.category === category;
        const matchesQuery =
          !normalizedQuery ||
          `${faq.question} ${faq.answer}`.toLowerCase().includes(normalizedQuery);
        return matchesCategory && matchesQuery;
      }),
    [category, normalizedQuery],
  );

  // Browsing everything: grouped under a heading per topic. Searching or
  // filtering: one flat list of matches.
  const groups = useMemo(() => {
    if (category !== "All" || normalizedQuery) {
      return [{ title: null as string | null, faqs: filteredFaqs }];
    }
    return CATEGORIES.map((title) => ({
      title: title as string | null,
      faqs: filteredFaqs.filter((faq) => faq.category === title),
    })).filter((group) => group.faqs.length > 0);
  }, [category, normalizedQuery, filteredFaqs]);

  const toggle = (id: string) => setOpenId((current) => (current === id ? null : id));

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.sm, paddingBottom: insets.bottom + SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} style={styles.backButton} />
          <Text style={styles.headerTitle}>Help Center</Text>
        </View>

        <View>
          <Text style={styles.title}>How can we help?</Text>
          <Text style={styles.subtitle}>
            Answers about SOS, reports, and your account.
          </Text>
        </View>

        <View ref={searchTargetRef} collapsable={false} style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search questions"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search questions"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
            </Pressable>
          )}
        </View>

        <View ref={categoryTargetRef} collapsable={false}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {(["All", ...CATEGORIES] as const).map((item) => {
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(item);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {normalizedQuery ? (
          <Text style={styles.resultCount}>
            {filteredFaqs.length === 1 ? "1 result" : `${filteredFaqs.length} results`}
          </Text>
        ) : null}

        {filteredFaqs.length > 0 ? (
          groups.map((group, groupIndex) => (
            <View key={group.title ?? "results"} style={styles.group}>
              {group.title ? <Text style={styles.groupTitle}>{group.title}</Text> : null}
              <View
                ref={groupIndex === 0 ? questionTargetRef : undefined}
                collapsable={false}
                style={styles.card}
              >
                {group.faqs.map((faq, index) => (
                  <View
                    key={faq.id}
                    style={index < group.faqs.length - 1 ? styles.rowDivider : undefined}
                  >
                    <FaqRow faq={faq} isOpen={openId === faq.id} onToggle={() => toggle(faq.id)} />
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={26} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No matching questions</Text>
            <Text style={styles.emptyText}>Try a different word, or contact support below.</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.supportCard, pressed && styles.pressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/contact-support");
          }}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
        >
          <View style={styles.supportIcon}>
            <Ionicons name="headset-outline" size={20} color={COLORS.tide} />
          </View>
          <View style={styles.supportCopy}>
            <Text style={styles.supportTitle}>Still need help?</Text>
            <Text style={styles.supportText}>Send a message to our support team.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </Pressable>
      </ScrollView>
      {showFaqGuide ? (
        <FaqFirstTimeGuide
          targetRefs={[
            searchTargetRef as React.RefObject<Measurable | null>,
            categoryTargetRef as React.RefObject<Measurable | null>,
            questionTargetRef as React.RefObject<Measurable | null>,
          ]}
          onFinish={finishFaqGuide}
        />
      ) : null}
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
      minHeight: 40,
    },
    backButton: {
      position: "absolute",
      left: 0,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      color: COLORS.text,
      fontSize: TYPOGRAPHY.heading,
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption,
      marginTop: 4,
    },
    searchWrap: {
      height: 48,
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
    chips: { gap: SPACING.xs },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    chipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    chipText: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
    },
    chipTextActive: { color: COLORS.white },
    resultCount: {
      color: COLORS.textTertiary,
      fontSize: TYPOGRAPHY.small,
      marginBottom: -SPACING.xs,
    },
    group: { gap: 0 },
    groupTitle: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
      color: COLORS.textTertiary,
      marginTop: SPACING.xs,
    },
    // A plain list straight on the page, like the Contact Support form --
    // no card around it, just hairline dividers between questions.
    card: {},
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: SPACING.xl,
      paddingHorizontal: SPACING.lg,
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
      textAlign: "center",
    },
    // Plain row too, set off from the list by a divider above it.
    supportCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
      marginTop: SPACING.sm,
    },
    supportIcon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tideTint,
      alignItems: "center",
      justifyContent: "center",
    },
    supportCopy: { flex: 1 },
    supportTitle: {
      fontFamily: FONT_FAMILY.displaySemibold,
      color: COLORS.text,
      fontSize: TYPOGRAPHY.caption,
    },
    supportText: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.small,
      marginTop: 2,
    },
    pressed: { opacity: 0.85 },
  });
}
