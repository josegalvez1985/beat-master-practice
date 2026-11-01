import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Pause, Play, Plus, VolumeX } from "lucide-react";
import { Fila, Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Stepper } from "@/components/ui/stepper";
import {
  BASICAS,
  MAX_COMPASES,
  PULSOS,
  SIGUIENTE_GOLPE,
  ajustarPistas,
  colorDeVoz,
  conteo,
  golpeEn,
  pasos,
  programarGroove,
  estilosDe,
  vocesDe,
  type CompasBateria,
  type Kit,
  type Golpe,
  type Groove,
  type Subdivision,
  type Voz,
} from "@/lib/bateria";
import { useMetronomo } from "@/lib/metronomo";
import { colors, fonts, radius } from "@/lib/theme";

const compases = [
  { value: "4/4", label: "4/4" },
  { value: "3/4", label: "3/4" },
  { value: "6/8", label: "6/8" },
] as const;
const subdivisiones = [
  { value: "2", label: "Corcheas" },
  { value: "3", label: "Tresillos" },
  { value: "4", label: "Semicorcheas" },
] as const;

// Drum groove as a step grid (rows = kit pieces, columns = steps). The profesor taps cells to
// cycle hit → accent → ghost → rest; everyone can play it, mute a voice to play it themselves,
// add the click and practice at another tempo without changing the class.
export function GrooveGrid({
  groove,
  editable,
  onChange,
  kit = "bateria",
}: {
  groove: Groove;
  editable: boolean;
  onChange?: (groove: Groove) => void;
  // Drum kit or hand percussion (cajón, congas, bongó…).
  kit?: Kit;
}) {
  const VOCES = vocesDe(kit);
  const ESTILOS = estilosDe(kit);
  const [sonando, setSonando] = useState(false);
  const [click, setClick] = useState(!editable);
  const [silenciadas, setSilenciadas] = useState<Set<Voz>>(new Set());
  // Practice tempo: starts at the groove's, does not change it.
  const [bpmPractica, setBpmPractica] = useState<number | null>(null);
  const bpm = editable ? groove.bpm : (bpmPractica ?? groove.bpm);
  const total = pasos(groove);
  const porPulso = groove.subdivision;

  const actual = useMetronomo({
    activo: sonando,
    bpm,
    slots: total,
    porPulso,
    sonidoDe: (paso) =>
      !click || paso % porPulso !== 0
        ? null
        : paso % (porPulso * PULSOS[groove.compas]) === 0
          ? "acento"
          : "pulso",
    programar: (paso, cuando, ctx) => programarGroove(ctx, groove, paso, cuando, silenciadas),
  });

  const conPista = VOCES.filter((v) => (groove.pistas[v.id] ?? "").replace(/\./g, ""));
  const visibles = VOCES.filter(
    (v) =>
      conPista.includes(v) || (editable && (BASICAS[kit].includes(v.id) || v.id in groove.pistas)),
  );
  const ocultas = VOCES.filter((v) => !visibles.includes(v));

  const cambiar = (cambios: Partial<Groove>) =>
    onChange?.(ajustarPistas({ ...groove, ...cambios }));

  const tocarCelda = (voz: Voz, paso: number) => {
    const pista = (groove.pistas[voz] ?? "").padEnd(total, ".");
    const nuevo = SIGUIENTE_GOLPE[golpeEn(pista, paso)];
    onChange?.({
      ...groove,
      pistas: { ...groove.pistas, [voz]: pista.slice(0, paso) + nuevo + pista.slice(paso + 1) },
    });
  };

  const alternarSilencio = (voz: Voz) =>
    setSilenciadas((s) => {
      const otra = new Set(s);
      if (otra.has(voz)) otra.delete(voz);
      else otra.add(voz);
      return otra;
    });

  return (
    <View style={styles.wrap}>
      {editable ? (
        <View style={styles.opciones}>
          <Fila label="Estilo de partida">
            <Opciones
              chico
              opciones={ESTILOS.map((e) => ({ value: e.id, label: e.nombre }))}
              valor=""
              onChange={(id) => {
                const estilo = ESTILOS.find((e) => e.id === id);
                if (estilo) onChange?.(estilo.groove);
              }}
            />
          </Fila>
          <View style={styles.filaOpciones}>
            <Opciones
              chico
              opciones={compases}
              valor={groove.compas}
              onChange={(compas: CompasBateria) =>
                cambiar({ compas, subdivision: compas === "6/8" ? 3 : groove.subdivision })
              }
            />
            {groove.compas === "6/8" ? null : (
              <Opciones
                chico
                opciones={subdivisiones}
                valor={String(groove.subdivision) as "2" | "3" | "4"}
                onChange={(v) => cambiar({ subdivision: Number(v) as Subdivision })}
              />
            )}
          </View>
          <View style={styles.filaOpciones}>
            <Stepper
              label="compases"
              value={groove.compases}
              min={1}
              max={MAX_COMPASES}
              suffix={groove.compases === 1 ? "compás" : "compases"}
              onChange={(n) => cambiar({ compases: n })}
            />
            <Stepper
              label="tempo"
              value={groove.bpm}
              min={40}
              max={220}
              step={5}
              suffix="BPM"
              onChange={(n) => cambiar({ bpm: n })}
            />
          </View>
        </View>
      ) : null}

      <ScrollView horizontal contentContainerStyle={styles.grilla}>
        <View>
          {visibles.map((voz) => {
            const silenciada = silenciadas.has(voz.id);
            return (
              <View key={voz.id} style={styles.fila}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    silenciada ? `Volver a escuchar ${voz.label}` : `Silenciar ${voz.label}`
                  }
                  onPress={() => alternarSilencio(voz.id)}
                  style={styles.voz}
                >
                  <View style={[styles.marca, { backgroundColor: colorDeVoz(voz.id) }]} />
                  <Text
                    numberOfLines={1}
                    style={[styles.vozTexto, silenciada && styles.vozSilenciada]}
                  >
                    {voz.label}
                  </Text>
                  {silenciada ? <VolumeX size={12} color={colors.mutedForeground} /> : null}
                </Pressable>
                {Array.from({ length: total }, (_, paso) => (
                  <Celda
                    key={paso}
                    golpe={golpeEn(groove.pistas[voz.id], paso)}
                    color={colorDeVoz(voz.id)}
                    sonando={actual === paso}
                    inicioPulso={paso % porPulso === 0}
                    inicioCompas={paso % (porPulso * PULSOS[groove.compas]) === 0 && paso > 0}
                    editable={editable}
                    etiqueta={`${voz.label}, ${conteo(groove.compas, groove.subdivision, paso)}`}
                    onPress={() => tocarCelda(voz.id, paso)}
                  />
                ))}
              </View>
            );
          })}
          <View style={styles.fila}>
            <View style={styles.voz} />
            {Array.from({ length: total }, (_, paso) => (
              <Text
                key={paso}
                style={[
                  styles.conteo,
                  paso % porPulso === 0 && styles.conteoPulso,
                  paso % (porPulso * PULSOS[groove.compas]) === 0 && paso > 0 && styles.separado,
                  actual === paso && { color: colors.primary },
                ]}
              >
                {conteo(groove.compas, groove.subdivision, paso)}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      {editable && ocultas.length ? (
        <View style={styles.agregarVoces}>
          {ocultas.map((voz) => (
            <Pressable
              key={voz.id}
              accessibilityRole="button"
              onPress={() =>
                onChange?.({ ...groove, pistas: { ...groove.pistas, [voz.id]: ".".repeat(total) } })
              }
              style={styles.agregarVoz}
            >
              <Plus size={12} color={colors.mutedForeground} />
              <Text style={styles.agregarTexto}>{voz.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.pie}>
        <Button onPress={() => setSonando(!sonando)}>
          {sonando ? (
            <Pause size={16} color={buttonForeground()} />
          ) : (
            <Play size={16} color={buttonForeground()} />
          )}
          {sonando ? "Detener" : "Escuchar"}
        </Button>
        <View style={styles.check}>
          <Checkbox checked={click} onCheckedChange={setClick} accessibilityLabel="Click" />
          <Text style={styles.texto} onPress={() => setClick(!click)}>
            Click
          </Text>
        </View>
        {editable ? null : (
          <Stepper
            label="tempo de práctica"
            value={bpm}
            min={30}
            max={240}
            step={5}
            suffix="BPM"
            onChange={setBpmPractica}
          />
        )}
      </View>
      <Text style={styles.ayuda}>
        {editable
          ? "Toca una casilla: golpe → acento (>) → nota fantasma (pequeña) → silencio. Toca el nombre de una pieza para silenciarla al escuchar."
          : `${groove.compas} · ${groove.bpm} BPM. Toca el nombre de una pieza para silenciarla y tocarla tú.`}
      </Text>
    </View>
  );
}

function Celda({
  golpe,
  color,
  sonando,
  inicioPulso,
  inicioCompas,
  editable,
  etiqueta,
  onPress,
}: {
  golpe: Golpe;
  color: string;
  sonando: boolean;
  inicioPulso: boolean;
  inicioCompas: boolean;
  editable: boolean;
  etiqueta: string;
  onPress: () => void;
}) {
  const nombre = { ".": "silencio", x: "golpe", ">": "acento", o: "nota fantasma" }[golpe];
  return (
    <Pressable
      accessibilityRole={editable ? "button" : undefined}
      accessibilityLabel={`${etiqueta}: ${nombre}`}
      disabled={!editable}
      onPress={onPress}
      style={[
        styles.celda,
        inicioPulso && styles.celdaPulso,
        inicioCompas && styles.separado,
        sonando && styles.celdaSonando,
      ]}
    >
      {golpe === "." ? null : (
        <View
          style={[
            styles.golpe,
            { backgroundColor: color },
            golpe === ">" && styles.acento,
            golpe === "o" && styles.fantasma,
          ]}
        />
      )}
    </Pressable>
  );
}

const CELDA = 30;

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  opciones: {
    gap: 10,
  },
  filaOpciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  grilla: {
    paddingBottom: 4,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
  },
  voz: {
    width: 112,
    height: CELDA,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 6,
  },
  marca: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vozTexto: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  vozSilenciada: {
    color: colors.mutedForeground,
    textDecorationLine: "line-through",
  },
  celda: {
    width: CELDA,
    height: CELDA,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: -1,
    marginTop: -1,
    backgroundColor: colors.muted,
  },
  celdaPulso: {
    backgroundColor: colors.secondary,
  },
  separado: {
    marginLeft: 6,
  },
  // What is playing: amber (the app's color for sound).
  celdaSonando: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  golpe: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  acento: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.foreground,
  },
  fantasma: {
    width: 9,
    height: 9,
    borderRadius: 5,
    opacity: 0.55,
  },
  conteo: {
    width: CELDA,
    marginLeft: -1,
    textAlign: "center",
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  conteoPulso: {
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  agregarVoces: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  agregarVoz: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  agregarTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  pie: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  check: {
    flexDirection: "row",
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
