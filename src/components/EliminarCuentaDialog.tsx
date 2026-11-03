import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Dialog } from "@/components/ui/dialog";
import { Button, buttonForeground } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { eliminarCuenta, mensajeDeError, type Role } from "@/lib/auth";
import { colors, fonts, radius } from "@/lib/theme";

// "Eliminar mi cuenta" (Mi perfil): says exactly what is deleted for each role, asks for the
// password and runs the eliminarCuenta Cloud Function (functions/src/cuenta.ts). No undo.

const SE_BORRA: Record<Role, string[]> = {
  profesor: [
    "Tus clases, con sus materiales y archivos",
    "Las entregas de tus alumnos en tus clases (audios, videos, fotos y PDF)",
    "Tus listas de alumnos, con su ruta, metas y repertorio",
    "Tus mensajes, tu biblioteca y tus avisos",
    "Tu foto, tu celular y tu cuenta",
  ],
  alumno: [
    "Tus entregas (audios, videos, fotos y PDF) con sus devoluciones",
    "Tu diario de práctica, tus récords, tu ruta, metas y repertorio",
    "Tus mensajes y tu asistencia",
    "Tu lugar en las listas de tus profesores",
    "Tu foto, tus avisos y tu cuenta",
  ],
};

const SE_CONSERVA: Record<Role, string> = {
  profesor:
    "Se conservan solo tus pagos y tu plan, como historial contable. Si vuelves a registrarte con el mismo documento, la prueba gratis no empieza de nuevo.",
  alumno:
    "Si vuelves a registrarte con el mismo documento, tu profesor tiene que agregarte otra vez.",
};

export function EliminarCuentaDialog({
  visible,
  onClose,
  rol,
}: {
  visible: boolean;
  onClose: () => void;
  rol: Role;
}) {
  const [password, setPassword] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    if (eliminando) return;
    setPassword("");
    setError(null);
    onClose();
  };

  const eliminar = async () => {
    if (password.length < 6) return setError("Escribe tu contraseña.");
    setError(null);
    setEliminando(true);
    try {
      // On success the session ends and the login opens: nothing else to do here.
      await eliminarCuenta(password);
    } catch (e) {
      // The function explains its own refusals (the admin account, a sign-in too old).
      const { code, message } = (e ?? {}) as { code?: string; message?: string };
      setError(
        code?.startsWith("functions/") &&
          code !== "functions/internal" &&
          code !== "functions/unavailable" &&
          code !== "functions/deadline-exceeded" &&
          message
          ? message
          : code?.startsWith("functions/")
            ? "No se pudo terminar de eliminar tu cuenta. Revisa tu conexión y vuelve a probar: se continúa desde donde quedó."
            : mensajeDeError(e),
      );
      setEliminando(false);
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={cerrar}
      title="Eliminar mi cuenta"
      description="Se borra para siempre todo lo tuyo en Pulso. No se puede deshacer."
    >
      <View style={styles.cuerpo}>
        <View style={styles.detalle}>
          {SE_BORRA[rol].map((linea) => (
            <View key={linea} style={styles.linea}>
              <View style={styles.punto} />
              <Text style={styles.lineaTexto}>{linea}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.nota}>{SE_CONSERVA[rol]}</Text>

        <View style={styles.campo}>
          <Label>Tu contraseña, para confirmar</Label>
          <PasswordInput
            accessibilityLabel="Contraseña"
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={eliminar}
            editable={!eliminando}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {eliminando ? (
          <Text style={styles.nota}>Eliminando tus datos y archivos… puede tardar un minuto.</Text>
        ) : null}

        <View style={styles.botones}>
          <Button variant="secondary" style={styles.boton} onPress={cerrar} disabled={eliminando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            style={styles.boton}
            onPress={eliminar}
            disabled={eliminando}
          >
            {eliminando ? (
              <ActivityIndicator size="small" color={buttonForeground("destructive")} />
            ) : null}
            {eliminando ? "Eliminando…" : "Eliminar para siempre"}
          </Button>
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  cuerpo: {
    gap: 14,
  },
  detalle: {
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  linea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.destructive,
  },
  lineaTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 19,
    color: colors.foreground,
  },
  nota: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
  campo: {
    gap: 6,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.destructive,
  },
  botones: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
  },
  boton: {
    flexGrow: 1,
    flexBasis: 140,
  },
});
