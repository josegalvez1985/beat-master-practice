import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSearchParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Frown,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import { BotonAfinador } from "@/components/Afinador";
import {
  ContenidoBloque,
  DatosFicha,
  IconoEtapa,
  LineaDeTiempo,
  planStyles,
} from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { avisar } from "@/components/ui/toast";
import {
  anotarPracticaDeClase,
  marcarBloque,
  useMiPractica,
  type Clase,
  type ResultadoBloque,
} from "@/lib/data";
import { usePantallaEncendida } from "@/lib/pantalla";
import { etapa as etapaDe, type Bloque, type Plan } from "@/lib/plan";
import { hechosDeClase, marcarHecho, usePractica } from "@/lib/practica";
import { colors, fonts, radius } from "@/lib/theme";

// The alumno's side of a plan: an overview with "Hecho" per block, and a focused practice mode
// that goes one block at a time. `alumnoId` null = the profesor's preview (nothing is recorded).
export function Practica({
  clase,
  plan,
  alumnoId,
}: {
  clase: Clase;
  plan: Plan;
  alumnoId: string | null;
}) {
  const [params, setParams] = useSearchParams();
  const registros = usePractica(alumnoId ?? "vista-previa");
  // On every device (practicas), plus what this browser marked before that collection existed.
  const enLaNube = useMiPractica(clase, alumnoId).data?.bloques;
  const hechos = alumnoId
    ? new Set([...hechosDeClase(registros, clase.id), ...Object.keys(enLaNube ?? {})])
    : new Set<string>();
  const [enModo, setEnModo] = useState(() => params.get("practicar") === "1");
  const total = plan.bloques.length;
  const listos = plan.bloques.filter((b) => hechos.has(b.id)).length;
  const primeroPendiente = Math.max(
    0,
    plan.bloques.findIndex((b) => !hechos.has(b.id)),
  );

  // "hecho" without an opinion never replaces a "Me costó" already said about that block.
  const marcar = (bloque: Bloque, hecho: boolean, resultado?: ResultadoBloque) => {
    if (!alumnoId) return;
    marcarHecho(alumnoId, clase.id, bloque.id, bloque.minutos, hecho);
    const nuevo = hecho ? (resultado ?? enLaNube?.[bloque.id] ?? "hecho") : null;
    void marcarBloque(clase, alumnoId, bloque.id, nuevo).catch(() =>
      avisar({ texto: "No se pudo guardar cómo te fue en este bloque.", tipo: "error" }),
    );
  };

  const salir = () => {
    setEnModo(false);
    if (params.has("practicar")) setParams({}, { replace: true });
  };

  if (enModo && total) {
    return (
      <ModoPractica
        clase={clase}
        plan={plan}
        inicio={listos === total ? 0 : primeroPendiente}
        hechos={hechos}
        alumnoId={alumnoId}
        onMarcar={marcar}
        onSalir={salir}
      />
    );
  }

  return (
    <Section
      title="Plan de la clase"
      subtitle={alumnoId ? `${listos} de ${total} bloques practicados` : "Así la ve tu alumno."}
      actions={
        <View style={styles.acciones}>
          <BotonAfinador instrumento={clase.instrumento} afinacion={plan.ficha.afinacion} />
          {total ? (
            <Button onPress={() => setEnModo(true)}>
              <Play size={16} color={buttonForeground()} />
              {listos === 0
                ? "Empezar práctica"
                : listos === total
                  ? "Repasar"
                  : "Continuar práctica"}
            </Button>
          ) : null}
        </View>
      }
    >
      {alumnoId ? <Progress value={total ? (listos / total) * 100 : 0} /> : null}
      <View style={styles.lista}>
        <DatosFicha clase={clase} plan={plan} />
        <LineaDeTiempo bloques={plan.bloques} duracion={plan.ficha.duracion} />
        {plan.bloques.map((bloque, index) => {
          const etapa = etapaDe(bloque.etapa);
          const hecho = hechos.has(bloque.id);
          return (
            <View
              key={bloque.id}
              style={[planStyles.bloque, { borderLeftColor: etapa.color }, hecho && styles.hecho]}
            >
              <View style={planStyles.bloqueHeader}>
                <IconoEtapa bloque={bloque} />
                <View style={styles.flex}>
                  <Text style={[planStyles.etapaLabel, { color: etapa.color }]}>
                    {index + 1}. {etapa.label} · {bloque.minutos} min
                  </Text>
                  <Text style={planStyles.tituloTexto}>{bloque.titulo || "Sin título"}</Text>
                </View>
                {alumnoId ? (
                  <View style={styles.marca}>
                    <Checkbox
                      checked={hecho}
                      onCheckedChange={(valor) => marcar(bloque, valor)}
                      accessibilityLabel={`Marcar "${bloque.titulo}" como practicado`}
                    />
                    <Text style={styles.marcaText} onPress={() => marcar(bloque, !hecho)}>
                      Hecho
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={planStyles.bloqueBody}>
                {bloque.notas ? <Text style={planStyles.notasLectura}>{bloque.notas}</Text> : null}
                <ContenidoBloque
                  bloque={bloque}
                  clase={clase}
                  editable={false}
                  onChange={() => {}}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Section>
  );
}

// One block per screen, like a player: timer with the suggested minutes, the content, and how it
// went ("Me costó" / "Me salió"), which goes on to the next one. The screen stays on.
function ModoPractica({
  clase,
  plan,
  inicio,
  hechos,
  alumnoId,
  onMarcar,
  onSalir,
}: {
  clase: Clase;
  plan: Plan;
  inicio: number;
  hechos: Set<string>;
  alumnoId: string | null;
  onMarcar: (bloque: Bloque, hecho: boolean, resultado?: ResultadoBloque) => void;
  onSalir: () => void;
}) {
  const [indice, setIndice] = useState(inicio);
  const [terminado, setTerminado] = useState(false);
  usePantallaEncendida(!terminado);
  // The diary entry written when finishing (updates the weekly progress right away).
  const [diario, setDiario] = useState<{
    estado: "anotando" | "anotado" | "ya" | "error";
    minutos: number;
  } | null>(null);

  const registrar = (minutos: number) => {
    if (!alumnoId || minutos <= 0) return;
    setDiario({ estado: "anotando", minutos });
    anotarPracticaDeClase(alumnoId, clase, minutos).then(
      (nuevo) => setDiario({ estado: nuevo ? "anotado" : "ya", minutos }),
      () => setDiario({ estado: "error", minutos }),
    );
  };
  const total = plan.bloques.length;
  const bloque = plan.bloques[indice];

  // Without `resultado` (a pedal or the arrow keys): done, without saying how it went.
  const siguiente = (resultado?: ResultadoBloque) => {
    if (!bloque) return;
    onMarcar(bloque, true, resultado);
    if (indice + 1 >= total) {
      setTerminado(true);
      // Minutes of every block done, this one included (`hechos` updates on the next render).
      registrar(
        plan.bloques
          .filter((b) => b.id === bloque.id || hechos.has(b.id))
          .reduce((suma, b) => suma + (b.minutos || 0), 0),
      );
    } else setIndice(indice + 1);
  };
  const anterior = () => setIndice((i) => Math.max(0, i - 1));

  // Hands on the instrument: a page-turner pedal (they send arrows or Page Up/Down) or the
  // keyboard moves between blocks. Not while typing, and not on the final screen.
  const teclas = useRef({ siguiente, anterior, activo: !terminado });
  useEffect(() => {
    teclas.current = { siguiente, anterior, activo: !terminado && !!bloque };
  });
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (!teclas.current.activo || e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]"))
        return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        teclas.current.siguiente();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        teclas.current.anterior();
      }
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  if (terminado || !bloque) {
    const listos = plan.bloques.filter((b) => hechos.has(b.id)).length;
    const minutos = plan.bloques
      .filter((b) => hechos.has(b.id))
      .reduce((total, b) => total + (b.minutos || 0), 0);
    return (
      <Section title="Plan de la clase">
        <View style={styles.final}>
          <View style={styles.trofeo}>
            <Trophy size={36} color={colors.primary} />
          </View>
          <Text style={styles.finalTitulo}>¡Práctica terminada!</Text>
          <Text style={styles.finalTexto}>
            {listos} de {total} bloques hechos. Ahora graba tu práctica y súbela como entrega: así
            cuenta en el avance de tus clases.
          </Text>
          {diario ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.finalTexto,
                diario.estado === "error" && { color: colors.destructive },
              ]}
            >
              {diario.estado === "anotando"
                ? "Anotando en tu diario…"
                : diario.estado === "anotado"
                  ? `Anotamos ${diario.minutos} min en tu diario: tu avance de la semana ya se actualizó.`
                  : diario.estado === "ya"
                    ? "Esta práctica ya estaba anotada hoy en tu diario."
                    : "No se pudo anotar en tu diario."}
            </Text>
          ) : null}
          <View style={styles.finalAcciones}>
            <Button
              variant="secondary"
              onPress={() => {
                setTerminado(false);
                setIndice(0);
              }}
            >
              <RotateCcw size={16} color={buttonForeground("secondary")} />
              Repasar desde el inicio
            </Button>
            {diario?.estado === "error" ? (
              <Button variant="secondary" onPress={() => registrar(minutos)}>
                <NotebookPen size={16} color={buttonForeground("secondary")} />
                Reintentar
              </Button>
            ) : null}
            <Button onPress={onSalir}>Volver a la clase</Button>
          </View>
        </View>
      </Section>
    );
  }

  const etapa = etapaDe(bloque.etapa);

  return (
    <View style={[styles.modo, { borderTopColor: etapa.color }]}>
      <View style={styles.modoBarra}>
        <Text style={styles.paso}>
          Bloque {indice + 1} de {total}
        </Text>
        <View style={styles.puntos}>
          {plan.bloques.map((b, i) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Ir al bloque ${i + 1}`}
              onPress={() => setIndice(i)}
              style={[
                styles.punto,
                hechos.has(b.id) && { backgroundColor: etapaDe(b.etapa).color },
                i === indice && styles.puntoActual,
              ]}
            />
          ))}
        </View>
        <BotonAfinador instrumento={clase.instrumento} afinacion={plan.ficha.afinacion} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Salir del modo práctica"
          onPress={onSalir}
          style={styles.salir}
        >
          <X size={18} color={colors.foreground} />
          <Text style={styles.salirText}>Ver todo</Text>
        </Pressable>
      </View>

      <View style={styles.modoCabecera}>
        <IconoEtapa bloque={bloque} size={44} />
        <View style={styles.flex}>
          <Text style={[planStyles.etapaLabel, { color: etapa.color }]}>{etapa.label}</Text>
          <Text style={styles.modoTitulo}>{bloque.titulo || "Sin título"}</Text>
        </View>
        <Cronometro key={bloque.id} minutos={bloque.minutos} />
      </View>

      {bloque.notas ? <Text style={planStyles.notasLectura}>{bloque.notas}</Text> : null}
      <ContenidoBloque bloque={bloque} clase={clase} editable={false} onChange={() => {}} />

      <View style={styles.modoPie}>
        <Button variant="secondary" disabled={indice === 0} onPress={anterior}>
          <ArrowLeft size={16} color={buttonForeground("secondary")} />
          Anterior
        </Button>
        <Text style={styles.pedal}>Pedal o flechas ← →</Text>
        <Button variant="secondary" size="lg" onPress={() => siguiente("costo")}>
          <Frown size={18} color={buttonForeground("secondary")} />
          Me costó
        </Button>
        <Button size="lg" onPress={() => siguiente("bien")} style={styles.siguiente}>
          <Check size={18} color={buttonForeground()} />
          {indice + 1 >= total ? "Me salió y termino" : "Me salió y sigo"}
          {indice + 1 >= total ? null : <ArrowRight size={18} color={buttonForeground()} />}
        </Button>
      </View>
    </View>
  );
}

// Countdown from the block's suggested minutes; keeps counting past zero (shown in amber).
function Cronometro({ minutos }: { minutos: number }) {
  const [restante, setRestante] = useState(minutos * 60);
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => {
    if (!corriendo) return;
    const timer = window.setInterval(() => setRestante((s) => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [corriendo]);

  const extra = restante < 0;
  const segundos = Math.abs(restante);
  const texto = `${extra ? "+" : ""}${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <View style={styles.crono}>
      <Text style={[styles.cronoTiempo, extra && { color: colors.primary }]}>{texto}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={corriendo ? "Pausar cronómetro" : "Iniciar cronómetro"}
        onPress={() => setCorriendo(!corriendo)}
        style={styles.cronoBoton}
      >
        {corriendo ? (
          <Pause size={16} color={colors.foreground} />
        ) : (
          <Play size={16} color={colors.foreground} />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reiniciar cronómetro"
        onPress={() => {
          setCorriendo(false);
          setRestante(minutos * 60);
        }}
        style={styles.cronoBoton}
      >
        <RotateCcw size={14} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  lista: {
    gap: 14,
  },
  flex: {
    flex: 1,
    minWidth: 160,
  },
  hecho: {
    opacity: 0.72,
  },
  marca: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  marcaText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
    cursor: "pointer",
    userSelect: "none",
  },
  modo: {
    gap: 18,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderTopWidth: 4,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  modoBarra: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  paso: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    color: colors.mutedForeground,
  },
  puntos: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  punto: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  puntoActual: {
    borderColor: colors.primary,
  },
  salir: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  salirText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  modoCabecera: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
  },
  modoTitulo: {
    fontFamily: fonts.headingBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.foreground,
  },
  crono: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.muted,
  },
  cronoTiempo: {
    minWidth: 64,
    fontFamily: fonts.display,
    fontSize: 30,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  cronoBoton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.secondary,
  },
  modoPie: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pedal: {
    alignSelf: "center",
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  siguiente: {
    flexGrow: 1,
    maxWidth: 360,
  },
  final: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  trofeo: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: colors.selected,
  },
  finalTitulo: {
    fontFamily: fonts.headingBold,
    fontSize: 28,
    color: colors.foreground,
  },
  finalTexto: {
    maxWidth: 420,
    textAlign: "center",
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.mutedForeground,
  },
  finalAcciones: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
});
