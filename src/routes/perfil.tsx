import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Camera, Trash2 } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { PageMeta } from "@/components/PageMeta";
import { TemaSelector } from "@/components/TemaSelector";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonForeground } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Section } from "@/components/ui/section";
import { avisar } from "@/components/ui/toast";
import { usePerfil, useSession } from "@/lib/auth";
import { cambiarFoto, quitarFoto } from "@/lib/data";
import { formatearDocumento } from "@/lib/documento";
import { ACCEPT_FOTO, elegirArchivos } from "@/lib/files";
import { instrumento } from "@/lib/instruments";
import { colors, fonts } from "@/lib/theme";

// Photos up to 15 MB are accepted: they are scaled down to 512 px before uploading.
const MAX_FOTO = 15 * 1024 * 1024;

export default function PerfilPage() {
  const perfil = usePerfil();
  const session = useSession();
  const email = session.status === "ready" ? session.user.email : null;
  const [ocupado, setOcupado] = useState<"subiendo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quitada, setQuitada] = useState(false);

  const onCambiar = async () => {
    const [file] = await elegirArchivos({ accept: ACCEPT_FOTO, multiple: false });
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Elige una imagen (JPG, PNG o WebP).");
    if (file.size > MAX_FOTO) return setError("La imagen es muy grande (máximo 15 MB).");
    setError(null);
    setOcupado("subiendo");
    try {
      await cambiarFoto(perfil, file);
      avisar({ texto: perfil.foto ? "Foto actualizada" : "Foto subida" });
    } catch {
      setError("No se pudo subir la foto. Vuelve a probar.");
    } finally {
      setOcupado(null);
    }
  };

  // Removing is undoable for a few seconds: the photo is only hidden until then, so closing the
  // page in the meantime keeps it (nothing is left half-deleted).
  const onQuitar = () => {
    setError(null);
    setQuitada(true);
    const timer = window.setTimeout(() => {
      quitarFoto(perfil).then(
        () => setQuitada(false),
        () => {
          setQuitada(false);
          avisar({ texto: "No se pudo quitar la foto. Vuelve a probar.", tipo: "error" });
        },
      );
    }, 6000);
    avisar({
      texto: "Foto quitada",
      duracion: 6000,
      accion: {
        label: "Deshacer",
        onPress: () => {
          window.clearTimeout(timer);
          setQuitada(false);
        },
      },
    });
  };
  const foto = quitada ? undefined : perfil.foto;

  return (
    <>
      <PageMeta
        title="Mi perfil — Pulso"
        description="Tu foto, tus datos y la apariencia de Pulso."
      />
      <View>
        <Text style={shellStyles.pageTitle}>Mi perfil</Text>
        <Text style={shellStyles.pageSubtitle}>Tu foto, tus datos y la apariencia de Pulso.</Text>
      </View>

      <Section
        title="Foto de perfil"
        subtitle={
          perfil.rol === "alumno"
            ? "La ven tus profesores al buscarte y en sus listas."
            : "Te identifica en Pulso."
        }
      >
        <View style={styles.photoRow}>
          <View>
            <Avatar nombre={perfil.nombre} foto={foto} size={96} />
            {ocupado ? (
              <View style={styles.photoBusy}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </View>
          <View style={styles.photoActions}>
            <Button disabled={!!ocupado} onPress={onCambiar}>
              <Camera size={16} color={buttonForeground()} />
              {ocupado === "subiendo" ? "Subiendo..." : foto ? "Cambiar foto" : "Subir foto"}
            </Button>
            {foto ? (
              <Button variant="secondary" disabled={!!ocupado} onPress={onQuitar}>
                <Trash2 size={16} color={buttonForeground("secondary")} />
                Quitar foto
              </Button>
            ) : null}
            <Text style={styles.hint}>JPG, PNG o WebP. Se recorta en cuadrado.</Text>
          </View>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Section>

      <Section title="Mis datos">
        <Dato label="Nombre" value={perfil.nombre} />
        <Dato label="Nro. de documento" value={formatearDocumento(perfil.nro_documento)} />
        {email ? <Dato label="Correo" value={email} /> : null}
        <Dato label="Rol" value={perfil.rol === "profesor" ? "Profesor" : "Alumno"} />
        <View style={styles.dato}>
          <Text style={styles.datoLabel}>
            {perfil.rol === "profesor" ? "Instrumentos que enseñas" : "Instrumentos que estudias"}
          </Text>
          <View style={styles.chips}>
            {perfil.instrumentos.map((id) => {
              const item = instrumento(id);
              return <Chip key={id} label={item.name} icon={item.icon} />;
            })}
          </View>
        </View>
      </Section>

      <Section title="Apariencia" subtitle="Sistema usa el modo claro u oscuro de tu dispositivo.">
        <TemaSelector conTexto />
      </Section>
    </>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoLabel}>{label}</Text>
      <Text style={styles.datoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 24,
  },
  photoBusy: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 48,
    backgroundColor: colors.backdrop,
  },
  photoActions: {
    gap: 10,
    alignItems: "flex-start",
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  error: {
    marginTop: 16,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.destructive,
  },
  dato: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  datoLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  datoValue: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.foreground,
  },
  chips: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
