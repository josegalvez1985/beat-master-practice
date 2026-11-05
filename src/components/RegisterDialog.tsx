import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { GraduationCap, Presentation } from "lucide-react";
import { authStyles } from "@/components/AuthLayout";
import { Button, buttonForeground } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizarTelefono } from "@/lib/telefono";
import { PasswordInput } from "@/components/ui/password-input";
import { mensajeDeError, register, type Role } from "@/lib/auth";
import { documentoValido, normalizarDocumento } from "@/lib/documento";
import { instruments, type InstrumentId } from "@/lib/instruments";
import { colors, fonts, radius, shared } from "@/lib/theme";

const roles = [
  { id: "profesor", title: "Profesor", description: "Quiero enseñar", icon: Presentation },
  { id: "alumno", title: "Alumno", description: "Quiero aprender", icon: GraduationCap },
] as const;

// `rolInicial`: from a profesor's invitation (?modal=registro&rol=alumno). Otherwise nothing is
// chosen: the role never changes and the document stays taken, so it must be a decision.
export function RegisterDialog({
  visible,
  onClose,
  rolInicial,
}: {
  visible: boolean;
  onClose: () => void;
  rolInicial?: Role;
}) {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title="Crear cuenta"
      description="Enseña o aprende música a tu ritmo."
    >
      <RegisterForm onClose={onClose} rolInicial={rolInicial} />
    </Dialog>
  );
}

// Lives inside the dialog so its state resets every time the dialog opens.
function RegisterForm({ onClose, rolInicial }: { onClose: () => void; rolInicial?: Role }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(rolInicial ?? null);
  const [selected, setSelected] = useState<InstrumentId[]>([]);
  const [form, setForm] = useState({
    name: "",
    documento: "",
    email: "",
    password: "",
    telefono: "",
  });

  const toggleInstrument = (id: InstrumentId) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  const onSubmit = async () => {
    const nroDocumento = normalizarDocumento(form.documento);
    if (!role) {
      setError("Elige si eres profesor o alumno.");
      return;
    }
    if (form.name.trim().length < 2) {
      setError("Escribe tu nombre y apellido.");
      return;
    }
    if (!documentoValido(nroDocumento)) {
      setError("Escribe tu número de documento (solo números, de 5 a 10 dígitos).");
      return;
    }
    if (!form.email.includes("@") || form.password.length < 6) {
      setError("Revisa tu correo y usa una contraseña de al menos 6 caracteres.");
      return;
    }
    // Profesores only: a Paraguayan mobile, seen only by them and the admin.
    const telefono = role === "profesor" ? normalizarTelefono(form.telefono) : undefined;
    if (role === "profesor" && !telefono) {
      setError("Escribe tu celular de Paraguay (por ejemplo, 0981 123 456).");
      return;
    }
    if (selected.length === 0) {
      setError("Elige al menos un instrumento.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // RequireAuth shows the home as soon as the new session is ready.
      await register({
        rol: role,
        nombre: form.name.trim().replace(/\s+/g, " "),
        nro_documento: nroDocumento,
        email: form.email.trim(),
        password: form.password,
        instrumentos: selected,
        telefono: telefono ?? undefined,
      });
    } catch (e) {
      setError(mensajeDeError(e));
      setLoading(false);
    }
  };

  return (
    <>
      <View style={styles.form}>
        <View style={authStyles.field}>
          <Label>¿Eres profesor o alumno?</Label>
          <View accessibilityRole="radiogroup" style={styles.roles}>
            {roles.map((option) => {
              const active = role === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  aria-checked={active}
                  onPress={() => setRole(option.id)}
                  style={[shared.panel, styles.role, active && styles.roleActive]}
                >
                  <option.icon size={20} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={styles.roleTitle}>{option.title}</Text>
                  <Text style={authStyles.muted}>{option.description}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={authStyles.field}>
          <Label>Nombre y apellido</Label>
          <Input
            accessibilityLabel="Nombre y apellido"
            autoComplete="name"
            placeholder="Ej. María González"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
          />
        </View>

        <View style={authStyles.field}>
          <Label>Nro. de documento</Label>
          <Input
            accessibilityLabel="Número de documento"
            inputMode="numeric"
            autoComplete="username"
            placeholder="Ej. 4567890"
            value={form.documento}
            onChangeText={(documento) => setForm({ ...form, documento })}
          />
          <Text style={styles.hint}>
            {role === "alumno"
              ? "Con este número entras a Pulso y tu profesor te agrega a su lista."
              : "Con este número entras a Pulso."}
          </Text>
        </View>

        {role === "profesor" ? (
          <View style={authStyles.field}>
            <Label>Celular</Label>
            <Input
              accessibilityLabel="Celular"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Ej. 0981 123 456"
              value={form.telefono}
              onChangeText={(telefono) => setForm({ ...form, telefono })}
            />
            <Text style={styles.hint}>
              Solo lo ve el equipo de Pulso, para avisarte sobre tu plan.
            </Text>
          </View>
        ) : null}

        <View style={authStyles.field}>
          <Label>Correo</Label>
          <Input
            accessibilityLabel="Correo"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            placeholder="tu@correo.com"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
          />
        </View>

        <View style={authStyles.field}>
          <Label>Contraseña</Label>
          <PasswordInput
            accessibilityLabel="Contraseña"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
          />
        </View>

        <View style={authStyles.field}>
          <Label>
            {role === "alumno"
              ? "¿Qué instrumentos estudias?"
              : role === "profesor"
                ? "¿Qué instrumentos enseñas?"
                : "¿Qué instrumentos?"}
          </Label>
          <View style={styles.instruments}>
            {instruments.map((instrument) => (
              <Chip
                key={instrument.id}
                label={instrument.name}
                icon={instrument.icon}
                selected={selected.includes(instrument.id)}
                onPress={() => toggleInstrument(instrument.id)}
              />
            ))}
          </View>
        </View>

        {error ? <Text style={authStyles.error}>{error}</Text> : null}

        <Button size="lg" disabled={loading} onPress={onSubmit}>
          {loading ? <ActivityIndicator size="small" color={buttonForeground()} /> : null}
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </View>

      <Text style={authStyles.footer}>
        ¿Ya tienes cuenta?{" "}
        <Text accessibilityRole="button" onPress={onClose} style={authStyles.link}>
          Inicia sesión
        </Text>
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: 24,
    gap: 20,
  },
  roles: {
    flexDirection: "row",
    gap: 12,
  },
  role: {
    flex: 1,
    gap: 6,
    borderRadius: radius.xl,
    padding: 16,
  },
  roleActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(249, 161, 41, 0.12)",
  },
  roleTitle: {
    marginTop: 4,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.foreground,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  instruments: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
