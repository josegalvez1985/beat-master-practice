import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ClipboardCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { avisar } from "@/components/ui/toast";
import { guardarEvaluacion, type Entrega, type Evaluacion } from "@/lib/data";
import type { InstrumentId } from "@/lib/instruments";
import { NOTAS_RUBRICA, criteriosPara, etiquetaNota, habilidades } from "@/lib/rubrica";
import { colors, fonts, radius } from "@/lib/theme";

// Profesor: 1 to 5 in each criterion of the instrument and a short comment. Saved inside the
// delivery (deleted with it).
export function RubricaEditor({
  entrega,
  instrumento,
}: {
  entrega: Entrega;
  instrumento: InstrumentId;
}) {
  const criterios = criteriosPara(instrumento);
  const [abierta, setAbierta] = useState(false);
  const [valores, setValores] = useState<Record<string, number>>(
    entrega.evaluacion?.criterios ?? {},
  );
  const [comentario, setComentario] = useState(entrega.evaluacion?.comentario ?? "");
  const [guardando, setGuardando] = useState(false);

  if (!abierta)
    return (
      <View style={styles.cerrada}>
        {entrega.evaluacion ? (
          <RubricaVista evaluacion={entrega.evaluacion} instrumento={instrumento} />
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          style={styles.inicio}
          onPress={() => setAbierta(true)}
        >
          <ClipboardCheck size={14} color={buttonForeground("secondary")} />
          {entrega.evaluacion ? "Cambiar evaluación" : "Evaluar con rúbrica"}
        </Button>
      </View>
    );

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarEvaluacion(entrega, {
        criterios: Object.fromEntries(
          criterios.filter((c) => valores[c.id]).map((c) => [c.id, valores[c.id]!]),
        ),
        comentario: comentario.trim().slice(0, 1000),
      });
      avisar({ texto: "Evaluación guardada." });
      setAbierta(false);
    } catch {
      avisar({ texto: "No se pudo guardar la evaluación.", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={styles.editor}>
      {criterios.map((c) => (
        <View key={c.id} style={styles.criterio}>
          <View style={styles.flex}>
            <Text style={styles.label}>{c.label}</Text>
            <Text style={styles.ayuda}>{c.ayuda}</Text>
          </View>
          <View accessibilityRole="radiogroup" aria-label={c.label} style={styles.notas}>
            {NOTAS_RUBRICA.map((n) => {
              const activa = valores[c.id] === n.valor;
              return (
                <Pressable
                  key={n.valor}
                  accessibilityRole="radio"
                  aria-checked={activa}
                  accessibilityLabel={`${c.label}: ${n.valor}, ${n.label}`}
                  onPress={() => setValores((v) => ({ ...v, [c.id]: n.valor }))}
                  style={[styles.nota, activa && styles.notaActiva]}
                >
                  <Text style={styles.notaTexto}>{n.valor}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={styles.ayuda}>
        1 Empezando · 2 En camino · 3 Bien · 4 Muy bien · 5 Excelente
      </Text>
      <Input
        accessibilityLabel="Devolución breve"
        placeholder="Devolución breve: qué salió bien y qué practicar."
        value={comentario}
        onChangeText={setComentario}
        multiline
        numberOfLines={3}
        maxLength={1000}
        style={styles.textarea}
      />
      <View style={styles.acciones}>
        <Button size="sm" disabled={guardando || !Object.keys(valores).length} onPress={guardar}>
          {guardando ? "Guardando…" : "Guardar evaluación"}
        </Button>
        <Button variant="secondary" size="sm" onPress={() => setAbierta(false)}>
          Cancelar
        </Button>
      </View>
    </View>
  );
}

// What the alumno (and the profesor) sees: a bar per criterion and the comment.
export function RubricaVista({
  evaluacion,
  instrumento,
}: {
  evaluacion: Evaluacion;
  instrumento: InstrumentId;
}) {
  const criterios = criteriosPara(instrumento).filter((c) => evaluacion.criterios[c.id]);
  return (
    <View style={styles.vista}>
      {criterios.map((c) => {
        const valor = evaluacion.criterios[c.id]!;
        return <Barra key={c.id} label={c.label} valor={valor} detalle={etiquetaNota(valor)} />;
      })}
      {evaluacion.comentario ? (
        <Text style={styles.comentario}>“{evaluacion.comentario}”</Text>
      ) : null}
    </View>
  );
}

// The alumno's skills over every evaluated delivery of the instrument: average, latest and trend.
export function Habilidades({
  instrumento,
  entregas,
}: {
  instrumento: InstrumentId;
  entregas: Entrega[];
}) {
  const datos = habilidades(instrumento, entregas).filter((h) => h.promedio !== null);
  if (!datos.length) return null;
  return (
    <View style={styles.vista}>
      {datos.map((h) => (
        <Barra
          key={h.criterio.id}
          label={h.criterio.label}
          valor={h.promedio!}
          detalle={`${h.promedio!.toFixed(1)} de 5 · ${h.cantidad} ${h.cantidad === 1 ? "evaluación" : "evaluaciones"}`}
          tendencia={h.tendencia}
        />
      ))}
    </View>
  );
}

function Barra({
  label,
  valor,
  detalle,
  tendencia = 0,
}: {
  label: string;
  valor: number;
  detalle: string;
  tendencia?: number;
}) {
  return (
    <View style={styles.barraFila} accessibilityLabel={`${label}: ${detalle}`}>
      <Text style={styles.barraLabel}>{label}</Text>
      <View style={styles.barra}>
        <View style={[styles.relleno, { width: `${(valor / 5) * 100}%` }]} />
      </View>
      <View style={styles.detalle}>
        {tendencia > 0 ? <TrendingUp size={14} color={colors.success} /> : null}
        {tendencia < 0 ? <TrendingDown size={14} color={colors.mutedForeground} /> : null}
        <Text style={styles.ayuda}>{detalle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cerrada: {
    gap: 10,
  },
  inicio: {
    alignSelf: "flex-start",
  },
  editor: {
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  criterio: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  flex: {
    flex: 1,
    minWidth: 160,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  notas: {
    flexDirection: "row",
    gap: 6,
  },
  nota: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  notaActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  notaTexto: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  textarea: {
    height: 76,
    paddingTop: 8,
    textAlignVertical: "top",
  },
  acciones: {
    flexDirection: "row",
    gap: 8,
  },
  vista: {
    gap: 8,
  },
  barraFila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  barraLabel: {
    width: 110,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  barra: {
    flex: 1,
    minWidth: 100,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.secondary,
  },
  // Progress: solid amber.
  relleno: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  detalle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  comentario: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.foreground,
  },
});
