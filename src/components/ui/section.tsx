import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts, radius, shared } from "@/lib/theme";

// Card with a title row (and optional actions on the right).
export function Section({
  title,
  subtitle,
  actions,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[shared.panel, styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actions}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

// Small rounded label, e.g. an instrument or a status.
export function Badge({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "muted" | "primary" | "success";
}) {
  return (
    <View style={[styles.badge, badgeTones[tone]]}>
      <Text style={[styles.badgeLabel, tone === "muted" ? null : { color: badgeColors[tone] }]}>
        {label}
      </Text>
    </View>
  );
}

const badgeColors = { primary: colors.primary, success: colors.success } as const;

const badgeTones = StyleSheet.create({
  muted: { backgroundColor: colors.secondary },
  primary: { backgroundColor: "rgba(249, 161, 41, 0.14)" },
  success: { backgroundColor: "rgba(95, 211, 141, 0.14)" },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius["2xl"],
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  titles: {
    flexShrink: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 28,
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  body: {
    marginTop: 16,
    gap: 12,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.secondaryForeground,
  },
});
