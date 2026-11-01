import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { NotebookPen, Trash2 } from "lucide-react";
import { Link } from "@/components/Link";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Stepper } from "@/components/ui/stepper";
import { avisar } from "@/components/ui/toast";
import type { Perfil } from "@/lib/auth";
import {
  anotarPractica,
  borrarDelDiario,
  guardarMetaSemanal,
  useDiarioAlumno,
  useDiarioDe,
  type EntradaDiario,
} from "@/lib/data";
import { formatoDia, hoy, inicioDeSemana, sumarDias } from "@/lib/dates";
import { instrumento as instrumentoDe, type InstrumentId } from "@/lib/instruments";
import { colors, fonts, radius, shared } from "@/lib/theme";

// Practice diary (Firestore `diario`) and weekly goal (`usuarios.metaSemanal`): the alumno writes
// them, their profesores of each instrument read them.

const DESHACER_MS = 6000;

export const minutosDeEstaSemana = (entradas: EntradaDiario[]) => {
  const desde = inicioDeSemana(hoy());
  return entradas.filter((e) => e.fecha >= desde).reduce((total, e) => total + e.minutos, 0);
};

function Meta({ minutos, meta }: { minutos: number; meta?: number }) {
  if (!meta) return <Text style={styles.muted}>{minutos} min esta semana · sin meta semanal</Text>;
  const faltan = Math.max(0, meta - minutos);
  return (
    <View style={styles.meta}>
      <View style={styles.metaTexto}>
        <Text style={styles.metaNumero}>
          {minutos}
          <Text style={styles.muted}> / {meta} min</Text>
        </Text>
        <Text style={[styles.muted, !faltan && styles.cumplida]}>
          {faltan ? `Faltan ${faltan} min esta semana` : "¡Meta de la semana cumplida!"}
        </Text>
      </View>
      <Progress value={(minutos / meta) * 100} />
    </View>
  );
}

// Home: this week against the goal, one tap from the full diary.
export function ResumenDiario({ perfil }: { perfil: Perfil }) {
  const diario = useDiarioAlumno(perfil.uid);
  return (
    <View style={[shared.panel, styles.card]}>
      <Text style={styles.label}>Diario de práctica</Text>
      {diario.loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Meta minutos={minutosDeEstaSemana(diario.data)} meta={perfil.metaSemanal} />
      )}
      <Link href="/herramientas?h=diario">
        <Button variant="secondary" size="sm">
          <NotebookPen size={14} color={buttonForeground("secondary")} />
          Anotar práctica
        </Button>
      </Link>
    </View>
  );
}

// The full diary: weekly goal, a quick entry and the latest entries (deletable with "Deshacer").
export function DiarioPractica({
  perfil,
  instrumentos,
  instrumentoInicial,
}: {
  perfil: Perfil;
  instrumentos: InstrumentId[];
  instrumentoInicial: InstrumentId;
}) {
  const diario = useDiarioAlumno(perfil.uid);
  const [instrumento, setInstrumento] = useState(instrumentoInicial);
  const [minutos, setMinutos] = useState(20);
  const [cuando, setCuando] = useState<"hoy" | "ayer">("hoy");
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [meta, setMeta] = useState(perfil.metaSemanal ?? 0);
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  // Deletes waiting for their "Deshacer" time; done right away if the screen closes.
  const pendientes = useRef(new Map<string, number>());

  useEffect(() => {
    const mapa = pendientes.current;
    return () => {
      mapa.forEach((timer, id) => {
        window.clearTimeout(timer);
        void borrarDelDiario(id);
      });
      mapa.clear();
    };
  }, []);

  // The goal saves a moment after the last change (one write, not one per tap).
  useEffect(() => {
    if (meta === (perfil.metaSemanal ?? 0)) return;
    const timer = window.setTimeout(() => {
      guardarMetaSemanal(perfil.uid, meta).catch(() =>
        avisar({ texto: "No se pudo guardar la meta.", tipo: "error" }),
      );
    }, 800);
    return () => window.clearTimeout(timer);
  }, [meta, perfil.uid, perfil.metaSemanal]);

  const anotar = async () => {
    setGuardando(true);
    try {
      await anotarPractica(perfil.uid, {
        instrumento,
        fecha: cuando === "hoy" ? hoy() : sumarDias(hoy(), -1),
        minutos,
        comentario: comentario.trim(),
      });
      setComentario("");
      avisar({ texto: `Anotaste ${minutos} min de ${instrumentoDe(instrumento).name}.` });
    } catch {
      avisar({ texto: "No se pudo anotar. Revisa tu conexión.", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const borrar = (entrada: EntradaDiario) => {
    setOcultas((s) => new Set(s).add(entrada.id));
    const timer = window.setTimeout(() => {
      pendientes.current.delete(entrada.id);
      borrarDelDiario(entrada.id).catch(() => {
        setOcultas((s) => {
          const otra = new Set(s);
          otra.delete(entrada.id);
          return otra;
        });
        avisar({ texto: "No se pudo borrar la anotación.", tipo: "error" });
      });
    }, DESHACER_MS);
    pendientes.current.set(entrada.id, timer);
    avisar({
      texto: "Anotación borrada.",
      duracion: DESHACER_MS,
      accion: {
        label: "Deshacer",
        onPress: () => {
          window.clearTimeout(pendientes.current.get(entrada.id));
          pendientes.current.delete(entrada.id);
          setOcultas((s) => {
            const otra = new Set(s);
            otra.delete(entrada.id);
            return otra;
          });
        },
      },
    });
  };

  const visibles = diario.data.filter((e) => !ocultas.has(e.id));

  return (
    <View style={styles.wrap}>
      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Meta semanal</Text>
        <Meta minutos={minutosDeEstaSemana(visibles)} meta={meta || undefined} />
        <View style={styles.fila}>
          <Stepper
            label="meta semanal"
            value={meta}
            min={0}
            max={3000}
            step={15}
            suffix="min"
            onChange={setMeta}
          />
          <Text style={styles.muted}>{meta ? "Tu profesor también la ve." : "0 = sin meta"}</Text>
        </View>
      </View>

      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Anotar una práctica</Text>
        {instrumentos.length > 1 ? (
          <Opciones
            chico
            opciones={instrumentos.map((id) => ({ value: id, label: instrumentoDe(id).name }))}
            valor={instrumento}
            onChange={setInstrumento}
          />
        ) : null}
        <View style={styles.fila}>
          <Opciones
            chico
            opciones={[
              { value: "hoy", label: "Hoy" },
              { value: "ayer", label: "Ayer" },
            ]}
            valor={cuando}
            onChange={setCuando}
          />
          <Stepper
            label="minutos practicados"
            value={minutos}
            min={5}
            max={600}
            step={5}
            suffix="min"
            onChange={setMinutos}
          />
        </View>
        <Input
          value={comentario}
          onChangeText={setComentario}
          placeholder="Qué practicaste, qué te costó (opcional)"
          accessibilityLabel="Comentario de la práctica"
          maxLength={500}
          multiline
          numberOfLines={2}
          style={styles.textarea}
        />
        <Button style={styles.anotar} disabled={guardando} onPress={anotar}>
          <NotebookPen size={16} color={buttonForeground()} />
          {guardando ? "Anotando…" : "Anotar práctica"}
        </Button>
      </View>

      <View style={styles.bloque}>
        <Text style={styles.subtitulo}>Últimas prácticas</Text>
        {diario.loading ? <ActivityIndicator color={colors.primary} /> : null}
        {!diario.loading && !visibles.length ? (
          <Text style={styles.muted}>Todavía no anotaste prácticas.</Text>
        ) : null}
        <ListaDiario entradas={visibles.slice(0, 15)} onBorrar={borrar} />
      </View>
    </View>
  );
}

function ListaDiario({
  entradas,
  onBorrar,
  conInstrumento = true,
}: {
  entradas: EntradaDiario[];
  onBorrar?: (entrada: EntradaDiario) => void;
  conInstrumento?: boolean;
}) {
  return (
    <View style={styles.lista}>
      {entradas.map((entrada) => (
        <View key={entrada.id} style={styles.entrada}>
          <View style={styles.flex}>
            <Text style={styles.entradaTitulo}>
              {formatoDia(entrada.fecha)} · {entrada.minutos} min
              {conInstrumento ? (
                <Text style={styles.muted}> · {instrumentoDe(entrada.instrumento).name}</Text>
              ) : null}
            </Text>
            {entrada.comentario ? <Text style={styles.muted}>{entrada.comentario}</Text> : null}
          </View>
          {onBorrar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Borrar la práctica del ${formatoDia(entrada.fecha)}`}
              onPress={() => onBorrar(entrada)}
              style={styles.borrar}
            >
              <Trash2 size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// Profesor: what one alumno practiced for an instrument they teach them, and their goal.
export function DiarioDelAlumno({
  alumnoId,
  instrumento,
  metaSemanal,
}: {
  alumnoId: string;
  instrumento: InstrumentId;
  metaSemanal?: number;
}) {
  const diario = useDiarioDe(alumnoId, instrumento);
  if (diario.loading) return <ActivityIndicator color={colors.primary} />;
  // Only this instrument's entries are readable here, while the goal counts every instrument the
  // alumno plays: a percentage would be wrong, so the goal is shown apart.
  return (
    <View style={styles.bloque}>
      <Text style={styles.subtitulo}>Diario de práctica</Text>
      <Text style={styles.metaNumero}>
        {minutosDeEstaSemana(diario.data)}
        <Text style={styles.muted}> min de {instrumentoDe(instrumento).name} esta semana</Text>
      </Text>
      <Text style={styles.muted}>
        {metaSemanal
          ? `Su meta semanal (todos sus instrumentos): ${metaSemanal} min.`
          : "No definió una meta semanal."}
      </Text>
      {diario.data.length ? (
        <ListaDiario entradas={diario.data.slice(0, 5)} conInstrumento={false} />
      ) : (
        <Text style={styles.muted}>Todavía no anotó prácticas de este instrumento.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 24,
    borderRadius: radius["2xl"],
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  wrap: {
    gap: 24,
  },
  bloque: {
    gap: 10,
  },
  subtitulo: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  meta: {
    gap: 8,
  },
  metaTexto: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  metaNumero: {
    fontFamily: fonts.display,
    fontSize: 32,
    fontVariant: ["tabular-nums"],
    color: colors.primary,
  },
  cumplida: {
    fontFamily: fonts.semibold,
    color: colors.success,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  textarea: {
    height: 64,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  anotar: {
    alignSelf: "flex-start",
  },
  lista: {
    gap: 8,
  },
  entrada: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  entradaTitulo: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  borrar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
});
