import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

const PULSE = "M92 276 H178 L214 152 L266 372 L306 204 L334 276 H420";
// The mark keeps its own colors in both themes, like the app icon.
const AMBER = "#f9a129";
const CARBON = "#100c0a";

// Brand mark: amber pulse line on carbon. Same drawing as public/favicon.svg (keep in sync);
// vector, so it stays sharp at any size and zoom.
export function LogoMark({ size = 32 }: { size?: number }) {
  // Unique gradient ids: several logos can be on the same page.
  const id = useId().replace(/:/g, "");

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, borderRadius: size * 0.23 }}
    >
      <defs>
        <radialGradient id={`${id}-light`} cx="50%" cy="-8%" r="100%">
          <stop offset="0" stopColor={AMBER} stopOpacity="0.42" />
          <stop offset="0.55" stopColor={AMBER} stopOpacity="0.08" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc65c" />
          <stop offset="0.5" stopColor={AMBER} />
          <stop offset="1" stopColor="#ec7a1c" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>
      <rect width="512" height="512" fill={CARBON} />
      <rect width="512" height="512" fill={`url(#${id}-light)`} />
      <path
        d={PULSE}
        fill="none"
        stroke={AMBER}
        strokeOpacity="0.55"
        strokeWidth="46"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${id}-glow)`}
      />
      <path
        d={PULSE}
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth="46"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Mark + "PULSO" wordmark, as in the top bar and the login.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityLabel="Pulso">
      <LogoMark size={size} />
      <Text style={[styles.word, { fontSize: size * 0.78 }]}>PULSO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  word: {
    fontFamily: fonts.display,
    letterSpacing: 2.4,
    color: colors.foreground,
    // Bebas Neue sits high in its line box; nudge it to the optical center of the mark.
    paddingTop: 2,
  },
});
