import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

// Circular progress: the ring fills up when it appears (CSS, no JavaScript animation) and turns
// green at 100 %. The percentage goes in the middle in the display font (big numbers).

const CSS = `
.pulso-anillo { animation: pulso-anillo 0.9s ease-out; }
@keyframes pulso-anillo { from { stroke-dashoffset: var(--total); } }
@media (prefers-reduced-motion: reduce) { .pulso-anillo { animation: none !important; } }
`;

if (!document.getElementById("pulso-anillo")) {
  const style = document.createElement("style");
  style.id = "pulso-anillo";
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function Anillo({ porcentaje, size = 76 }: { porcentaje: number; size?: number }) {
  const valor = Math.max(0, Math.min(100, Math.round(porcentaje)));
  const grosor = size * 0.11;
  const r = (size - grosor) / 2;
  const total = 2 * Math.PI * r;
  const completo = valor >= 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: valor }}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colors.muted}
          strokeWidth={grosor}
        />
        <circle
          className="pulso-anillo"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={completo ? colors.success : colors.primary}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={total}
          strokeDashoffset={total * (1 - valor / 100)}
          style={{ ["--total" as string]: String(total) }}
        />
      </svg>
      <View style={[StyleSheet.absoluteFill, styles.centro]}>
        <Text
          style={[styles.numero, { fontSize: size * 0.3 }, completo && { color: colors.success }]}
        >
          {valor}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: {
    alignItems: "center",
    justifyContent: "center",
  },
  numero: {
    fontFamily: fonts.display,
    fontVariant: ["tabular-nums"],
    color: colors.foreground,
  },
});
