import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Link } from "expo-router";
import Head from "expo-router/head";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, ChevronRight, Drum, Flame, Timer, Trophy } from "lucide-react-native";
import heroImage from "@/assets/drums-hero.jpg";
import { Button, buttonForeground } from "@/components/ui/button";
import { GradientText } from "@/components/ui/gradient-text";
import { Progress } from "@/components/ui/progress";
import { StageGlow } from "@/components/ui/stage-glow";
import { Metronome } from "@/components/Metronome";
import { colors, fonts, radius, shared } from "@/lib/theme";

const lessons = [
  {
    title: "Single stroke roll",
    level: "Rudimento · Nivel 1",
    minutes: 8,
    progress: 72,
    icon: Drum,
  },
  {
    title: "Groove de rock 4/4",
    level: "Groove · Nivel 2",
    minutes: 12,
    progress: 45,
    icon: Flame,
  },
  {
    title: "Independencia de pie",
    level: "Técnica · Nivel 3",
    minutes: 15,
    progress: 18,
    icon: Activity,
  },
];

export default function Index() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sm = width >= 640;
  const lg = width >= 1024;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom }}>
      <Head>
        <title>Pulso — Practica batería todos los días</title>
        <meta
          name="description"
          content="Tu sesión diaria de batería: rudimentos, grooves, metrónomo y seguimiento de racha."
        />
      </Head>

      <View style={styles.hero}>
        <Image
          source={heroImage}
          accessibilityLabel="Batería iluminada en un estudio oscuro"
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, styles.heroImage]}
        />
        <LinearGradient
          colors={["rgba(16, 12, 10, 0.6)", "rgba(16, 12, 10, 0.85)", colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <StageGlow />
        <View style={[styles.container, styles.heroContent, { paddingTop: insets.top + 40 }]}>
          <View style={styles.header}>
            <Text style={styles.brand}>PULSO</Text>
            <Link href="/login" asChild>
              <Button variant="secondary" size="sm">
                Entrar
              </Button>
            </Link>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>Sesión de hoy</Text>
            <View style={styles.titleBlock}>
              <Text style={[styles.title, sm && styles.titleSm]}>Golpea fuerte,</Text>
              <GradientText style={[styles.title, sm && styles.titleSm]}>
                practica preciso.
              </GradientText>
            </View>
            <Text style={styles.lead}>
              Rudimentos guiados, grooves reales y un metrónomo siempre a mano. 15 minutos al día
              bastan para que tus manos cambien.
            </Text>
            <View style={styles.actions}>
              <Link href="/login" asChild>
                <Button size="lg">
                  Empezar sesión
                  <ChevronRight size={16} color={buttonForeground()} />
                </Button>
              </Link>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.container, styles.body]}>
        <View style={[styles.stats, sm && styles.row]}>
          <Stat icon={Flame} label="Racha" value="12 días" grow={sm} />
          <Stat icon={Timer} label="Esta semana" value="2 h 40 m" grow={sm} />
          <Stat icon={Trophy} label="Rudimentos" value="9 / 40" grow={sm} />
        </View>

        <View style={[styles.columns, lg && styles.row]}>
          <View style={lg ? styles.mainColumn : undefined}>
            <Text style={styles.sectionTitle}>Continúa donde lo dejaste</Text>
            <View style={styles.lessons}>
              {lessons.map((lesson) => (
                <View key={lesson.title} style={[shared.panel, styles.lesson]}>
                  <View style={styles.lessonIcon}>
                    <lesson.icon size={20} color={colors.primary} />
                  </View>
                  <View style={styles.lessonBody}>
                    <Text numberOfLines={1} style={styles.lessonTitle}>
                      {lesson.title}
                    </Text>
                    <Text style={styles.lessonMeta}>
                      {lesson.level} · {lesson.minutes} min
                    </Text>
                    <Progress value={lesson.progress} style={styles.slimProgress} />
                  </View>
                  <ChevronRight size={20} color={colors.mutedForeground} />
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.sideColumn, lg && styles.sideColumnLg]}>
            <Metronome />
            <View style={[shared.panel, styles.challenge]}>
              <Text style={styles.challengeTitle}>Reto semanal</Text>
              <Text style={styles.challengeBody}>
                Paradiddles a 100 BPM durante 5 minutos sin perder el tempo.
              </Text>
              <Progress value={60} style={[styles.slimProgress, styles.challengeProgress]} />
              <Text style={styles.challengeMeta}>3 de 5 sesiones completadas</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Pulso · práctica de batería · instalable en tu teléfono
        </Text>
      </View>
    </ScrollView>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  grow,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  grow: boolean;
}) {
  return (
    <View style={[shared.panel, styles.stat, grow && styles.statGrow]}>
      <Icon size={20} color={colors.primary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    width: "100%",
    maxWidth: 1024,
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: "row",
  },
  hero: {
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    opacity: 0.4,
  },
  heroContent: {
    paddingBottom: 64,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 2.4,
    color: colors.foreground,
  },
  intro: {
    marginTop: 80,
    maxWidth: 672,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 3.6,
    textTransform: "uppercase",
    color: colors.primary,
  },
  titleBlock: {
    marginTop: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: 1,
    color: colors.foreground,
  },
  titleSm: {
    fontSize: 72,
    lineHeight: 70,
  },
  lead: {
    marginTop: 20,
    maxWidth: 512,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.mutedForeground,
  },
  actions: {
    marginTop: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  body: {
    paddingBottom: 80,
  },
  stats: {
    gap: 16,
  },
  stat: {
    borderRadius: radius["2xl"],
    padding: 20,
  },
  statGrow: {
    flexGrow: 1,
    flexBasis: 0,
  },
  statLabel: {
    marginTop: 12,
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.foreground,
  },
  columns: {
    marginTop: 48,
    gap: 24,
  },
  mainColumn: {
    flexGrow: 1.6,
    flexBasis: 0,
  },
  sideColumn: {
    gap: 24,
  },
  sideColumnLg: {
    flexGrow: 1,
    flexBasis: 0,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: 0.6,
    color: colors.foreground,
  },
  lessons: {
    marginTop: 20,
    gap: 12,
  },
  lesson: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: radius["2xl"],
    padding: 16,
  },
  lessonIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
  },
  lessonBody: {
    flex: 1,
    minWidth: 0,
  },
  lessonTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.foreground,
  },
  lessonMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  slimProgress: {
    marginTop: 12,
    height: 6,
  },
  challenge: {
    borderRadius: radius["2xl"],
    padding: 24,
  },
  challengeTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.4,
    color: colors.foreground,
  },
  challengeBody: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
  challengeProgress: {
    marginTop: 16,
  },
  challengeMeta: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    textAlign: "center",
    color: colors.mutedForeground,
  },
});
