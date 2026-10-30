import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Outlet, useLocation } from "react-router";
import { CalendarDays, Home, LogOut, type LucideIcon } from "lucide-react";
import { Link } from "@/components/Link";
import { Button, buttonForeground } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { StageGlow } from "@/components/ui/stage-glow";
import { signOut, usePerfil } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";

type NavItem = { href: string; label: string; icon: LucideIcon };

const nav: Record<"profesor" | "alumno", NavItem[]> = {
  profesor: [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/planificacion", label: "Planificación", icon: CalendarDays },
  ],
  alumno: [{ href: "/", label: "Inicio", icon: Home }],
};

// Top bar + scrollable content for every signed-in screen.
export function AppShell() {
  const perfil = usePerfil();
  const { pathname } = useLocation();
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const items = nav[perfil.rol];

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <View style={[styles.container, styles.barInner]}>
          <Link href="/">
            <Pressable accessibilityLabel="Pulso, ir al inicio">
              <Logo size={compact ? 28 : 32} />
            </Pressable>
          </Link>
          {items.length > 1 ? (
            <View style={styles.nav}>
              {items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <Pressable style={[styles.navItem, active && styles.navItemActive]}>
                      <item.icon
                        size={16}
                        color={active ? colors.primary : colors.mutedForeground}
                      />
                      {compact ? null : (
                        <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                          {item.label}
                        </Text>
                      )}
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          ) : null}
          <View style={styles.account}>
            {compact ? null : (
              <View style={styles.who}>
                <Text numberOfLines={1} style={styles.name}>
                  {perfil.nombre}
                </Text>
                <Text style={styles.role}>{perfil.rol === "profesor" ? "Profesor" : "Alumno"}</Text>
              </View>
            )}
            <Button
              variant="secondary"
              size="sm"
              accessibilityLabel="Salir"
              onPress={() => signOut()}
            >
              <LogOut size={14} color={buttonForeground("secondary")} />
              Salir
            </Button>
          </View>
        </View>
      </View>
      <View style={styles.main}>
        <StageGlow />
        <ScrollView contentContainerStyle={[styles.container, styles.content]}>
          <Outlet />
        </ScrollView>
      </View>
    </View>
  );
}

export const shellStyles = StyleSheet.create({
  pageTitle: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: 0.8,
    color: colors.foreground,
  },
  pageSubtitle: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.mutedForeground,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "rgba(16, 12, 10, 0.9)",
  },
  container: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  barInner: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  nav: {
    flexDirection: "row",
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  navItemActive: {
    backgroundColor: "rgba(249, 161, 41, 0.12)",
  },
  navLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  navLabelActive: {
    color: colors.foreground,
  },
  account: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  who: {
    alignItems: "flex-end",
    maxWidth: 200,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  role: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  main: {
    flex: 1,
  },
  content: {
    paddingTop: 32,
    paddingBottom: 64,
    gap: 24,
  },
});
