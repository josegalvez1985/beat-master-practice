import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react";
import { colors, fonts, radius } from "@/lib/theme";

// Friendly placeholder for empty lists: icon, title, hint and an optional action.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <Icon size={22} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.secondary,
  },
  title: {
    marginTop: 12,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
    textAlign: "center",
  },
  description: {
    marginTop: 4,
    maxWidth: 360,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  action: {
    marginTop: 16,
  },
});
