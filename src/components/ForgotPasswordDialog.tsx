import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MailCheck } from "lucide-react";
import { authStyles } from "@/components/AuthLayout";
import { Button, buttonForeground } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeError, resetPassword } from "@/lib/auth";
import { documentoValido, normalizarDocumento } from "@/lib/documento";
import { colors, fonts } from "@/lib/theme";

export function ForgotPasswordDialog({
  visible,
  onClose,
  initialDocumento,
}: {
  visible: boolean;
  onClose: () => void;
  initialDocumento: string;
}) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Recuperar contraseña"
      description="Escribe tu número de documento y el correo de tu cuenta. Te enviaremos un enlace para crear una contraseña nueva."
    >
      <ForgotPasswordForm onClose={onClose} initialDocumento={initialDocumento} />
    </Dialog>
  );
}

// Lives inside the dialog so its state resets every time the dialog opens.
function ForgotPasswordForm({
  onClose,
  initialDocumento,
}: {
  onClose: () => void;
  initialDocumento: string;
}) {
  const [documento, setDocumento] = useState(initialDocumento);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const onSubmit = async () => {
    const nroDocumento = normalizarDocumento(documento);
    if (!documentoValido(nroDocumento)) {
      setError("Escribe tu número de documento (solo números).");
      return;
    }
    if (!email.includes("@")) {
      setError("Escribe el correo de tu cuenta.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(nroDocumento, email);
      setEnviado(true);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <View style={styles.form}>
        <View style={styles.sent}>
          <MailCheck size={20} color={colors.primary} />
          <Text style={styles.sentText}>
            Te enviamos un enlace a {email.trim()}. Ábrelo para crear tu contraseña nueva; si no lo
            ves, revisa la carpeta de spam.
          </Text>
        </View>
        <Button size="lg" onPress={onClose}>
          Volver a iniciar sesión
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <View style={authStyles.field}>
        <Label>Nro. de documento</Label>
        <Input
          accessibilityLabel="Número de documento"
          inputMode="numeric"
          placeholder="Ej. 4567890"
          value={documento}
          onChangeText={setDocumento}
        />
      </View>

      <View style={authStyles.field}>
        <Label>Correo</Label>
        <Input
          accessibilityLabel="Correo"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          placeholder="tu@correo.com"
          returnKeyType="send"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={onSubmit}
        />
      </View>

      {error ? <Text style={authStyles.error}>{error}</Text> : null}

      <Button size="lg" disabled={loading} onPress={onSubmit}>
        {loading ? <ActivityIndicator size="small" color={buttonForeground()} /> : null}
        {loading ? "Enviando..." : "Enviar enlace"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 24,
    gap: 20,
  },
  sent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  sentText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
});
