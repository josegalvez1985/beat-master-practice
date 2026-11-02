import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { Check, MessageCircle } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { PageMeta } from "@/components/PageMeta";
import { usePlanProfesor } from "@/components/PlanAviso";
import { Button, buttonForeground } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge, Section } from "@/components/ui/section";
import { usePerfil } from "@/lib/auth";
import { useInscripcionesProfesor, usePagos } from "@/lib/data";
import { DATOS_DE_PAGO, pagoConfigurado } from "@/lib/datos-de-pago";
import { formatearDocumento } from "@/lib/documento";
import {
  DIAS_DE_PRUEBA,
  DIAS_HABILES_DE_GRACIA,
  PLANES,
  formatoFechaPlan,
  guaranies,
  nombreDelPlan,
} from "@/lib/planes";
import { colors, fonts, radius } from "@/lib/theme";

// /plan (profesores): the plan, its due date, the plans and how to pay. Payments are made to
// Pulso's ueno account and activated by hand in /admin (activarPlan).
export default function MiPlan() {
  const perfil = usePerfil();
  const plan = usePlanProfesor(perfil.uid);
  const inscripciones = useInscripcionesProfesor(perfil.uid);
  const pagos = usePagos(perfil.uid);
  const alumnos = new Set(inscripciones.data.map((i) => i.alumnoId)).size;
  const concepto = `Pulso ${formatearDocumento(perfil.nro_documento)}`;

  return (
    <>
      <PageMeta title="Mi plan — Pulso" description="Tu plan, su vencimiento y cómo pagarlo." />
      <View>
        <Text style={shellStyles.pageTitle}>Mi plan</Text>
        <Text style={shellStyles.pageSubtitle}>
          Pagas según cuántos alumnos tienes. Para tus alumnos Pulso es gratis.
        </Text>
      </View>

      <Section
        title="Tu plan"
        actions={plan.nombre ? <Badge label={plan.nombre} tone="primary" /> : undefined}
      >
        {plan.loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={styles.estado}>
            <Text style={styles.estadoTexto}>{textoDelEstado(plan)}</Text>
            {plan.limite ? (
              <View style={styles.uso}>
                <Text style={styles.muted}>
                  {alumnos} de {plan.limite} alumnos
                  {plan.aMedida ? " (cantidad a medida)" : ""}
                  {alumnos > plan.limite ? " · no puedes agregar más hasta cambiar de plan" : ""}
                </Text>
                <Progress value={Math.min(100, (alumnos / plan.limite) * 100)} />
              </View>
            ) : null}
            <Text style={styles.nota}>
              Al vencer tienes {DIAS_HABILES_DE_GRACIA} días hábiles para pagar. Después no puedes
              crear clases, agregar alumnos ni subir archivos, pero nada se borra: lo que ya tienes
              sigue ahí, y tus alumnos siguen practicando y entregando.
            </Text>
          </View>
        )}
      </Section>

      <Section
        title="Planes"
        subtitle={`Todos incluyen Pulso completo. Al registrarte tienes ${DIAS_DE_PRUEBA} días gratis.`}
      >
        <View style={styles.planes}>
          {PLANES.map((p) => {
            const actual = plan.plan === p.id;
            const noAlcanza = alumnos > p.alumnos;
            return (
              <View key={p.id} style={[styles.plan, actual && styles.planActual]}>
                <View style={styles.planCabecera}>
                  <Text style={styles.planNombre}>{p.nombre}</Text>
                  {actual ? <Badge label="Tu plan" tone="primary" /> : null}
                </View>
                <Text style={styles.precio}>{guaranies(p.precio)}</Text>
                <Text style={styles.muted}>por mes</Text>
                <View style={styles.incluye}>
                  <Linea texto={`Hasta ${p.alumnos} alumnos`} />
                  <Linea texto="Clases, plan por bloques y entregas" />
                  <Linea texto="Herramientas y asistente" />
                </View>
                {noAlcanza ? (
                  <Text style={styles.noAlcanza}>
                    Tienes {alumnos} alumnos: este plan no alcanza.
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
        <Text style={styles.nota}>
          Cada alumno cuenta una vez, aunque le enseñes varios instrumentos.
        </Text>
      </Section>

      <Section title="Cómo pagar">
        {pagoConfigurado() ? (
          <View style={styles.pasos}>
            <Paso numero={1} texto="Elige tu plan y transfiere el monto a esta cuenta:" />
            <View style={styles.datos}>
              {(
                [
                  ["Banco", DATOS_DE_PAGO.banco],
                  ["Titular", DATOS_DE_PAGO.titular],
                  ["Alias", DATOS_DE_PAGO.alias],
                  ["Cuenta", DATOS_DE_PAGO.cuenta],
                ] as const
              )
                .filter(([, valor]) => valor)
                .map(([etiqueta, valor]) => (
                  <View key={etiqueta} style={styles.dato}>
                    <Text style={styles.muted}>{etiqueta}</Text>
                    <Text selectable style={styles.datoValor}>
                      {valor}
                    </Text>
                  </View>
                ))}
            </View>
            <Paso numero={2} texto={`En el concepto escribe: ${concepto}`} />
            {DATOS_DE_PAGO.whatsapp ? (
              <>
                <Paso numero={3} texto="Envíanos el comprobante por WhatsApp." />
                <Button
                  variant="secondary"
                  style={styles.whatsapp}
                  onPress={() =>
                    Linking.openURL(
                      `https://wa.me/${DATOS_DE_PAGO.whatsapp}?text=${encodeURIComponent(
                        `Hola, pagué mi plan de Pulso. ${concepto}`,
                      )}`,
                    )
                  }
                >
                  <MessageCircle size={16} color={buttonForeground("secondary")} />
                  Enviar comprobante
                </Button>
              </>
            ) : null}
            <Paso
              numero={DATOS_DE_PAGO.whatsapp ? 4 : 3}
              texto="Activamos tu plan apenas vemos el pago, y lo ves aquí con su nueva fecha."
            />
          </View>
        ) : (
          <Text style={styles.muted}>
            Los datos de pago todavía no están configurados. Si quieres renovar tu plan, escríbenos
            desde Mi perfil → Ayuda y contacto.
          </Text>
        )}
      </Section>

      <Section title="Tus pagos">
        {pagos.data.length === 0 ? (
          <Text style={styles.muted}>Todavía no hay pagos registrados.</Text>
        ) : (
          pagos.data.map((pago) => (
            <View key={pago.id} style={styles.pago}>
              <View style={styles.flex}>
                <Text style={styles.pagoTitulo}>
                  {pago.tipo === "cortesia"
                    ? "Días de cortesía"
                    : `${nombreDelPlan(pago.plan)} · ${pago.meses} ${pago.meses === 1 ? "mes" : "meses"}`}
                  {pago.alumnos ? ` · ${pago.alumnos} alumnos` : ""}
                </Text>
                <Text style={styles.muted}>
                  Hasta el {formatoFechaPlan(pago.hasta.toDate())} ·{" "}
                  {pago.tipo === "cortesia" ? pago.motivo : `Ref. ${pago.referencia}`}
                </Text>
              </View>
              <Text style={styles.pagoMonto}>{guaranies(pago.monto)}</Text>
            </View>
          ))
        )}
      </Section>
    </>
  );
}

function textoDelEstado(plan: ReturnType<typeof usePlanProfesor>) {
  if (plan.ilimitado)
    return "Tienes todo habilitado: es la cuenta del administrador, sin vencimiento ni límite de alumnos.";
  const vence = plan.vence ? formatoFechaPlan(plan.vence) : null;
  const bloqueo = plan.bloqueo ? formatoFechaPlan(plan.bloqueo) : null;
  switch (plan.estado) {
    case "prueba":
      return `Estás en tu prueba gratis hasta el ${vence}.`;
    case "activo":
      return `Tu plan ${plan.nombre} está activo hasta el ${vence}.`;
    case "gracia":
      return `Tu plan venció el ${vence}. Tienes hasta el ${bloqueo} para pagar.`;
    default:
      return bloqueo
        ? `Tu plan está vencido desde el ${vence}. Desde el ${bloqueo} no puedes crear clases, agregar alumnos ni subir archivos.`
        : "Todavía no tienes un plan activo: no puedes crear clases, agregar alumnos ni subir archivos.";
  }
}

function Linea({ texto }: { texto: string }) {
  return (
    <View style={styles.linea}>
      <Check size={14} color={colors.primary} />
      <Text style={styles.lineaTexto}>{texto}</Text>
    </View>
  );
}

function Paso({ numero, texto }: { numero: number; texto: string }) {
  return (
    <View style={styles.paso}>
      <Text style={styles.pasoNumero}>{numero}</Text>
      <Text selectable style={styles.pasoTexto}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  estado: {
    gap: 12,
  },
  estadoTexto: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.foreground,
  },
  uso: {
    gap: 6,
  },
  muted: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  nota: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  planes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  plan: {
    flexGrow: 1,
    flexBasis: 200,
    gap: 2,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  planActual: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  planCabecera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  planNombre: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.foreground,
  },
  precio: {
    marginTop: 6,
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.foreground,
  },
  incluye: {
    marginTop: 10,
    gap: 6,
  },
  linea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lineaTexto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.foreground,
  },
  noAlcanza: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.destructive,
  },
  pasos: {
    gap: 12,
  },
  paso: {
    flexDirection: "row",
    gap: 10,
  },
  pasoNumero: {
    width: 18,
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.primary,
  },
  pasoTexto: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    color: colors.foreground,
  },
  datos: {
    marginLeft: 28,
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  dato: {
    gap: 2,
  },
  datoValor: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.foreground,
  },
  whatsapp: {
    alignSelf: "flex-start",
    marginLeft: 28,
  },
  pago: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pagoTitulo: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  pagoMonto: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
});
