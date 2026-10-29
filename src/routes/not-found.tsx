import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Button } from "@/components/ui/button";
import { colors, fonts } from "@/lib/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.body}>
        {"The page you're looking for doesn't exist or has been moved."}
      </Text>
      <Link href="/" asChild>
        <Button style={styles.action}>Go home</Button>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  code: {
    fontFamily: fonts.display,
    fontSize: 72,
    color: colors.foreground,
  },
  title: {
    marginTop: 16,
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.5,
    color: colors.foreground,
  },
  body: {
    marginTop: 8,
    maxWidth: 448,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  action: {
    marginTop: 24,
  },
});
