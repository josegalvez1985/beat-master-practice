import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { Minus, Pause, Play, Plus } from "lucide-react-native";
import { Button, buttonForeground } from "@/components/ui/button";
import { colors, fonts, radius, shared } from "@/lib/theme";

export function Metronome() {
  const [bpm, setBpm] = useState(90);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setBeat((b) => (b + 1) % 4), (60 / bpm) * 1000);
    return () => clearInterval(id);
  }, [playing, bpm]);

  return (
    <View style={[shared.panel, styles.card]}>
      <View style={styles.header}>
        <Text style={styles.label}>Metrónomo</Text>
        <Text style={styles.bpm}>{bpm} BPM</Text>
      </View>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <BeatDot key={i} active={playing && beat === i} />
        ))}
      </View>

      <View style={styles.controls}>
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Bajar tempo"
          onPress={() => setBpm((v) => Math.max(40, v - 5))}
        >
          <Minus size={16} color={buttonForeground("secondary")} />
        </Button>
        <Button style={styles.toggle} onPress={() => setPlaying((p) => !p)}>
          {playing ? (
            <Pause size={16} color={buttonForeground()} />
          ) : (
            <Play size={16} color={buttonForeground()} />
          )}
          {playing ? "Detener" : "Iniciar práctica"}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          accessibilityLabel="Subir tempo"
          onPress={() => setBpm((v) => Math.min(220, v + 5))}
        >
          <Plus size={16} color={buttonForeground("secondary")} />
        </Button>
      </View>
    </View>
  );
}

// Native counterpart of the web `beat-dot` pulse animation.
function BeatDot({ active }: { active: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!active) {
      pulse.setValue(0);
      return;
    }
    const timing = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: 600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      });
    const loop = Animated.loop(Animated.sequence([timing(1), timing(0)]));
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <Animated.View
      style={[
        styles.dot,
        active && {
          backgroundColor: colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius["2xl"],
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  bpm: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.primary,
  },
  dots: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.muted,
  },
  controls: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggle: {
    flex: 1,
  },
});
