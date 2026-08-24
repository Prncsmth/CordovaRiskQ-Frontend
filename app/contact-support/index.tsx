import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";

const TOPICS = ["App issue", "Report help", "Account", "Other"] as const;

export default function ContactSupportScreen() {
  const router = useRouter();
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>("App issue");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
            <Text style={styles.topBarTitle}>Contact support</Text>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={24}
                color={COLORS.white}
              />
            </View>
            <Text style={styles.eyebrow}>RISKQ CARE</Text>
            <Text style={styles.title}>We’re here to help.</Text>
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
                onPress={() => setTopic(item)}
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
              style={styles.input}
              maxLength={80}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Describe what happened..."
              placeholderTextColor={COLORS.textTertiary}
              style={[styles.input, styles.messageInput]}
              multiline
              textAlignVertical="top"
              maxLength={600}
            />
            <Text style={styles.characterCount}>{message.length}/600</Text>
          </View>

          <Pressable
            onPress={sendEmail}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons
              name="paper-plane-outline"
              size={19}
              color={COLORS.white}
            />
            <Text style={styles.sendText}>Send to support</Text>
          </Pressable>
          <Text style={styles.disclaimer}>
            For immediate danger, use SOS or call a local emergency hotline.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
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
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: COLORS.tide,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    ...SHADOW,
  },
  eyebrow: {
    color: COLORS.tide,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: SPACING.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 36,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  responseCard: {
    backgroundColor: COLORS.tideTint,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
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
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
  },
  topicList: { gap: SPACING.sm, paddingVertical: SPACING.md },
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
    padding: SPACING.md,
    marginTop: SPACING.sm,
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.inputBg,
  },
  messageInput: { minHeight: 128, paddingTop: SPACING.md },
  characterCount: {
    color: COLORS.textTertiary,
    fontSize: 11,
    textAlign: "right",
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sendButton: {
    height: 54,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    ...SHADOW,
  },
  buttonPressed: { opacity: 0.82 },
  sendText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
  },
  disclaimer: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 18,
    textAlign: "center",
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
});
