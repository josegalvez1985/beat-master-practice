import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CheckCheck, MessageCircle, Undo2 } from "lucide-react";
import { MaterialList } from "@/components/Materials";
import { MensajesClase } from "@/components/MensajesClase";
import { RubricaEditor } from "@/components/Rubrica";
import { Button, buttonForeground } from "@/components/ui/button";
import { avisar } from "@/components/ui/toast";
import type { Perfil } from "@/lib/auth";
import {
  agregarDevolucion,
  agregarMeta,
  limpiarDevoluciones,
  marcarRevisada,
  quitarDevolucion,
  sinRevisar,
  type Clase,
  type Devolucion,
  type Entrega,
  type Practica,
} from "@/lib/data";
import { hoy, inicioDeSemana } from "@/lib/dates";
import { colors, fonts } from "@/lib/theme";
import { minutosYSegundos } from "@/components/Reproductor";

const idNuevo = () => Math.random().toString(36).slice(2, 10);

// The blocks of the class the alumno said were hard ("Me costó" in the practice mode).
export function bloquesQueCostaron(clase: Clase, practica: Practica | undefined) {
  return (clase.bloques ?? [])
    .filter((b) => practica?.bloques[b.id] === "costo")
    .map((b) => b.titulo || "Sin título");
}

// A delivery as the profesor reviews it, in the class and in the review tray: what the alumno
// said, the files with comments at a second (written or recorded), the rubric and "Revisada".
export function EntregaRevision({
  clase,
  entrega,
  practica,
  puedeSubir,
  alMarcar,
}: {
  clase: Clase;
  entrega: Entrega;
  practica?: Practica;
  // With the plan blocked: comments in writing, nothing uploaded.
  puedeSubir: boolean;
  // Tray: goes on to the next one.
  alMarcar?: () => void;
}) {
  // Comments left on a file the alumno removed meanwhile (see limpiarDevoluciones).
  useEffect(() => {
    limpiarDevoluciones(entrega, false).catch(() => {});
  }, [entrega]);

  const costaron = bloquesQueCostaron(clase, practica);

  const convertirEnMeta = (devolucion: Devolucion) => {
    const texto =
      devolucion.texto || `Practicar lo que te mostré en ${minutosYSegundos(devolucion.segundo)}`;
    void agregarMeta(entrega, texto, inicioDeSemana(hoy())).then(
      () => avisar({ texto: "Agregada a sus metas de la semana." }),
      () => avisar({ texto: "No se pudo agregar la meta.", tipo: "error" }),
    );
  };

  const marcar = (revisada: boolean) => {
    void marcarRevisada(entrega, revisada).then(
      () => {
        if (revisada) alMarcar?.();
      },
      () => avisar({ texto: "No se pudo guardar.", tipo: "error" }),
    );
  };
  const pendiente = sinRevisar(entrega);

  return (
    <View style={styles.wrap}>
      {costaron.length ? <Text style={styles.costo}>Le costó: {costaron.join(" · ")}</Text> : null}
      {entrega.comentario ? <Text style={styles.body}>“{entrega.comentario}”</Text> : null}
      <MaterialList
        materiales={entrega.archivos}
        instrumento={entrega.instrumento}
        devoluciones={entrega.devoluciones}
        respuestas={entrega.respuestas}
        onComentar={(material, segundo, texto) =>
          agregarDevolucion(entrega, {
            id: idNuevo(),
            archivoId: material.id,
            segundo: Math.round(segundo * 10) / 10,
            texto,
            fecha: Date.now(),
          }).catch(() => {
            avisar({ texto: "No se pudo guardar el comentario.", tipo: "error" });
          })
        }
        onQuitarDevolucion={(devolucion) =>
          void quitarDevolucion(entrega, devolucion).catch(() =>
            avisar({ texto: "No se pudo borrar el comentario.", tipo: "error" }),
          )
        }
        onConvertirEnMeta={convertirEnMeta}
        respuestaGrabada={
          puedeSubir
            ? {
                carpeta: `entregas/${clase.id}/${entrega.alumnoId}/devoluciones`,
                anotar: (material, segundo, texto, grabacion) =>
                  agregarDevolucion(entrega, {
                    id: idNuevo(),
                    archivoId: material.id,
                    segundo: Math.round(segundo * 10) / 10,
                    texto,
                    fecha: Date.now(),
                    media: {
                      ruta: grabacion.ruta,
                      tipo: grabacion.tipo,
                      contentType: grabacion.contentType,
                      tamano: grabacion.tamano,
                    },
                  }),
              }
            : undefined
        }
      />
      <RubricaEditor
        key={entrega.evaluacion?.fecha ?? "nueva"}
        entrega={entrega}
        instrumento={clase.instrumento}
      />
      {pendiente ? (
        <Button style={styles.accion} onPress={() => marcar(true)}>
          <CheckCheck size={16} color={buttonForeground()} />
          {alMarcar ? "Revisada y siguiente" : "Marcar como revisada"}
        </Button>
      ) : (
        <Button variant="secondary" size="sm" style={styles.accion} onPress={() => marcar(false)}>
          <Undo2 size={14} color={buttonForeground("secondary")} />
          Revisada: volver a pendiente
        </Button>
      )}
    </View>
  );
}

// Messages closed until asked for: a long list of alumnos stays short. `sinLeer`: how many are new.
export function MensajesPlegables({
  clase,
  alumnoId,
  alumnoNombre,
  perfil,
  sinLeer,
}: {
  clase: Clase;
  alumnoId: string;
  alumnoNombre: string;
  perfil: Perfil;
  sinLeer: number;
}) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto)
    return (
      <Button
        variant={sinLeer ? "default" : "secondary"}
        size="sm"
        style={styles.accion}
        onPress={() => setAbierto(true)}
      >
        <MessageCircle size={14} color={buttonForeground(sinLeer ? "default" : "secondary")} />
        {sinLeer ? `Mensajes (${sinLeer} ${sinLeer === 1 ? "nuevo" : "nuevos"})` : "Mensajes"}
      </Button>
    );
  return (
    <MensajesClase
      clase={clase}
      alumnoId={alumnoId}
      perfil={perfil}
      otroNombre={alumnoNombre.split(" ")[0] ?? alumnoNombre}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: colors.foreground,
  },
  costo: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.foreground,
  },
  accion: {
    alignSelf: "flex-start",
  },
});
