import { StyleSheet, Text, View } from "react-native";
import { AlertTriangle, Clock } from "lucide-react";
import { Link } from "@/components/Link";
import { Button } from "@/components/ui/button";
import { esAdmin } from "@/lib/admin";
import { usePerfil } from "@/lib/auth";
import { useSuscripcion } from "@/lib/data";
import { diasHasta, estadoDelPlan, formatoFechaPlan, nombreDelPlan } from "@/lib/planes";
import { colors, fonts, radius } from "@/lib/theme";

// The profesor's plan as the app sees it. The rules decide on their own (firestore.rules,
// storage.rules); this only lets the screens explain it and hide what would be rejected.
export function usePlanProfesor(uid: string | null) {
  const perfil = usePerfil();
  // The admin account has everything enabled (also in the rules and in agregarAlumno).
  const ilimitado = esAdmin(perfil) && perfil.uid === uid;
  const suscripcion = useSuscripcion(ilimitado ? null : uid);
  const estado = estadoDelPlan(suscripcion.data);
  if (ilimitado)
    return {
      loading: false,
      ...estado,
      estado: "activo" as const,
      vence: null,
      bloqueo: null,
      limite: 0,
      nombre: "Administrador",
      ilimitado: true,
      bloqueado: false,
    };
  return {
    loading: suscripcion.loading,
    ...estado,
    nombre: estado.plan ? nombreDelPlan(estado.plan) : null,
    ilimitado: false,
    // While loading, nothing is blocked: the rules still have the last word.
    bloqueado: !suscripcion.loading && estado.estado === "bloqueado",
  };
}

const DIAS_DE_AVISO = 7;

// Shown at the top of the profesor's screens only when it matters: 7 days or less left, the
// grace days, or blocked.
export function AvisoPlan({ uid }: { uid: string }) {
  const plan = usePlanProfesor(uid);
  if (plan.loading) return null;

  let titulo: string;
  let texto: string;
  const urgente = plan.estado === "bloqueado";
  if (plan.estado === "bloqueado") {
    titulo = "Tu plan está vencido";
    texto = plan.bloqueo
      ? `Desde el ${formatoFechaPlan(plan.bloqueo)} no puedes crear clases, agregar alumnos ni subir archivos. Todo lo que ya tienes sigue igual: renueva tu plan para seguir creando.`
      : "No puedes crear clases, agregar alumnos ni subir archivos hasta activar tu plan. Todo lo que ya tienes sigue igual.";
  } else if (plan.estado === "gracia" && plan.vence && plan.bloqueo) {
    titulo = "Tu plan venció";
    texto = `Venció el ${formatoFechaPlan(plan.vence)}. Tienes hasta el ${formatoFechaPlan(plan.bloqueo)} para pagar; después no podrás crear clases, agregar alumnos ni subir archivos.`;
  } else if (plan.vence && diasHasta(plan.vence) <= DIAS_DE_AVISO) {
    const dias = diasHasta(plan.vence);
    titulo =
      plan.estado === "prueba" ? "Tu prueba gratis está por terminar" : "Tu plan está por vencer";
    texto = `${plan.nombre} vence el ${formatoFechaPlan(plan.vence)} (${dias === 1 ? "mañana" : `en ${dias} días`}). Renuévalo para seguir sin cortes.`;
  } else {
    return null;
  }

  const Icono = urgente ? AlertTriangle : Clock;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.aviso, urgente ? styles.avisoUrgente : styles.avisoNormal]}
    >
      <Icono size={20} color={urgente ? colors.destructive : colors.primary} />
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.texto}>{texto}</Text>
      </View>
      <Link href="/plan">
        <Button variant={urgente ? "default" : "secondary"} size="sm">
          {urgente ? "Renovar mi plan" : "Ver mi plan"}
        </Button>
      </Link>
    </View>
  );
}

// One line for the screens that create: why the button is not there.
export function BloqueadoPorPlan({ que }: { que: string }) {
  return (
    <View style={[styles.aviso, styles.avisoUrgente]}>
      <AlertTriangle size={18} color={colors.destructive} />
      <Text style={[styles.texto, styles.textos]}>
        Con tu plan vencido no puedes {que}. Renuévalo en Mi plan.
      </Text>
      <Link href="/plan">
        <Button variant="secondary" size="sm">
          Mi plan
        </Button>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  avisoNormal: {
    borderColor: colors.primary,
    backgroundColor: "rgba(249, 161, 41, 0.10)",
  },
  avisoUrgente: {
    borderColor: colors.destructive,
    backgroundColor: colors.muted,
  },
  textos: {
    flex: 1,
    minWidth: 200,
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
});
