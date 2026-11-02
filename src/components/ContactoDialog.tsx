import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { MessageCircle } from "lucide-react";
import { authStyles } from "@/components/AuthLayout";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MOTIVOS,
  WHATSAPP_CONTACTO,
  enlaceContacto,
  type MensajeContacto,
  type Motivo,
} from "@/lib/contacto";
import { documentoValido, normalizarDocumento } from "@/lib/documento";
import { formatearTelefono } from "@/lib/telefono";
import { colors, fonts } from "@/lib/theme";

type Inicial = Partial<Pick<MensajeContacto, "nombre" | "documento">> & {
  rol: MensajeContacto["rol"];
};

const numero = formatearTelefono(`+${WHATSAPP_CONTACTO}`);

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
      description="Escríbenos tu consulta: se abre WhatsApp con el mensaje listo para enviar."
    >
      {/* Inside the dialog so the form starts fresh every time it opens. */}
      {visible ? <ContactoForm inicial={inicial} onClose={onClose} /> : null}
    </Dialog>
  );
}

function ContactoForm({ inicial, onClose }: { inicial: Inicial; onClose: () => void }) {
  const conCuenta = inicial.rol !== "sin cuenta";
  const [nombre, setNombre] = useState(inicial.nombre ?? "");
  const [documento, setDocumento] = useState(inicial.documento ?? "");
  const [motivo, setMotivo] = useState<Motivo>("consulta");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);

  const abrir = () => {
    const nro = normalizarDocumento(documento);
    if (nombre.trim().length < 2) return setError("Escribe tu nombre.");
    if (documento.trim() && !documentoValido(nro))
      return setError("El número de documento lleva solo números.");
    if (mensaje.trim().length < 10) return setError("Cuéntanos tu consulta (al menos 10 letras).");
    setError(null);
    void Linking.openURL(
      enlaceContacto({ nombre, documento: nro, rol: inicial.rol, motivo, mensaje }),
    );
    setAbierto(true);
  };

  if (abierto)
    return (
      <View style={styles.form}>
        <View style={styles.abierto}>
          <MessageCircle size={20} color={colors.primary} />
          <Text style={styles.abiertoTexto}>
            ¡Gracias, {nombre.trim().split(" ")[0]}! Se abrió WhatsApp con tu mensaje: tócalo en
            Enviar para que nos llegue. Si no se abrió, escríbenos al {numero}.
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
      {error ? <Text style={authStyles.error}>{error}</Text> : null}
      <Button size="lg" onPress={abrir}>
        <MessageCircle size={16} color={buttonForeground()} />
        Enviar por WhatsApp
      </Button>
      <Text style={styles.privacidad}>
        Te respondemos por WhatsApp desde el {numero}. Tus datos (nombre, documento y consulta) se
        usan solo para responderte; no se guardan en Pulso.
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
  abierto: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  abiertoTexto: {
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
