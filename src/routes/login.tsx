import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Link, useRouter } from "expo-router";
import Head from "expo-router/head";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eye, EyeOff } from "lucide-react-native";
import heroImage from "@/assets/drums-hero.jpg";
import { Button, buttonForeground } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GradientText } from "@/components/ui/gradient-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StageGlow } from "@/components/ui/stage-glow";
import { colors, fonts } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const lg = width >= 1024;
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const onSubmit = () => {
    if (!form.email.includes("@") || form.password.length < 6) {
      setError("Revisa tu correo y usa una contraseña de al menos 6 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.navigate("/");
    }, 900);
  };

  return (
    <View style={[styles.screen, lg && styles.row]}>
      <Head>
        <title>Iniciar sesión — Pulso batería</title>
        <meta
          name="description"
          content="Entra a Pulso para retomar tus rudimentos, grooves y racha de práctica."
        />
      </Head>

      {lg ? (
        <View style={styles.aside}>
          <Image
            source={heroImage}
            accessibilityLabel="Batería iluminada en un escenario oscuro"
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, styles.asideImage]}
          />
          <LinearGradient
            colors={[colors.background, "rgba(16, 12, 10, 0.6)", "rgba(16, 12, 10, 0)"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.asideContent}>
            <Text style={styles.brand}>PULSO</Text>
            <View style={styles.asideTitle}>
              <Text style={styles.asideHeading}>Cada sesión cuenta.</Text>
              <GradientText style={styles.asideHeading}>Vuelve al kit.</GradientText>
            </View>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.formSide}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StageGlow />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.formScroll,
            { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 64 },
          ]}
        >
          <View style={styles.formWrap}>
            {lg ? null : <Text style={styles.brand}>PULSO</Text>}
            <Text style={styles.heading}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>Retoma tus rudimentos y mantén tu racha viva.</Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Label>Correo</Label>
                <Input
                  accessibilityLabel="Correo"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  placeholder="baterista@pulso.app"
                  value={form.email}
                  onChangeText={(email) => setForm({ ...form, email })}
                />
              </View>

              <View style={styles.field}>
                <Label>Contraseña</Label>
                <View>
                  <Input
                    accessibilityLabel="Contraseña"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    placeholder="••••••••"
                    returnKeyType="go"
                    value={form.password}
                    onChangeText={(password) => setForm({ ...form, password })}
                    onSubmitEditing={onSubmit}
                    style={styles.passwordInput}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={styles.eye}
                  >
                    {showPassword ? (
                      <EyeOff size={16} color={colors.mutedForeground} />
                    ) : (
                      <Eye size={16} color={colors.mutedForeground} />
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={styles.optionsRow}>
                <Pressable style={styles.remember} onPress={() => setRemember((v) => !v)}>
                  <Checkbox
                    checked={remember}
                    onCheckedChange={setRemember}
                    accessibilityLabel="Recordarme"
                  />
                  <Text style={styles.muted}>Recordarme</Text>
                </Pressable>
                <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button size="lg" disabled={loading} onPress={onSubmit}>
                {loading ? <ActivityIndicator size="small" color={buttonForeground()} /> : null}
                {loading ? "Entrando..." : "Entrar al kit"}
              </Button>
            </View>

            <Text style={styles.footer}>
              ¿Primera vez aquí?{" "}
              <Link href="/" style={styles.link}>
                Explora las lecciones
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: "row",
  },
  aside: {
    flex: 1,
    overflow: "hidden",
  },
  asideImage: {
    width: "100%",
    height: "100%",
  },
  asideContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 48,
  },
  asideTitle: {
    marginTop: 16,
    maxWidth: 384,
  },
  asideHeading: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 0.7,
    color: colors.foreground,
  },
  formSide: {
    flex: 1,
  },
  formScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  formWrap: {
    width: "100%",
    maxWidth: 384,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 24,
    letterSpacing: 2.4,
    color: colors.foreground,
  },
  heading: {
    marginTop: 24,
    fontFamily: fonts.display,
    fontSize: 36,
    letterSpacing: 0.7,
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  form: {
    marginTop: 32,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  passwordInput: {
    paddingRight: 40,
  },
  eye: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  remember: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.primary,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  footer: {
    marginTop: 24,
    fontFamily: fonts.sans,
    fontSize: 14,
    textAlign: "center",
    color: colors.mutedForeground,
  },
});
