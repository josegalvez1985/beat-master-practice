import { useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CalendarPlus, CreditCard, Gift, MessageCircle, UserPlus } from "lucide-react";
import { Button, buttonForeground } from "@/components/ui/button";
import { confirmar } from "@/components/ui/confirmar";
import { DateInput } from "@/components/ui/date-input";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge, Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Stepper } from "@/components/ui/stepper";
import { avisar } from "@/components/ui/toast";
import {
  activarPlan,
  crearPruebasFaltantes,
  habilitarDias,
  verPlanes,
  type PlanProfesorAdmin,
} from "@/lib/admin";
import { formatearDocumento, normalizarDocumento } from "@/lib/documento";
import {
  PLANES,
  alumnosDelPlan,
  formatoFechaPlan,
  guaranies,
  nombreDelPlan,
  type PlanId,
  type PlanPago,
} from "@/lib/planes";
import { formatearTelefono, telefonoWhatsApp } from "@/lib/telefono";
import { colors, fonts, radius } from "@/lib/theme";

// /admin → Planes: each profesor's plan and phone (search by CI or name), the trials missing for
// profesores from before the plans, recording a payment (optionally with its own number of
// alumnos) and granting days as an exception. functions/src/planes.ts does the checks and the
// writes, in transactions. The admin account itself has everything enabled.

const OPCIONES_PLAN = PLANES.map((p) => ({ value: p.id, label: p.nombre }));
const MAX_ALUMNOS = 500;
const MAX_DIAS = 365;
const PY_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

const mensaje = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar. Vuelve a probar.";

function estado(p: PlanProfesorAdmin, ahora = new Date()) {
  if (p.admin) return { texto: "Todo habilitado", tono: "success" as const };
  if (!p.plan || !p.vence || !p.bloqueo) return { texto: "Sin plan", tono: "alerta" as const };
  if (ahora >= new Date(p.bloqueo)) return { texto: "Bloqueado", tono: "alerta" as const };
  if (ahora >= new Date(p.vence)) return { texto: "En gracia", tono: "alerta" as const };
  return {
    texto: p.plan === "prueba" ? "Prueba" : "Activo",
    tono: p.plan === "prueba" ? ("muted" as const) : ("success" as const),
  };
}

export function PlanesAdmin() {
  const queryClient = useQueryClient();
  const consulta = useQuery({ queryKey: ["admin", "planes"], queryFn: verPlanes });
  const [pagando, setPagando] = useState<PlanProfesorAdmin | null>(null);
  const [habilitando, setHabilitando] = useState<PlanProfesorAdmin | null>(null);
  const [creando, setCreando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const profesores = consulta.data?.profesores ?? [];
  const sinPlan = profesores.filter((p) => !p.plan && !p.admin);
  const recargar = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  // By CI (digits, with or without dots) or by name.
  const texto = busqueda.trim().toLowerCase();
  const documento = normalizarDocumento(busqueda);
  const visibles = texto
    ? profesores.filter(
        (p) =>
          (documento.length >= 3 && p.documento.includes(documento)) ||
          p.nombre.toLowerCase().includes(texto),
      )
    : profesores;

  const crearPruebas = async () => {
    const ok = await confirmar({
      titulo: `¿Dar la prueba gratis a ${sinPlan.length} ${sinPlan.length === 1 ? "profesor" : "profesores"}?`,
      mensaje:
        "Se registraron antes de los planes. Cada uno recibe 30 días gratis desde el 2 de noviembre (o desde su registro, si es posterior). No cambia a nadie que ya tenga plan.",
      detalle: sinPlan.map((p) => p.nombre),
      aceptar: "Crear las pruebas",
      icono: UserPlus,
    });
    if (!ok) return;
    setCreando(true);
    try {
      const { creadas } = await crearPruebasFaltantes();
      avisar({
        texto: `Listo: ${creadas} ${creadas === 1 ? "prueba creada" : "pruebas creadas"}.`,
      });
      await recargar();
    } catch (error) {
      avisar({ texto: mensaje(error), tipo: "error" });
    } finally {
      setCreando(false);
    }
  };

  return (
    <>
      <Section
        title="Planes de profesores"
        subtitle="Al recibir un pago en ueno, búscalo por su CI y regístralo: el plan se extiende al instante."
      >
        {consulta.error ? <Text style={styles.error}>{mensaje(consulta.error)}</Text> : null}
        {consulta.isPending ? <ActivityIndicator color={colors.primary} /> : null}

        {sinPlan.length ? (
          <View style={styles.aviso}>
            <Text style={[styles.avisoTexto, styles.info]}>
              {sinPlan.length} {sinPlan.length === 1 ? "profesor no tiene" : "profesores no tienen"}{" "}
              plan y no pueden crear clases ni agregar alumnos.
            </Text>
            <Button size="sm" disabled={creando} onPress={crearPruebas}>
              {creando ? "Creando…" : "Darles la prueba gratis"}
            </Button>
          </View>
        ) : null}

        {profesores.length ? (
          <Input
            accessibilityLabel="Buscar profesor por CI o nombre"
            placeholder="Buscar por CI o nombre"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        ) : null}
        {texto && visibles.length === 0 ? (
          <Text style={styles.detalle}>Ningún profesor con ese CI o nombre.</Text>
        ) : null}

        {visibles.map((p) => {
          const e = estado(p);
          return (
            <View key={p.uid} style={styles.fila}>
              <View style={styles.info}>
                <Text selectable style={styles.nombre}>
                  {p.nombre}
                </Text>
                <Text selectable style={styles.detalle}>
                  CI {formatearDocumento(p.documento)}
                  {p.telefono ? ` · ${formatearTelefono(p.telefono)}` : " · sin celular"}
                </Text>
                {p.admin ? (
                  <Text style={styles.detalle}>
                    Cuenta del administrador: sin vencimiento ni límite.
                  </Text>
                ) : (
                  <Text selectable style={styles.detalle}>
                    {p.plan ? nombreDelPlan(p.plan) : "Sin plan"}
                    {p.vence ? ` · vence ${formatoFechaPlan(new Date(p.vence))}` : ""}
                    {p.bloqueo ? ` · bloqueo ${formatoFechaPlan(new Date(p.bloqueo))}` : ""}
                  </Text>
                )}
                <Text
                  style={[
                    styles.detalle,
                    !p.admin && p.limite > 0 && p.alumnos > p.limite ? styles.alerta : null,
                  ]}
                >
                  {p.alumnos} {p.alumnos === 1 ? "alumno" : "alumnos"}
                  {!p.admin && p.limite ? ` de ${p.limite}${p.aMedida ? " (a medida)" : ""}` : ""}
                </Text>
              </View>
              {e.tono === "alerta" ? (
                <Text style={styles.alerta}>{e.texto}</Text>
              ) : (
                <Badge label={e.texto} tone={e.tono} />
              )}
              <View style={styles.acciones}>
                {p.telefono ? (
                  <Button
                    variant="outline"
                    size="sm"
                    accessibilityLabel={`WhatsApp de ${p.nombre}`}
                    onPress={() =>
                      Linking.openURL(`https://wa.me/${telefonoWhatsApp(p.telefono ?? "")}`)
                    }
                  >
                    <MessageCircle size={14} color={buttonForeground("outline")} />
                  </Button>
                ) : null}
                {p.admin ? null : (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      accessibilityLabel={`Habilitar días a ${p.nombre}`}
                      onPress={() => setHabilitando(p)}
                    >
                      <CalendarPlus size={14} color={buttonForeground("secondary")} />
                      Habilitar días
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      accessibilityLabel={`Registrar pago de ${p.nombre}`}
                      onPress={() => setPagando(p)}
                    >
                      <CreditCard size={14} color={buttonForeground("secondary")} />
                      Registrar pago
                    </Button>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </Section>

      <Section title="Últimos pagos y cortesías">
        {consulta.data && consulta.data.pagos.length === 0 ? (
          <Text style={styles.detalle}>Todavía no hay pagos.</Text>
        ) : null}
        {consulta.data?.pagos.map((pago) => {
          const cortesia = pago.tipo === "cortesia";
          const Icono = cortesia ? Gift : BadgeCheck;
          return (
            <View key={pago.id} style={styles.fila}>
              <Icono size={16} color={cortesia ? colors.primary : colors.success} />
              <View style={styles.info}>
                <Text style={styles.nombre}>
                  {pago.profesor} ·{" "}
                  {cortesia
                    ? "Cortesía"
                    : `${nombreDelPlan(pago.plan as PlanId)} · ${pago.meses} ${pago.meses === 1 ? "mes" : "meses"}`}
                  {pago.alumnos ? ` · ${pago.alumnos} alumnos` : ""}
                </Text>
                <Text selectable style={styles.detalle}>
                  {cortesia ? `Motivo: ${pago.motivo ?? "—"}` : `Ref. ${pago.referencia}`} · hasta{" "}
                  {formatoFechaPlan(new Date(pago.hasta))}
                  {pago.registradoEn
                    ? ` · registrado ${formatoFechaPlan(new Date(pago.registradoEn))}`
                    : ""}
                </Text>
              </View>
              <Text style={styles.nombre}>{guaranies(pago.monto)}</Text>
            </View>
          );
        })}
      </Section>

      {pagando ? (
        <RegistrarPago profesor={pagando} onClose={() => setPagando(null)} onListo={recargar} />
      ) : null}
      {habilitando ? (
        <HabilitarDias
          profesor={habilitando}
          onClose={() => setHabilitando(null)}
          onListo={recargar}
        />
      ) : null}
    </>
  );
}

const precioDe = (plan: PlanPago) => PLANES.find((p) => p.id === plan)?.precio ?? 0;

function RegistrarPago({
  profesor,
  onClose,
  onListo,
}: {
  profesor: PlanProfesorAdmin;
  onClose: () => void;
  onListo: () => Promise<void>;
}) {
  const inicial = PLANES.find((p) => p.id === profesor.plan)?.id ?? "profesor";
  const [plan, setPlan] = useState<PlanPago>(inicial);
  const [meses, setMeses] = useState(1);
  const [monto, setMonto] = useState(String(precioDe(inicial)));
  // Its own number of alumnos (a medida) keeps the current one; otherwise it follows the plan.
  const [alumnos, setAlumnos] = useState(
    profesor.aMedida ? profesor.limite : alumnosDelPlan(inicial),
  );
  const [alumnosTocados, setAlumnosTocados] = useState(profesor.aMedida);
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (nuevoPlan: PlanPago, nuevosMeses: number) => {
    setPlan(nuevoPlan);
    setMeses(nuevosMeses);
    setMonto(String(precioDe(nuevoPlan) * nuevosMeses));
    if (!alumnosTocados) setAlumnos(alumnosDelPlan(nuevoPlan));
  };

  const delPlan = alumnosDelPlan(plan);
  const aMedida = alumnos !== delPlan;
  const montoNumero = Number(monto.replace(/\D/g, ""));

  const registrar = async () => {
    setError(null);
    if (!montoNumero) return setError("Escribe el monto que recibiste.");
    if (referencia.trim().length < 3)
      return setError(
        "Escribe la referencia del pago (por ejemplo, el número de la transferencia).",
      );
    const ok = await confirmar({
      titulo: `¿Activar ${nombreDelPlan(plan)} a ${profesor.nombre}?`,
      mensaje: "Se registra el pago y el plan se extiende al instante.",
      detalle: [
        `${meses} ${meses === 1 ? "mes" : "meses"} · ${guaranies(montoNumero)}`,
        aMedida
          ? `Hasta ${alumnos} alumnos (a medida; el plan trae ${delPlan})`
          : `Hasta ${alumnos} alumnos`,
        `Referencia: ${referencia.trim()}`,
        ...(profesor.alumnos > alumnos
          ? [`Ya tiene ${profesor.alumnos} alumnos: no podrá agregar más.`]
          : []),
      ],
      aceptar: "Registrar y activar",
      icono: CreditCard,
    });
    if (!ok) return;
    setEnviando(true);
    try {
      const { hasta } = await activarPlan({
        profesorId: profesor.uid,
        plan,
        meses,
        monto: montoNumero,
        referencia: referencia.trim(),
        alumnos: aMedida ? alumnos : null,
      });
      avisar({
        texto: `${profesor.nombre}: ${nombreDelPlan(plan)} hasta el ${formatoFechaPlan(new Date(hasta))}.`,
      });
      await onListo();
      onClose();
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog
      visible
      onClose={onClose}
      title="Registrar pago"
      description={`${profesor.nombre} · CI ${formatearDocumento(profesor.documento)}. Si todavía tiene días de plan, los meses se suman al final; si ya estaba bloqueado, empiezan hoy.`}
    >
      <View style={styles.formulario}>
        <View style={styles.campo}>
          <Label>Plan</Label>
          <Segmented value={plan} options={OPCIONES_PLAN} onChange={(p) => cambiar(p, meses)} />
        </View>
        <View style={styles.campo}>
          <Label>Meses</Label>
          <Stepper
            label="meses"
            value={meses}
            min={1}
            max={12}
            onChange={(m) => cambiar(plan, m)}
          />
        </View>
        <View style={styles.campo}>
          <Label>Cantidad de alumnos</Label>
          <Stepper
            label="alumnos"
            value={alumnos}
            min={1}
            max={MAX_ALUMNOS}
            onChange={(n) => {
              setAlumnos(n);
              setAlumnosTocados(true);
            }}
          />
          <Text style={styles.detalle}>
            {aMedida
              ? `A medida: el plan ${nombreDelPlan(plan)} trae ${delPlan}. Tiene hoy ${profesor.alumnos}.`
              : `La del plan. Tiene hoy ${profesor.alumnos}. Cámbiala si pagó por otra cantidad.`}
          </Text>
        </View>
        <View style={styles.campo}>
          <Label>Monto recibido (Gs.)</Label>
          <Input
            accessibilityLabel="Monto recibido"
            keyboardType="number-pad"
            value={monto}
            onChangeText={setMonto}
          />
        </View>
        <View style={styles.campo}>
          <Label>Referencia del pago</Label>
          <Input
            accessibilityLabel="Referencia del pago"
            placeholder="Nro. de transferencia o comprobante"
            value={referencia}
            onChangeText={setReferencia}
            maxLength={80}
          />
          <Text style={styles.detalle}>
            Con la misma referencia no se puede registrar dos veces el mismo pago.
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button size="lg" disabled={enviando} onPress={registrar}>
          {enviando ? "Registrando…" : "Registrar pago"}
        </Button>
      </View>
    </Dialog>
  );
}

// "2026-12-15" in Paraguay: the end of that day, as habilitarDias computes it.
const finDelDia = (fecha: string) => {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, 23, 59, 59) + PY_MS);
};
const hoyEnParaguay = () => new Date(Date.now() - PY_MS).toISOString().slice(0, 10);

function HabilitarDias({
  profesor,
  onClose,
  onListo,
}: {
  profesor: PlanProfesorAdmin;
  onClose: () => void;
  onListo: () => Promise<void>;
}) {
  const [modo, setModo] = useState<"dias" | "fecha">("dias");
  const [dias, setDias] = useState(7);
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // The time the dialog opened: the preview does not move while it is open.
  const [ahora] = useState(() => Date.now());

  // Same as the function: from today if it already expired, from its due date if not.
  const vence = profesor.vence ? new Date(profesor.vence).getTime() : 0;
  const desde = new Date(Math.max(ahora, vence));
  const hasta =
    modo === "dias" ? new Date(desde.getTime() + dias * DIA_MS) : fecha ? finDelDia(fecha) : null;
  const valida = hasta !== null && hasta > desde;

  const habilitar = async () => {
    setError(null);
    if (!hasta) return setError("Elige la fecha.");
    if (!valida)
      return setError(
        `Ya está habilitado hasta el ${formatoFechaPlan(desde)}: elige una fecha posterior.`,
      );
    if (motivo.trim().length < 3) return setError("Escribe el motivo.");
    const ok = await confirmar({
      titulo: `¿Habilitar a ${profesor.nombre} hasta el ${formatoFechaPlan(hasta)}?`,
      mensaje: "Es una excepción sin pago: mantiene su plan y su cantidad de alumnos.",
      detalle: [`Motivo: ${motivo.trim()}`, "Queda en el historial como cortesía (Gs. 0)."],
      aceptar: "Habilitar",
      icono: Gift,
    });
    if (!ok) return;
    setEnviando(true);
    try {
      const resultado = await habilitarDias(
        modo === "dias"
          ? { profesorId: profesor.uid, motivo: motivo.trim(), dias }
          : { profesorId: profesor.uid, motivo: motivo.trim(), hasta: fecha },
      );
      avisar({
        texto: `${profesor.nombre}: habilitado hasta el ${formatoFechaPlan(new Date(resultado.hasta))}.`,
      });
      await onListo();
      onClose();
    } catch (e) {
      setError(mensaje(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog
      visible
      onClose={onClose}
      title="Habilitar días"
      description={`${profesor.nombre} · CI ${formatearDocumento(profesor.documento)}. Para casos excepcionales, sin pago. ${
        profesor.vence
          ? `Hoy vence el ${formatoFechaPlan(new Date(profesor.vence))}.`
          : "Todavía no tiene plan."
      }`}
    >
      <View style={styles.formulario}>
        <Segmented
          value={modo}
          options={[
            { value: "dias", label: "Cantidad de días" },
            { value: "fecha", label: "Hasta una fecha" },
          ]}
          onChange={setModo}
        />
        {modo === "dias" ? (
          <View style={styles.campo}>
            <Label>Días más</Label>
            <Stepper label="días" value={dias} min={1} max={MAX_DIAS} onChange={setDias} />
          </View>
        ) : (
          <View style={styles.campo}>
            <Label>Hasta el día (inclusive)</Label>
            <DateInput
              label="Hasta el día"
              value={fecha}
              min={hoyEnParaguay()}
              onChange={setFecha}
            />
          </View>
        )}
        <View style={styles.campo}>
          <Label>Motivo</Label>
          <Input
            accessibilityLabel="Motivo"
            placeholder="Ej. paga el lunes; problema con su banco"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={200}
          />
          <Text style={styles.detalle}>El profesor también lo ve en su historial de pagos.</Text>
        </View>
        {hasta && valida ? (
          <Text style={styles.resultado}>
            Quedará habilitado hasta el {formatoFechaPlan(hasta)}.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button size="lg" disabled={enviando} onPress={habilitar}>
          {enviando ? "Habilitando…" : "Habilitar"}
        </Button>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  // The text of a row: takes the free width, and on a phone (under ~220 px left) the status and
  // the buttons go below it instead of squeezing it into a thin column.
  info: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 220,
    minWidth: 0,
  },
  aviso: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  avisoTexto: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  nombre: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  detalle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    wordBreak: "break-word",
  } as object,
  alerta: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.destructive,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.destructive,
  },
  resultado: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  formulario: {
    marginTop: 16,
    gap: 14,
  },
  campo: {
    gap: 6,
  },
});
