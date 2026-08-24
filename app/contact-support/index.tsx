import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
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

const TOPICS = ["App issue", "Report help", "Account", "Other"] as const;

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("App issue");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [focusedField, setFocusedField] = useState<"subject" | "message" | null>(null);

  const sendEmail = () => {
    if (!message.trim()) {
      Alert.alert(
        "Add a message",
        "Tell us a little about what happened so we can help.",
      );
      return;
    }

    const email = `mailto:support@riskq.ph?subject=${encodeURIComponent(
      subject.trim() || `${topic} support request`,
    )}&body=${encodeURIComponent(message.trim())}`;
    void Linking.openURL(email);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} style={styles.backButton} />
          <Text style={styles.headerTitle}>Contact Support</Text>
        </View>

        <View style={styles.hero}>
          <LinearGradient
            colors={[COLORS.tide, COLORS.tide]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIcon}
          >
            <Ionicons name="chatbubbles-outline" size={24} color={COLORS.white} />
          </LinearGradient>
          <Text style={styles.eyebrow}>RISKQ CARE</Text>
          <Text style={styles.title}>We&rsquo;re here to help.</Text>
          <Text style={styles.subtitle}>
            Tell us what you need and our support team will get back to you as
            soon as possible.
          </Text>
        </View>

        <View style={styles.responseCard}>
          <View style={styles.responseIcon}>
            <Ionicons name="time-outline" size={19} color={COLORS.tide} />
          </View>
          <View style={styles.responseCopy}>
            <Text style={styles.responseTitle}>Typical response time</Text>
            <Text style={styles.responseText}>Within one business day</Text>
          </View>
          <View style={styles.statusDot} />
        </View>

        <Text style={styles.sectionTitle}>What can we help with?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicList}
        >
          {TOPICS.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTopic(item);
              }}
              style={[styles.topic, item === topic && styles.topicActive]}
            >
              <Text
                style={[
                  styles.topicText,
                  item === topic && styles.topicTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.formSection}>
          <Text style={styles.label}>
            Subject <Text style={styles.optional}>Optional</Text>
          </Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Give your request a title"
            placeholderTextColor={COLORS.textTertiary}
            style={[styles.input, focusedField === "subject" && styles.inputFocused]}
            maxLength={80}
            onFocus={() => setFocusedField("subject")}
            onBlur={() => setFocusedField(null)}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe what happened..."
            placeholderTextColor={COLORS.textTertiary}
            style={[
              styles.input,
              styles.messageInput,
              focusedField === "message" && styles.inputFocused,
            ]}
            multiline
            textAlignVertical="top"
            maxLength={600}
            onFocus={() => setFocusedField("message")}
            onBlur={() => setFocusedField(null)}
          />
          <Text style={styles.characterCount}>{message.length}/600</Text>
        </View>

        <PrimaryButton title="SEND TO SUPPORT" onPress={sendEmail} />
        <Text style={styles.disclaimer}>
          For immediate danger, use SOS or call a local emergency hotline.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
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
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    ...SHADOW_LG,
  },
  eyebrow: {
    color: COLORS.tide,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
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
  },
  responseCard: {
    backgroundColor: COLORS.tideTint,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  responseIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  responseCopy: { flex: 1 },
  responseTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "800",
  },
  responseText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: SPACING.xs,
  },
  topicList: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  topic: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  topicActive: { backgroundColor: COLORS.text },
  topicText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  topicTextActive: { color: COLORS.white },
  formSection: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    ...SHADOW,
  },
  label: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "800",
    marginBottom: SPACING.xs,
  },
  optional: { color: COLORS.textTertiary, fontWeight: "500" },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.inputBg,
  },
  inputFocused: { borderColor: COLORS.primary },
  messageInput: { minHeight: 128, paddingTop: SPACING.md },
  characterCount: {
    color: COLORS.textTertiary,
    fontSize: 11,
    textAlign: "right",
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },
  disclaimer: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 18,
    textAlign: "center",
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  });
}
