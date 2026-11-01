import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Copy, MessageCircle, Printer, Users } from "lucide-react";
import { Button, buttonForeground } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { avisar } from "@/components/ui/toast";
import {
  progreso,
  useDiarioDe,
  type Clase,
  type Entrega,
  type Inscripcion,
  type Logros,
} from "@/lib/data";
import { formatoLargo, hoy, sumarDias } from "@/lib/dates";
import { instrumento } from "@/lib/instruments";
import { habilidades } from "@/lib/rubrica";
import { avanceDeNivel, nivelLabel, rutaPara, type Nivel } from "@/lib/ruta";
import { SITE_URL } from "@/lib/site";
import { colors, fonts, radius } from "@/lib/theme";

// A short report for the family (parents, tutors): progress, attendance, practice of the last
// 30 days, level and skills. Plain text to send by WhatsApp, copy or print; nothing is stored
// and no one else gets access to the account.
export function InformeFamilia({
  inscripcion,
  clases,
  entregas,
  logros,
}: {
  inscripcion: Inscripcion;
  clases: Clase[];
  entregas: Entrega[];
  logros: Logros | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" style={styles.boton} onPress={() => setAbierto(true)}>
        <Users size={14} color={buttonForeground("secondary")} />
        Informe para la familia
      </Button>
      {abierto ? (
        <Dialog
          visible
          onClose={() => setAbierto(false)}
          title="Informe para la familia"
          description="Envíalo por WhatsApp, cópialo o imprímelo. No se guarda en ningún lado."
        >
          <Contenido
            inscripcion={inscripcion}
            clases={clases}
            entregas={entregas}
            logros={logros}
          />
        </Dialog>
      ) : null}
    </>
  );
}

function Contenido({
  inscripcion,
  clases,
  entregas,
  logros,
}: {
  inscripcion: Inscripcion;
  clases: Clase[];
  entregas: Entrega[];
  logros: Logros | undefined;
}) {
  const diario = useDiarioDe(inscripcion.alumnoId, inscripcion.instrumento);
  const texto = textoDelInforme({ inscripcion, clases, entregas, logros, diario: diario.data });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar({ texto: "Informe copiado." });
    } catch {
      avisar({ texto: "No se pudo copiar. Selecciona el texto y cópialo.", tipo: "error" });
    }
  };

  // A plain page with the text only, so it prints on white paper whatever the theme.
  const imprimir = () => {
    const ventana = window.open("", "_blank");
    if (!ventana) return;
    const pre = ventana.document.createElement("pre");
    pre.textContent = texto;
    pre.style.cssText =
      "font: 15px/1.6 system-ui, sans-serif; white-space: pre-wrap; margin: 32px;";
    ventana.document.title = `Informe de ${inscripcion.alumnoNombre}`;
    ventana.document.body.appendChild(pre);
    ventana.print();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.papel}>
        <Text style={styles.texto} selectable>
          {texto}
        </Text>
      </View>
      <View style={styles.acciones}>
        <Pressable
          accessibilityRole="link"
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
          hrefAttrs={{ target: "_blank", rel: "noopener" }}
          style={styles.whatsapp}
        >
          <MessageCircle size={16} color={colors.primaryForeground} />
          <Text style={styles.whatsappTexto}>Enviar por WhatsApp</Text>
        </Pressable>
        <Button variant="secondary" onPress={copiar}>
          <Copy size={14} color={buttonForeground("secondary")} />
          Copiar
        </Button>
        <Button variant="secondary" onPress={imprimir}>
          <Printer size={14} color={buttonForeground("secondary")} />
          Imprimir
        </Button>
      </View>
    </View>
  );
}

export function textoDelInforme({
  inscripcion,
  clases,
  entregas,
  logros,
  diario,
}: {
  inscripcion: Inscripcion;
  clases: Clase[];
  entregas: Entrega[];
  logros: Logros | undefined;
  diario: { fecha: string; minutos: number }[];
}) {
  const nombreInstrumento = instrumento(inscripcion.instrumento).name;
  const fechaHoy = hoy();
  const desde = sumarDias(fechaHoy, -29);
  const propias = clases.filter(
    (c) => c.instrumento === inscripcion.instrumento && c.profesorId === inscripcion.profesorId,
  );
  const suyas = entregas.filter((e) => e.alumnoId === inscripcion.alumnoId);
  const p = progreso(propias, suyas, inscripcion.alumnoId, inscripcion.instrumento);

  const marcadas = propias.filter((c) => c.asistencia?.[inscripcion.alumnoId]);
  const presentes = marcadas.filter((c) => c.asistencia![inscripcion.alumnoId] !== "ausente");

  const recientes = diario.filter((e) => e.fecha >= desde && e.fecha <= fechaHoy);
  const minutos = recientes.reduce((t, e) => t + e.minutos, 0);
  const dias = new Set(recientes.map((e) => e.fecha)).size;

  const nivel = (logros?.nivel ?? "inicial") as Nivel;
  const objetivos = rutaPara(inscripcion.instrumento)[nivel] ?? [];
  const cumplidos = objetivos.filter((o) => logros?.cumplidos.includes(o.id));
  const pendientes = objetivos.filter((o) => !logros?.cumplidos.includes(o.id));

  const notas = habilidades(inscripcion.instrumento, suyas).filter((h) => h.promedio !== null);
  const ultima = suyas
    .filter((e) => e.evaluacion?.comentario)
    .sort((a, b) => b.evaluacion!.fecha - a.evaluacion!.fecha)[0];

  const lineas = [
    `Informe de ${inscripcion.alumnoNombre} — ${nombreInstrumento}`,
    `Prof. ${inscripcion.profesorNombre} · ${formatoLargo(fechaHoy)}`,
    "",
    `• Clases: ${p.hechas} de ${p.total} entregadas (${p.porcentaje}%)`,
    marcadas.length ? `• Asistencia: ${presentes.length} de ${marcadas.length} clases` : null,
    `• Práctica en los últimos 30 días: ${Math.floor(minutos / 60)} h ${minutos % 60} min, en ${dias} ${dias === 1 ? "día" : "días"}`,
    `• Nivel ${nivelLabel(nivel).toLowerCase()}: ${cumplidos.length} de ${objetivos.length} objetivos (${avanceDeNivel(inscripcion.instrumento, nivel, logros?.cumplidos ?? [])}%)`,
    ...cumplidos.map((o) => `   ✓ ${o.texto}`),
    ...(pendientes.length ? [`   Lo próximo: ${pendientes[0]!.texto}`] : []),
    notas.length
      ? `• Habilidades (de 1 a 5): ${notas.map((h) => `${h.criterio.label} ${h.promedio!.toFixed(1).replace(".", ",")}`).join(" · ")}`
      : null,
    ultima ? `• Última devolución: “${ultima.evaluacion!.comentario}”` : null,
    "",
    `Pulso · ${SITE_URL.replace("https://", "")}`,
  ];
  return lineas.filter((l): l is string => l !== null).join("\n");
}

const styles = StyleSheet.create({
  boton: {
    alignSelf: "flex-start",
  },
  wrap: {
    marginTop: 16,
    gap: 14,
  },
  papel: {
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.foreground,
  },
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  // The main action: solid amber.
  whatsapp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  whatsappTexto: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.primaryForeground,
  },
});
