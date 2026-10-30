import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Navigate, Outlet, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { descartarCuentaIncompleta, fueSalidaVoluntaria, useSession, type Role } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";
import LoginPage from "@/routes/login";

function Cargando() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

// Private screens. Without a session the home ("/") is the login, so the site works at the bare
// domain; any other private page sends to the home and comes back after signing in.
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.status === "loading") return <Cargando />;
  if (session.status === "guest") {
    if (location.pathname === "/") return <LoginPage />;
    const state = fueSalidaVoluntaria() ? undefined : { from: location.pathname + location.search };
    return <Navigate to="/" replace state={state} />;
  }
  if (session.status === "incomplete") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Tu cuenta no terminó de crearse</Text>
        <Text style={styles.body}>Sal y vuelve a registrarte con tu número de documento.</Text>
        <Button style={styles.action} onPress={() => descartarCuentaIncompleta()}>
          Salir
        </Button>
      </View>
    );
  }
  // Just signed in from the login at "/": continue to the page that was being opened.
  const from = (location.state as { from?: string } | null)?.from;
  if (location.pathname === "/" && from && from !== "/") return <Navigate to={from} replace />;
  return <Outlet />;
}

// Screens for one role only (e.g. the profesor's planning).
export function RequireRole({ rol }: { rol: Role }) {
  const session = useSession();
  if (session.status !== "ready" || session.perfil.rol !== rol) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Old /login links (and their ?modal=…): the login now lives at the home.
export function LoginRedirect() {
  const location = useLocation();
  return (
    <Navigate to={{ pathname: "/", search: location.search }} replace state={location.state} />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.foreground,
    textAlign: "center",
  },
  body: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  action: {
    marginTop: 24,
  },
});
