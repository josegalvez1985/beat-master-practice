import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSearchParams } from "react-router";
import { AuthLayout, authStyles } from "@/components/AuthLayout";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";
import { Link } from "@/components/Link";
import { PageMeta } from "@/components/PageMeta";
import { PrimerosPasosDialog } from "@/components/PrimerosPasosDialog";
import { RegisterDialog } from "@/components/RegisterDialog";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { mensajeDeError, signIn } from "@/lib/auth";
import { documentoValido, normalizarDocumento } from "@/lib/documento";

// The open modal lives in the URL (?modal=registro|recuperar|primeros-pasos),
// so it can be opened in a new tab.
const titles: Record<string, string> = {
  registro: "Crear cuenta — Pulso",
  recuperar: "Recuperar contraseña — Pulso",
  "primeros-pasos": "Primeros pasos — Pulso",
};

export default function LoginPage() {
  const [params, setParams] = useSearchParams();
  const modal = params.get("modal");
  const closeModal = () => setParams({}, { replace: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ documento: "", password: "" });

  const onSubmit = async () => {
    const nroDocumento = normalizarDocumento(form.documento);
    if (!documentoValido(nroDocumento) || form.password.length < 6) {
      setError("Escribe tu número de documento y tu contraseña (al menos 6 caracteres).");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // RequireAuth shows the home (or the page being opened) once the session is ready.
      await signIn(nroDocumento, form.password);
    } catch (e) {
      setError(mensajeDeError(e));
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title={(modal && titles[modal]) || "Pulso — Clases de música en Paraguay · Iniciar sesión"}
        description="Profesores y alumnos de música en Paraguay: clases planificadas, materiales, prácticas en audio o video y progreso. Guitarra, arpa paraguaya, piano, batería y más."
      />
      <AuthLayout title="Iniciar sesión" subtitle="Entra con tu número de documento.">
        <View style={authStyles.form}>
          <View style={authStyles.field}>
            <Label>Nro. de documento</Label>
            <Input
              accessibilityLabel="Número de documento"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Ej. 4567890"
              value={form.documento}
              onChangeText={(documento) => setForm({ ...form, documento })}
            />
          </View>

          <View style={authStyles.field}>
            <Label>Contraseña</Label>
            <PasswordInput
              accessibilityLabel="Contraseña"
              autoComplete="current-password"
              returnKeyType="go"
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              onSubmitEditing={onSubmit}
            />
          </View>

          <View style={styles.optionsRow}>
            <Link href="/?modal=recuperar">
              <Text style={authStyles.link}>¿Olvidaste tu contraseña?</Text>
            </Link>
          </View>

          {error ? <Text style={authStyles.error}>{error}</Text> : null}

          <Button size="lg" disabled={loading} onPress={onSubmit}>
            {loading ? <ActivityIndicator size="small" color={buttonForeground()} /> : null}
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </View>

        <Text style={authStyles.footer}>
          ¿Primera vez aquí?{" "}
          <Link href="/?modal=registro">
            <Text style={authStyles.link}>Crea tu cuenta</Text>
          </Link>
        </Text>
        <Text style={styles.help}>
          <Link href="/?modal=primeros-pasos">
            <Text style={authStyles.link}>¿Cómo empiezo? Mira los primeros pasos</Text>
          </Link>
        </Text>
      </AuthLayout>

      <PrimerosPasosDialog
        visible={modal === "primeros-pasos"}
        onClose={closeModal}
        onRegistrarse={() => setParams({ modal: "registro" }, { replace: true })}
      />

      <RegisterDialog visible={modal === "registro"} onClose={closeModal} />
      <ForgotPasswordDialog
        visible={modal === "recuperar"}
        onClose={closeModal}
        initialDocumento={form.documento}
      />
    </>
  );
}

const styles = StyleSheet.create({
  help: {
    marginTop: 12,
    textAlign: "center",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});
