import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Music } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { GradientText } from "@/components/ui/gradient-text";
import { Logo } from "@/components/ui/logo";
import { StageGlow } from "@/components/ui/stage-glow";
import { instruments } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

// Shared shell for the login and sign-up screens: instruments aside + form column.
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const lg = width >= 1024;

  return (
    <View style={[styles.screen, lg && styles.row]}>
      {lg ? (
        <View style={styles.aside}>
          <StageGlow />
          <View style={styles.asideContent}>
            <Logo size={40} />
            <View>
              <View style={styles.asideTitle}>
                <Text style={styles.asideHeading}>Cada sesión cuenta.</Text>
                <GradientText style={styles.asideHeading}>Vuelve a tu instrumento.</GradientText>
              </View>
              <Text style={styles.asideLead}>
                Lecciones guiadas y práctica diaria para aprender a tu ritmo, empieces desde cero o
                ya toques.
              </Text>
              <View style={styles.instruments}>
                {instruments.slice(0, 4).map((instrument) => (
                  <Chip key={instrument.id} label={instrument.name} icon={instrument.icon} />
                ))}
                <Chip label="Y más" icon={Music} />
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.formSide}>
        <StageGlow />
        <ScrollView contentContainerStyle={styles.formScroll}>
          <View style={styles.formWrap}>
            {lg ? null : <Logo size={36} />}
            <Text style={styles.heading}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// Form styles shared by the screens rendered inside AuthLayout.
export const authStyles = StyleSheet.create({
  form: {
    marginTop: 32,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.primary,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  footer: {
    marginTop: 24,
    fontFamily: fonts.sans,
    fontSize: 14,
    textAlign: "center",
    color: colors.mutedForeground,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: "row",
  },
  aside: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  asideContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: 48,
  },
  asideTitle: {
    maxWidth: 448,
  },
  asideHeading: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 50,
    letterSpacing: 1,
    color: colors.foreground,
  },
  asideLead: {
    marginTop: 16,
    maxWidth: 448,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.mutedForeground,
  },
  instruments: {
    marginTop: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  formSide: {
    flex: 1,
  },
  formScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  formWrap: {
    width: "100%",
    maxWidth: 384,
  },
  heading: {
    marginTop: 24,
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: 0.7,
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
