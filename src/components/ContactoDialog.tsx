import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MailCheck, Send } from "lucide-react";
import { authStyles } from "@/components/AuthLayout";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MOTIVOS,
  correoValido,
  enviarContacto,
  type MensajeContacto,
  type Motivo,
} from "@/lib/contacto";
import { documentoValido, normalizarDocumento } from "@/lib/documento";
import { colors, fonts } from "@/lib/theme";

type Inicial = Partial<Pick<MensajeContacto, "nombre" | "correo" | "documento">> & {
  rol: MensajeContacto["rol"];
};

// Contact form (login and profile). With a session the person's data comes filled in; from the
// login the document number is optional (whoever writes may not have an account yet).
export function ContactoDialog({
  visible,
  onClose,
  inicial,
}: {
  visible: boolean;
  onClose: () => void;
  inicial: Inicial;
}) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Contacto"
      description="Escríbenos tu consulta: te respondemos al correo que indiques."
    >
      {/* Inside the dialog so the form starts fresh every time it opens. */}
      {visible ? <ContactoForm inicial={inicial} onClose={onClose} /> : null}
    </Dialog>
  );
}

function ContactoForm({ inicial, onClose }: { inicial: Inicial; onClose: () => void }) {
  const conCuenta = inicial.rol !== "sin cuenta";
  const [nombre, setNombre] = useState(inicial.nombre ?? "");
  const [correo, setCorreo] = useState(inicial.correo ?? "");
  const [documento, setDocumento] = useState(inicial.documento ?? "");
  const [motivo, setMotivo] = useState<Motivo>("consulta");
  const [mensaje, setMensaje] = useState("");
  // Honeypot: people never see it; bots that fill every field do.
  const [trampa, setTrampa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    const nro = normalizarDocumento(documento);
    if (nombre.trim().length < 2) return setError("Escribe tu nombre.");
    if (!correoValido(correo)) return setError("Escribe un correo válido para poder responderte.");
    if (documento.trim() && !documentoValido(nro))
      return setError("El número de documento lleva solo números.");
    if (mensaje.trim().length < 10) return setError("Cuéntanos tu consulta (al menos 10 letras).");
    setError(null);
    if (trampa) return setEnviado(true);
    setEnviando(true);
    try {
      await enviarContacto({
        nombre,
        correo,
        documento: nro,
        rol: inicial.rol,
        motivo,
        mensaje,
      });
      setEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado)
    return (
      <View style={styles.form}>
        <View style={styles.enviado}>
          <MailCheck size={20} color={colors.primary} />
          <Text style={styles.enviadoTexto}>
            ¡Gracias, {nombre.trim().split(" ")[0]}! Recibimos tu mensaje y te responderemos a{" "}
            {correo.trim()}.
          </Text>
        </View>
        <Button size="lg" onPress={onClose}>
          Listo
        </Button>
      </View>
    );

  return (
    <View style={styles.form}>
      <View style={authStyles.field}>
        <Label>Motivo</Label>
        <Opciones chico opciones={MOTIVOS} valor={motivo} onChange={setMotivo} />
      </View>
      <View style={authStyles.field}>
        <Label>Nombre y apellido</Label>
        <Input
          accessibilityLabel="Nombre y apellido"
          autoComplete="name"
          value={nombre}
          onChangeText={setNombre}
          maxLength={80}
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
          value={correo}
          onChangeText={setCorreo}
          maxLength={120}
        />
      </View>
      <View style={authStyles.field}>
        <Label>{conCuenta ? "Nro. de documento" : "Nro. de documento (si tienes cuenta)"}</Label>
        <Input
          accessibilityLabel="Número de documento"
          inputMode="numeric"
          placeholder="Ej. 4567890"
          value={documento}
          onChangeText={setDocumento}
          maxLength={15}
        />
      </View>
      <View style={authStyles.field}>
        <Label>Tu consulta</Label>
        <Input
          accessibilityLabel="Tu consulta"
          multiline
          numberOfLines={5}
          placeholder="Cuéntanos en qué te ayudamos"
          value={mensaje}
          onChangeText={setMensaje}
          maxLength={2000}
          style={styles.textarea}
        />
      </View>
      <input
        type="text"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={trampa}
        onChange={(e) => setTrampa(e.target.value)}
        style={{ display: "none" }}
      />
      {error ? <Text style={authStyles.error}>{error}</Text> : null}
      <Button size="lg" disabled={enviando} onPress={enviar}>
        <Send size={16} color={buttonForeground()} />
        {enviando ? "Enviando…" : "Enviar"}
      </Button>
      <Text style={styles.privacidad}>
        Tus datos (nombre, correo, documento y consulta) se usan solo para responderte. El mensaje
        se envía por correo a través de Web3Forms; no se guarda en Pulso.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 20,
    gap: 16,
  },
  textarea: {
    height: 120,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  enviado: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  enviadoTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.foreground,
  },
  privacidad: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
});
