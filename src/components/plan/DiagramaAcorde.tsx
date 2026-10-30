import { StyleSheet, Text, View } from "react-native";
import { digitacion } from "@/lib/acordes";
import { colors, fonts } from "@/lib/theme";

const TRASTES = 5;

// Chord box: strings vertical (lowest on the left), open (o) / muted (x) marks on top,
// a barre when the shape has one, and the starting fret when it is up the neck.
export function DiagramaAcorde({
  nombre,
  instrumento,
  ancho = 96,
}: {
  nombre: string;
  instrumento: "guitarra" | "ukelele";
  ancho?: number;
}) {
  const acorde = digitacion(nombre, instrumento);
  const cuerdas = instrumento === "ukelele" ? 4 : 6;

  if (!acorde) {
    return (
      <View style={[styles.card, { width: ancho }]}>
        <Text style={styles.nombre}>{nombre}</Text>
        <View style={[styles.sinDiagrama, { height: ancho * 1.1 }]}>
          <Text style={styles.sinDiagramaText}>Sin diagrama</Text>
        </View>
      </View>
    );
  }

  const pisados = acorde.trastes.filter((t) => t > 0);
  const maximo = Math.max(0, ...pisados);
  const inicio = maximo > TRASTES ? Math.min(...pisados) : 1;
  const margenX = 14;
  const margenY = 18;
  const w = 100;
  const h = 112;
  const sepX = (w - margenX * 2) / (cuerdas - 1);
  const sepY = (h - margenY - 6) / TRASTES;
  const x = (cuerda: number) => margenX + cuerda * sepX;
  const y = (traste: number) => margenY + (traste - inicio + 0.5) * sepY;
  const tinta = colors.foreground;

  return (
    <View style={[styles.card, { width: ancho }]} accessibilityLabel={`Acorde ${nombre}`}>
      <Text style={styles.nombre}>{nombre}</Text>
      <svg viewBox={`0 0 ${w} ${h}`} width={ancho} height={(ancho * h) / w} aria-hidden="true">
        {/* Nut (thick) at the first position, otherwise the starting fret number. */}
        {inicio === 1 ? (
          <rect
            x={margenX - 1}
            y={margenY - 3}
            width={w - margenX * 2 + 2}
            height={4}
            fill={tinta}
            rx={1}
          />
        ) : (
          <text
            x={2}
            y={margenY + sepY * 0.6}
            fontSize={10}
            fill={colors.mutedForeground}
            fontFamily="Barlow_500Medium"
          >
            {inicio}
          </text>
        )}
        {Array.from({ length: TRASTES + 1 }, (_, i) => (
          <line
            key={`t${i}`}
            x1={margenX}
            x2={w - margenX}
            y1={margenY + i * sepY}
            y2={margenY + i * sepY}
            stroke={tinta}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: cuerdas }, (_, i) => (
          <line
            key={`c${i}`}
            x1={x(i)}
            x2={x(i)}
            y1={margenY}
            y2={margenY + TRASTES * sepY}
            stroke={tinta}
            strokeOpacity={0.7}
            strokeWidth={1 + (cuerdas - 1 - i) * 0.12}
          />
        ))}
        {acorde.cejilla && inicio <= acorde.cejilla ? (
          <rect
            x={x(acorde.trastes.findIndex((t) => t === acorde.cejilla)) - 5}
            y={y(acorde.cejilla) - 5}
            width={x(cuerdas - 1) - x(acorde.trastes.findIndex((t) => t === acorde.cejilla)) + 10}
            height={10}
            rx={5}
            fill={colors.primary}
          />
        ) : null}
        {acorde.trastes.map((traste, cuerda) => {
          if (traste < 0)
            return (
              <text
                key={cuerda}
                x={x(cuerda)}
                y={margenY - 7}
                fontSize={10}
                textAnchor="middle"
                fill={colors.mutedForeground}
                fontFamily="Barlow_600SemiBold"
              >
                ×
              </text>
            );
          if (traste === 0)
            return (
              <circle
                key={cuerda}
                cx={x(cuerda)}
                cy={margenY - 10}
                r={3.2}
                fill="none"
                stroke={tinta}
                strokeWidth={1.2}
              />
            );
          return <circle key={cuerda} cx={x(cuerda)} cy={y(traste)} r={5} fill={colors.primary} />;
        })}
      </svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 2,
  },
  // Not the display font: it is all caps, and "Em" (minor) is not "EM".
  nombre: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.foreground,
  },
  sinDiagrama: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 10,
  },
  sinDiagramaText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
