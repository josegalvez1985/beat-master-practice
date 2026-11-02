import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { BookOpen, Camera, CreditCard, Mail, Plus, Trash2 } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { AvisosConfig } from "@/components/AvisosConfig";
import { ContactoDialog } from "@/components/ContactoDialog";
import { Link } from "@/components/Link";
import { ManualDialog } from "@/components/ManualDialog";
import { usePlanProfesor } from "@/components/PlanAviso";
import { PageMeta } from "@/components/PageMeta";
import { TemaSelector } from "@/components/TemaSelector";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonForeground } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { confirmar } from "@/components/ui/confirmar";
import { Section } from "@/components/ui/section";
import { avisar } from "@/components/ui/toast";
import { usePerfil, useSession } from "@/lib/auth";
import {
  agregarInstrumento,
  cambiarFoto,
  guardarTelefono,
  quitarFoto,
  useTelefono,
} from "@/lib/data";
import { formatearDocumento } from "@/lib/documento";
import { ACCEPT_FOTO, elegirArchivos } from "@/lib/files";
import { instrumento, instruments, type InstrumentId } from "@/lib/instruments";
import { formatoFechaPlan } from "@/lib/planes";
import { formatearTelefono, normalizarTelefono } from "@/lib/telefono";
import { colors, fonts, radius } from "@/lib/theme";

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
  const profesor = perfil.rol === "profesor";
  const [agregando, setAgregando] = useState<InstrumentId | null>(null);
  const [contacto, setContacto] = useState(false);
  const [manualAbierto, setManualAbierto] = useState(false);
  const faltan = instruments.filter((i) => !perfil.instrumentos.includes(i.id));

  const onAgregar = async (id: InstrumentId) => {
    const nombre = instrumento(id).name;
    const ok = await confirmar({
      titulo: `¿Agregar ${nombre}?`,
      mensaje: profesor
        ? `Se suma a los instrumentos que enseñas (después no se puede quitar). Con ${nombre} podrás:`
        : `Se suma a los instrumentos que estudias (después no se puede quitar). Con ${nombre} tendrás:`,
      detalle: profesor
        ? ["Armar tu lista de alumnos", "Planificar sus clases", "Sus herramientas de práctica"]
        : ["Sus herramientas de práctica", "Clases cuando un profesor te agregue a su lista"],
      aceptar: `Agregar ${nombre}`,
      icono: instrumento(id).icon,
    });
    if (!ok) return;
    setAgregando(id);
    try {
      await agregarInstrumento(perfil.uid, id);
      avisar({ texto: `Agregaste ${nombre}.` });
    } catch {
      avisar({ texto: "No se pudo agregar el instrumento. Vuelve a probar.", tipo: "error" });
    } finally {
      setAgregando(null);
    }
  };

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
        <Dato label="Rol" value={profesor ? "Profesor" : "Alumno"} />
        {profesor ? <Celular uid={perfil.uid} /> : null}
      </Section>

      <Section
        title={profesor ? "Instrumentos que enseñas" : "Instrumentos que estudias"}
        subtitle={
          profesor
            ? "Con cada instrumento puedes armar listas de alumnos y clases."
            : "Cada instrumento suma sus herramientas de práctica. Tu profesor te agrega a su lista por instrumento."
        }
      >
        <View style={styles.chips}>
          {perfil.instrumentos.map((id) => {
            const item = instrumento(id);
            return <Chip key={id} label={item.name} icon={item.icon} />;
          })}
        </View>
        {faltan.length ? (
          <>
            <Text style={styles.datoLabel}>
              {profesor ? "Enseñar también:" : "Aprender también:"}
            </Text>
            <View style={styles.chips}>
              {faltan.map((item) => (
                <Button
                  key={item.id}
                  variant="secondary"
                  size="sm"
                  disabled={agregando !== null}
                  accessibilityLabel={`Agregar ${item.name}`}
                  onPress={() => onAgregar(item.id)}
                >
                  <Plus size={14} color={buttonForeground("secondary")} />
                  {agregando === item.id ? "Agregando…" : item.name}
                </Button>
              ))}
            </View>
          </>
        ) : null}
      </Section>

      <Section title="Avisos">
        <AvisosConfig perfil={perfil} />
      </Section>

      <Section title="Apariencia" subtitle="Sistema usa el modo claro u oscuro de tu dispositivo.">
        <TemaSelector conTexto />
      </Section>

      {profesor ? <TuPlan uid={perfil.uid} /> : null}

      <Section
        title="Manual de uso"
        subtitle={
          profesor
            ? "Cómo agregar alumnos, planificar y armar clases, revisar entregas y seguir el avance."
            : "Cómo practicar tus clases, grabarte y entregar, ver tu avance y usar las herramientas."
        }
      >
        <Button variant="secondary" style={styles.contacto} onPress={() => setManualAbierto(true)}>
          <BookOpen size={16} color={buttonForeground("secondary")} />
          Abrir el manual
        </Button>
      </Section>

      <Section
        title="Ayuda y contacto"
        subtitle="¿Una duda, un problema o una idea? Escríbenos y te respondemos por correo."
      >
        <Button variant="secondary" style={styles.contacto} onPress={() => setContacto(true)}>
          <Mail size={16} color={buttonForeground("secondary")} />
          Escribir a Pulso
        </Button>
      </Section>

      <ManualDialog
        visible={manualAbierto}
        onClose={() => setManualAbierto(false)}
        rol={perfil.rol}
      />

      <ContactoDialog
        visible={contacto}
        onClose={() => setContacto(false)}
        inicial={{
          rol: perfil.rol,
          nombre: perfil.nombre,
          correo: email ?? "",
          documento: perfil.nro_documento,
        }}
      />
    </>
  );
}

// The profesor's mobile (telefonos/{uid}): only they and the admin see it. Profesores from before
// the phones get a prompt to add it.
function Celular({ uid }: { uid: string }) {
  const telefono = useTelefono(uid);
  const actual = telefono.data?.telefono ?? null;
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  if (telefono.loading) return null;

  const guardar = async () => {
    const normalizado = normalizarTelefono(texto);
    if (!normalizado) return setError("Escribe un celular de Paraguay, por ejemplo 0981 123 456.");
    setError(null);
    setGuardando(true);
    try {
      await guardarTelefono(uid, normalizado);
      avisar({ texto: actual ? "Celular actualizado." : "Celular guardado." });
      setEditando(false);
    } catch {
      setError("No se pudo guardar. Revisa tu conexión y vuelve a probar.");
    } finally {
      setGuardando(false);
    }
  };

  if (!editando && actual)
    return (
      <View style={styles.dato}>
        <Text style={styles.datoLabel}>Celular (solo lo ve el equipo de Pulso)</Text>
        <View style={styles.celularFila}>
          <Text style={[styles.datoValue, styles.flex]}>{formatearTelefono(actual)}</Text>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              setTexto(formatearTelefono(actual));
              setEditando(true);
            }}
          >
            Cambiar
          </Button>
        </View>
      </View>
    );

  return (
    <View style={[styles.dato, !actual && styles.celularFalta]}>
      <Text style={styles.datoLabel}>
        {actual
          ? "Celular"
          : "Agrega tu celular: lo usamos para avisarte sobre tu plan (solo lo ve el equipo de Pulso)."}
      </Text>
      <View style={styles.celularFila}>
        <View style={styles.flex}>
          <Input
            accessibilityLabel="Celular"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ej. 0981 123 456"
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={guardar}
          />
        </View>
        <Button disabled={guardando} onPress={guardar}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
        {actual ? (
          <Button variant="secondary" onPress={() => setEditando(false)}>
            Cancelar
          </Button>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function TuPlan({ uid }: { uid: string }) {
  const plan = usePlanProfesor(uid);
  const vence = plan.vence ? formatoFechaPlan(plan.vence) : null;
  const texto = plan.ilimitado
    ? "Todo habilitado (cuenta del administrador)."
    : plan.estado === "prueba"
      ? `Prueba gratis hasta el ${vence}.`
      : plan.estado === "activo"
        ? `${plan.nombre}, activo hasta el ${vence}.`
        : plan.estado === "gracia"
          ? `Venció el ${vence}: tienes unos días para pagar.`
          : "Vencido: no puedes crear clases, agregar alumnos ni subir archivos.";
  return (
    <Section title="Mi plan" subtitle={plan.loading ? undefined : texto}>
      <Link href="/plan">
        <Button variant="secondary" style={styles.contacto}>
          <CreditCard size={16} color={buttonForeground("secondary")} />
          Ver mi plan y cómo pagar
        </Button>
      </Link>
    </Section>
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
  flex: {
    flex: 1,
    minWidth: 160,
  },
  celularFila: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  celularFalta: {
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    backgroundColor: "rgba(249, 161, 41, 0.10)",
  },
  contacto: {
    alignSelf: "flex-start",
  },
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
