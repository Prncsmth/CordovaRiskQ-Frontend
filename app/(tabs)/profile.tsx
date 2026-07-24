import PrimaryButton from "@/components/auth/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { COLORS, SPACING } from "@/theme";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name ?? "User"}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <PrimaryButton title="Log Out" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  email: {
    color: COLORS.gray,
    marginBottom: SPACING.lg,
  },
});
