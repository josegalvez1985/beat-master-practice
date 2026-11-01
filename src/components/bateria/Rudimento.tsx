import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Pause, Play, Plus, Trophy } from "lucide-react";
import { Fila, Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { avisar } from "@/components/ui/toast";
import { usePerfil } from "@/lib/auth";
import {
  RUDIMENTOS,
  rudimento as rudimentoDe,
  sonarToque,
  toques,
  type Toque,
} from "@/lib/bateria";
import { guardarRecord, useRecordsAlumno } from "@/lib/data";
import { useMetronomo } from "@/lib/metronomo";
import type { Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type RudimentoBloqueT = Extract<Bloque, { tipo: "rudimento" }>;

// The sticking, big: R and L in different tones, accents (>) and grace notes (flams, drags).
export function Digitacion({ lista, actual }: { lista: Toque[]; actual: number }) {
  return (
    <View style={styles.digitacion} accessibilityLabel="Digitación">
      {lista.map((toque, i) => (
        <View key={i} style={[styles.toque, actual === i && styles.toqueSonando]}>
          <Text style={styles.acentoMarca}>{toque?.acento ? ">" : " "}</Text>
          <Text
            style={[
              styles.mano,
              toque?.mano === "L" && styles.manoIzquierda,
              !toque && styles.silencio,
            ]}
          >
            {toque ? (
              <>
                {toque.adornos ? (
                  <Text style={styles.adorno}>
                    {(toque.mano === "R" ? "l" : "r").repeat(toque.adornos)}
                  </Text>
                ) : null}
                {toque.mano}
              </>
            ) : (
              "·"
            )}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Practice: the sticking with sound (right hand on the right, left on the left), the click and
// a tempo ladder from `inicio` to `objetivo`. Alumnos can save their best clean tempo.
export function RudimentoPractica({
  rudimentoId,
  empiezaCon,
  inicio,
  objetivo,
  paso,
}: {
  rudimentoId: string;
  empiezaCon: "R" | "L";
  inicio: number;
  objetivo: number;
  paso: number;
}) {
  const perfil = usePerfil();
  const alumno = perfil.rol === "alumno";
  const r = rudimentoDe(rudimentoId);
  const lista = toques(r, empiezaCon);
  const [bpm, setBpm] = useState(inicio);
  const [sonando, setSonando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const records = useRecordsAlumno(alumno ? perfil.uid : null);
  const record = records.data.find((x) => x.rudimento === r.id);

  const actual = useMetronomo({
    activo: sonando,
    bpm,
    slots: lista.length,
    porPulso: r.subdivision,
    sonidoDe: (slot) => (slot === 0 ? "acento" : slot % r.subdivision === 0 ? "pulso" : null),
    programar: (slot, cuando, ctx) => sonarToque(ctx, lista[slot] ?? null, cuando),
  });

  const escalera: number[] = [];
  for (let t = inicio; t <= objetivo && escalera.length < 30; t += Math.max(1, paso))
    escalera.push(t);

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarRecord(perfil.uid, r.id, bpm);
      avisar({ texto: `Récord de ${r.nombre}: ${bpm} BPM.` });
    } catch {
      avisar({ texto: "No se pudo guardar el récord.", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Digitacion lista={lista} actual={actual} />
      <View style={styles.escalera}>
        {escalera.map((t) => (
          <Pressable
            key={t}
            accessibilityRole="radio"
            aria-checked={t === bpm}
            onPress={() => setBpm(t)}
            style={[styles.escalon, t === bpm && styles.escalonActivo]}
          >
            <Text style={styles.escalonTexto}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.controles}>
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Bajar el tempo"
          onPress={() => setBpm((v) => Math.max(30, v - paso))}
        >
          <Minus size={16} color={buttonForeground("secondary")} />
        </Button>
        <Button onPress={() => setSonando(!sonando)} style={styles.play}>
          {sonando ? (
            <Pause size={16} color={buttonForeground()} />
          ) : (
            <Play size={16} color={buttonForeground()} />
          )}
          {sonando ? "Detener" : `Tocar a ${bpm} BPM`}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Subir el tempo"
          onPress={() => setBpm((v) => Math.min(300, v + paso))}
        >
          <Plus size={16} color={buttonForeground("secondary")} />
        </Button>
      </View>
      {alumno ? (
        <View style={styles.record}>
          <Trophy size={16} color={colors.primary} />
          <Text style={styles.texto}>
            {record ? `Tu récord: ${record.bpm} BPM` : "Todavía no guardaste un récord."}
          </Text>
          {!record || bpm > record.bpm ? (
            <Button variant="secondary" size="sm" disabled={guardando} onPress={guardar}>
              Lo toqué limpio a {bpm} BPM
            </Button>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.ayuda}>
        Sube de a {paso} BPM solo cuando salga limpio y relajado dos veces seguidas. Con auriculares
        escuchas la mano derecha a la derecha y la izquierda a la izquierda.
      </Text>
    </View>
  );
}

// Plan block: the profesor picks the rudiment and the tempo ladder; everyone practices it.
export function RudimentoBloque({
  bloque,
  editable,
  onChange,
}: {
  bloque: RudimentoBloqueT;
  editable: boolean;
  onChange: (bloque: RudimentoBloqueT) => void;
}) {
  const r = rudimentoDe(bloque.rudimento);
  return (
    <View style={styles.wrap}>
      {editable ? (
        <View style={styles.editor}>
          <Fila label="Rudimento">
            <Opciones
              chico
              opciones={RUDIMENTOS.map((x) => ({ value: x.id, label: x.nombre }))}
              valor={r.id}
              onChange={(rudimento) => {
                const nuevo = rudimentoDe(rudimento);
                onChange({
                  ...bloque,
                  rudimento,
                  inicio: nuevo.tempo[0],
                  objetivo: Math.round((nuevo.tempo[0] + nuevo.tempo[1]) / 2 / 5) * 5,
                });
              }}
            />
          </Fila>
          <View style={styles.controles}>
            <Fila label="Desde">
              <Stepper
                label="tempo inicial"
                value={bloque.inicio}
                min={30}
                max={bloque.objetivo}
                step={5}
                suffix="BPM"
                onChange={(inicio) => onChange({ ...bloque, inicio })}
              />
            </Fila>
            <Fila label="Hasta">
              <Stepper
                label="tempo objetivo"
                value={bloque.objetivo}
                min={bloque.inicio}
                max={300}
                step={5}
                suffix="BPM"
                onChange={(objetivo) => onChange({ ...bloque, objetivo })}
              />
            </Fila>
            <Fila label="De a">
              <Stepper
                label="paso"
                value={bloque.paso}
                min={1}
                max={20}
                onChange={(paso) => onChange({ ...bloque, paso })}
              />
            </Fila>
            <Fila label="Empieza con">
              <Opciones
                chico
                opciones={[
                  { value: "R", label: "Derecha (R)" },
                  { value: "L", label: "Izquierda (L)" },
                ]}
                valor={bloque.empiezaCon}
                onChange={(empiezaCon) => onChange({ ...bloque, empiezaCon })}
              />
            </Fila>
          </View>
        </View>
      ) : (
        <Text style={styles.nombre}>
          {r.nombre} · {r.grupo}
        </Text>
      )}
      <RudimentoPractica
        key={`${r.id}-${bloque.inicio}-${bloque.empiezaCon}`}
        rudimentoId={r.id}
        empiezaCon={bloque.empiezaCon}
        inicio={bloque.inicio}
        objetivo={bloque.objetivo}
        paso={bloque.paso}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  editor: {
    gap: 12,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  digitacion: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  toque: {
    minWidth: 38,
    alignItems: "center",
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  toqueSonando: {
    backgroundColor: colors.selected,
  },
  acentoMarca: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 14,
    color: colors.primary,
  },
  mano: {
    fontFamily: fonts.headingBold,
    fontSize: 32,
    lineHeight: 36,
    color: colors.foreground,
  },
  manoIzquierda: {
    color: colors.mutedForeground,
  },
  silencio: {
    color: colors.border,
  },
  adorno: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  escalera: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  escalon: {
    minWidth: 44,
    height: 30,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  escalonActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  escalonTexto: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
  controles: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  play: {
    flexGrow: 1,
  },
  record: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  texto: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
  },
});
