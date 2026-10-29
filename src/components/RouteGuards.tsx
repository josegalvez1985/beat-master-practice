import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Navigate, Outlet, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { signOut, useSession, type Role } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";

function Cargando() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

// Private screens: without a session, go to the login and come back afterwards.
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.status === "loading") return <Cargando />;
  if (session.status === "guest") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (session.status === "incomplete") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Tu cuenta no terminó de crearse</Text>
        <Text style={styles.body}>Sal y vuelve a registrarte con tu número de documento.</Text>
        <Button style={styles.action} onPress={() => signOut()}>
          Salir
        </Button>
      </View>
    );
  }
  return <Outlet />;
}

// Screens for one role only (e.g. the profesor's planning).
export function RequireRole({ rol }: { rol: Role }) {
  const session = useSession();
  if (session.status !== "ready" || session.perfil.rol !== rol) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Login: once there is a session, continue to where the user was going.
export function GuestOnly() {
  const session = useSession();
  const location = useLocation();

  if (session.status === "loading") return <Cargando />;
  if (session.status === "ready") {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }
  return <Outlet />;
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
    fontFamily: fonts.display,
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
