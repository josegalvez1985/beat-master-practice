import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react";
import { AcordesBloque } from "@/components/plan/AcordesBloque";
import { ArchivosBloque } from "@/components/plan/ArchivosBloque";
import { RasgueoBloque } from "@/components/plan/RasgueoBloque";
import { TablaturaBloque } from "@/components/plan/TablaturaBloque";
import { TempoBloque } from "@/components/plan/TempoBloque";
import { YoutubeBloque } from "@/components/plan/YoutubeBloque";
import type { Clase } from "@/lib/data";
import type { Material } from "@/lib/files";
import {
  conAcordes,
  conCuerdas,
  etapa as etapaDe,
  minutosTotales,
  niveles,
  youtube,
  type Bloque,
  type Plan,
} from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

// The content of a block, editable or for practice.
export function ContenidoBloque({
  bloque,
  clase,
  editable,
  onChange,
  onAgregarArchivo,
  onQuitarArchivo,
  ocultos,
}: {
  bloque: Bloque;
  clase: Clase;
  editable: boolean;
  onChange: (bloque: Bloque) => void;
  onAgregarArchivo?: (material: Material) => Promise<void>;
  onQuitarArchivo?: (material: Material) => void;
  // Files waiting to be deleted (hidden while "Deshacer" is available).
  ocultos?: Set<string>;
}) {
  switch (bloque.tipo) {
    case "tablatura":
      return <TablaturaBloque bloque={bloque} editable={editable} onChange={onChange} />;
    case "acordes":
      return (
        <AcordesBloque
          bloque={bloque}
          editable={editable}
          instrumento={clase.instrumento === "ukelele" ? "ukelele" : "guitarra"}
          onChange={onChange}
        />
      );
    case "rasgueo":
      return <RasgueoBloque bloque={bloque} editable={editable} onChange={onChange} />;
    case "tempo":
      return <TempoBloque bloque={bloque} editable={editable} onChange={onChange} />;
    case "youtube":
      return <YoutubeBloque bloque={bloque} editable={editable} onChange={onChange} />;
    case "archivos":
      return (
        <ArchivosBloque
          bloque={
            ocultos?.size
              ? { ...bloque, archivos: bloque.archivos.filter((m) => !ocultos.has(m.id)) }
              : bloque
          }
          editable={editable}
          claseId={clase.id}
          onAgregar={onAgregarArchivo ?? (async () => {})}
          onQuitar={onQuitarArchivo ?? (() => {})}
        />
      );
    case "texto":
      return null;
  }
}

// One line describing a folded block.
export function resumen(bloque: Bloque) {
  switch (bloque.tipo) {
    case "tablatura":
      return "Tablatura y pentagrama";
    case "acordes":
      return bloque.acordes.length ? bloque.acordes.join(" · ") : "Sin acordes";
    case "rasgueo":
      return `${bloque.compas} · ${bloque.bpm} BPM · ${bloque.golpes
        .map((g) => ({ D: "↓", U: "↑", x: "✕", "-": "·" })[g])
        .join(" ")}`;
    case "tempo":
      return `${bloque.inicio} → ${bloque.objetivo} BPM`;
    case "youtube":
      return youtube(bloque.url) ? "Video de YouTube" : "Sin video";
    case "archivos":
      return bloque.archivos.length === 1 ? "1 archivo" : `${bloque.archivos.length} archivos`;
    case "texto":
      return bloque.notas ? bloque.notas.slice(0, 80) : "Sin texto";
  }
}

// Class timeline: one colored segment per block, sized by its minutes.
export function LineaDeTiempo({ bloques, duracion }: { bloques: Bloque[]; duracion: number }) {
  const total = minutosTotales(bloques);
  if (!bloques.length) return null;
  const pasado = total > duracion;
  return (
    <View style={styles.linea}>
      <View style={styles.lineaBarra}>
        {bloques.map((bloque) => (
          <View
            key={bloque.id}
            style={{
              flex: Math.max(bloque.minutos, 1),
              backgroundColor: etapaDe(bloque.etapa).color,
            }}
          />
        ))}
        {total < duracion ? (
          <View style={{ flex: duracion - total, backgroundColor: colors.muted }} />
        ) : null}
      </View>
      <Text style={[styles.lineaText, pasado && { color: colors.destructive }]}>
        {total} de {duracion} min{pasado ? ` · te pasaste ${total - duracion} min` : ""}
      </Text>
    </View>
  );
}

// Level, style, tuning, capo and length as small tags.
export function DatosFicha({ clase, plan }: { clase: Clase; plan: Plan }) {
  const { ficha } = plan;
  const datos = [
    niveles.find((n) => n.value === ficha.nivel)?.label,
    ficha.estilo,
    conCuerdas(clase.instrumento) ? ficha.afinacion : null,
    conAcordes(clase.instrumento) && ficha.capo ? `Capo en traste ${ficha.capo}` : null,
    `${ficha.duracion} min`,
  ].filter(Boolean) as string[];
  return (
    <View style={styles.datos}>
      {datos.map((dato) => (
        <View key={dato} style={styles.dato}>
          <Text style={styles.datoText}>{dato}</Text>
        </View>
      ))}
    </View>
  );
}

// Round colored badge with the block's stage icon.
export function IconoEtapa({ bloque, size = 30 }: { bloque: Bloque; size?: number }) {
  const etapa = etapaDe(bloque.etapa);
  return (
    <View
      style={[
        styles.etapaIcono,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: etapa.color },
      ]}
    >
      <etapa.icon size={Math.round(size / 2)} color={colors.background} />
    </View>
  );
}

export function Fila({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaLabel}>{label}</Text>
      {children}
    </View>
  );
}

// Pill options; the chosen one gets the "selected" look (amber edge + soft tint).
export function Opciones<T extends string>({
  opciones,
  valor,
  onChange,
  chico = false,
}: {
  opciones: readonly { value: T; label: string }[];
  valor: T;
  onChange: (valor: T) => void;
  chico?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.opciones}>
      {opciones.map((opcion) => {
        const activa = opcion.value === valor;
        return (
          <Pressable
            key={opcion.value}
            accessibilityRole="radio"
            aria-checked={activa}
            onPress={() => onChange(opcion.value)}
            style={[styles.opcion, chico && styles.opcionChica, activa && styles.opcionActiva]}
          >
            <Text
              style={[
                styles.opcionText,
                chico && styles.opcionTextChica,
                activa && styles.opcionTextActiva,
              ]}
            >
              {opcion.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Herramienta({
  label,
  icon: Icon,
  disabled,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.herramienta, disabled && styles.deshabilitado]}
    >
      <Icon size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export const planStyles = StyleSheet.create({
  // Block card: stage-colored left edge.
  bloque: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  bloqueHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  bloqueBody: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  etapaLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  tituloTexto: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.foreground,
  },
  resumen: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  notasLectura: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.foreground,
  },
});

const styles = StyleSheet.create({
  linea: {
    gap: 6,
  },
  lineaBarra: {
    flexDirection: "row",
    height: 10,
    gap: 2,
    borderRadius: 5,
    overflow: "hidden",
  },
  lineaText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    color: colors.mutedForeground,
  },
  datos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dato: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.muted,
  },
  datoText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  etapaIcono: {
    alignItems: "center",
    justifyContent: "center",
  },
  fila: {
    gap: 6,
  },
  filaLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  opciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  opcion: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  opcionChica: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  opcionActiva: {
    backgroundColor: colors.selected,
    borderColor: colors.primary,
  },
  opcionText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  opcionTextChica: {
    fontSize: 13,
  },
  opcionTextActiva: {
    fontFamily: fonts.semibold,
  },
  herramienta: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  deshabilitado: {
    opacity: 0.3,
  },
});
