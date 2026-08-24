import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getHotlines,
  getMyContacts,
  type Contact,
  type Hotline,
} from "@/services/contacts.service";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";

export default function ContactsScreen() {
  const router = useRouter();
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHotlines(), getMyContacts()]).then(
      ([loadedHotlines, loadedContacts]) => {
        setHotlines(loadedHotlines);
        setContacts(loadedContacts);
        setIsLoading(false);
      },
    );
  }, []);

  const callNumber = (number: string) => {
    void Linking.openURL(`tel:${number.replace(/[^+\d]/g, "")}`);
  };

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
          <Text style={styles.topBarTitle}>Emergency contacts</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="call" size={24} color={COLORS.white} />
          </View>
          <Text style={styles.eyebrow}>CORDOVA RESPONSE NETWORK</Text>
          <Text style={styles.title}>Help is closer than you think.</Text>
          <Text style={styles.subtitle}>
            Reach the right team quickly. Tap any number to call.
          </Text>
        </View>

        <Pressable
          style={styles.sosBanner}
          onPress={() => router.push("/(tabs)/home")}
        >
          <View style={styles.sosIcon}>
            <Ionicons name="warning" size={20} color={COLORS.white} />
          </View>
          <View style={styles.sosCopy}>
            <Text style={styles.sosTitle}>Immediate danger?</Text>
            <Text style={styles.sosText}>
              Use SOS to share your location with responders.
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
        </Pressable>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Local hotlines</Text>
          <View style={styles.available}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>Available</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.list}>
            {hotlines.map((hotline, index) => (
              <Pressable
                key={hotline.id}
                style={[styles.contactRow, index === 0 && styles.firstRow]}
                onPress={() => callNumber(hotline.number)}
              >
                <View style={styles.contactIcon}>
                  <Ionicons
                    name={
                      hotline.id === "bfp" ? "flame-outline" : "call-outline"
                    }
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.contactCopy}>
                  <Text style={styles.contactName}>{hotline.name}</Text>
                  <Text style={styles.contactNumber}>{hotline.number}</Text>
                </View>
                <View style={styles.callButton}>
                  <Ionicons name="call" size={16} color={COLORS.white} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>My trusted contacts</Text>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.tide}
          />
        </View>
        <View style={styles.list}>
          {contacts.map((contact, index) => (
            <Pressable
              key={contact.id}
              style={[styles.contactRow, index === 0 && styles.firstRow]}
              onPress={() => callNumber(contact.number)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
              </View>
              <View style={styles.contactCopy}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
              </View>
              <View style={styles.callButton}>
                <Ionicons name="call" size={16} color={COLORS.white} />
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={styles.disclaimer}>
          Keep your trusted contacts updated so someone you know can be reached
          when it matters.
        </Text>
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
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    ...SHADOW,
  },
  eyebrow: {
    color: COLORS.primary,
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
  sosBanner: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  sosIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sosCopy: { flex: 1 },
  sosTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
  },
  sosText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
  },
  available: { flexDirection: "row", alignItems: "center", gap: 5 },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  availableText: {
    color: COLORS.success,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  list: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    ...SHADOW,
  },
  contactRow: {
    minHeight: 76,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  firstRow: { borderTopWidth: 0 },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.tideTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.tide,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "800",
  },
  contactCopy: { flex: 1 },
  contactName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
  },
  contactNumber: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    marginTop: 3,
  },
  callButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: { height: 160, alignItems: "center", justifyContent: "center" },
  disclaimer: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: SPACING.md,
  },
});
