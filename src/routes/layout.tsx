import { StyleSheet, Text, View } from "react-native";
import { Outlet, useRouteError } from "react-router";
import { Link } from "@/components/Link";
import { Button } from "@/components/ui/button";
import { Avisos } from "@/components/ui/toast";
import { colors, fonts } from "@/lib/theme";

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);

  return (
    <View style={styles.center}>
      <Text style={styles.title}>No se pudo cargar esta página</Text>
      <Text style={styles.body}>Algo salió mal. Intenta de nuevo o vuelve al inicio.</Text>
      <View style={styles.actions}>
        <Button onPress={() => window.location.reload()}>Reintentar</Button>
        <Link href="/">
          <Button variant="outline">Ir al inicio</Button>
        </Link>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <View style={styles.screen}>
      <Outlet />
      <Avisos />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    maxWidth: 448,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  actions: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
});
