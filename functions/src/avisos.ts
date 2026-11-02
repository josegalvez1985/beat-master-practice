import { getFirestore, type DocumentData } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Push notices (Firebase Cloud Messaging) to the browsers each person turned on in their
// profile (`dispositivos/{token}`). Data-only messages: public/sw.js shows them.
//
// The database is in nam5 (United States), so the Firestore triggers run in us-central1.

const db = () => getFirestore();
const SITIO = "https://www.pypulso.online";
const opciones = { database: "(default)", region: "us-central1" } as const;

type Aviso = { titulo: string; cuerpo: string; url: string; tag?: string };

// Sends to every device of these users; tokens that stopped working are deleted (that is how
// `dispositivos` never keeps dead browsers).
async function enviar(uids: string[], aviso: Aviso) {
  const unicos = [...new Set(uids)].filter(Boolean);
  if (!unicos.length) return;
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (let i = 0; i < unicos.length; i += 30) {
    const snap = await db()
      .collection("dispositivos")
      .where("uid", "in", unicos.slice(i, i + 30))
      .get();
    docs.push(...snap.docs);
  }
  if (!docs.length) return;
  const respuesta = await getMessaging().sendEachForMulticast({
    tokens: docs.map((d) => d.id),
    data: { titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: aviso.url, tag: aviso.tag ?? "" },
    webpush: { headers: { Urgency: "normal", TTL: String(60 * 60 * 24) } },
  });
  const muertos = respuesta.responses
    .map((r, i) => ({ r, doc: docs[i]! }))
    .filter(
      ({ r }) =>
        !r.success &&
        ["messaging/registration-token-not-registered", "messaging/invalid-argument"].includes(
          r.error?.code ?? "",
        ),
    );
  await Promise.all(muertos.map(({ doc }) => doc.ref.delete()));
}

const hoyEnParaguay = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(new Date());

const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

const urlDeClase = (claseId: string) => `${SITIO}/clases/${claseId}`;

// A new class for the next week: the alumnos of that list. (Weekly repeats create many future
// classes at once: only the near ones are announced.)
export const avisarClaseNueva = onDocumentCreated(
  { ...opciones, document: "clases/{claseId}" },
  async (event) => {
    const clase = event.data?.data();
    if (!clase) return;
    const hoy = hoyEnParaguay();
    if (clase.fecha < hoy || clase.fecha > sumarDias(hoy, 7)) return;
    const lista = await db()
      .collection("inscripciones")
      .where("profesorId", "==", clase.profesorId)
      .where("instrumento", "==", clase.instrumento)
      .get();
    await enviar(
      lista.docs.map((d) => d.get("alumnoId") as string),
      {
        titulo: clase.evento ? "Nuevo recital" : "Nueva clase",
        cuerpo: `${clase.titulo} · Prof. ${clase.profesorNombre}`,
        url: urlDeClase(event.params.claseId),
      },
    );
  },
);

const cuantos = (data: DocumentData | undefined, campo: string) =>
  Array.isArray(data?.[campo]) ? (data[campo] as unknown[]).length : 0;

// A delivery changed: new files (to the profesor), new devoluciones or a new evaluation (to
// the alumno), new answers to devoluciones (to the profesor).
export const avisarEntrega = onDocumentWritten(
  { ...opciones, document: "entregas/{entregaId}" },
  async (event) => {
    const antes = event.data?.before.data();
    const despues = event.data?.after.data();
    if (!despues) return;
    const url = urlDeClase(despues.claseId as string);
    const clase = (await db().collection("clases").doc(despues.claseId).get()).data();
    const titulo = (clase?.titulo as string | undefined) ?? "tu clase";

    if (cuantos(despues, "archivos") > cuantos(antes, "archivos"))
      await enviar([despues.profesorId], {
        titulo: "Nueva entrega",
        cuerpo: `${despues.alumnoNombre} entregó «${titulo}»`,
        url,
        tag: `entrega-${event.params.entregaId}`,
      });

    if (cuantos(despues, "devoluciones") > cuantos(antes, "devoluciones"))
      await enviar([despues.alumnoId], {
        titulo: "Tu profesor comentó tu entrega",
        cuerpo: `«${titulo}»: mira el comentario en el segundo exacto.`,
        url,
        tag: `devolucion-${event.params.entregaId}`,
      });

    if (despues.evaluacion && despues.evaluacion.fecha !== antes?.evaluacion?.fecha)
      await enviar([despues.alumnoId], {
        titulo: "Tu profesor evaluó tu entrega",
        cuerpo: `«${titulo}»: mira tu evaluación.`,
        url,
      });

    const nuevas = Object.keys(despues.respuestas ?? {}).filter(
      (id) => (despues.respuestas as Record<string, string>)[id] !== antes?.respuestas?.[id],
    );
    if (nuevas.length) {
      const respuesta = (despues.respuestas as Record<string, string>)[nuevas[0]!];
      await enviar([despues.profesorId], {
        titulo: `${despues.alumnoNombre} respondió`,
        cuerpo: `${respuesta === "corregido" ? "Ya lo corrigió" : "Entendido"} · «${titulo}»`,
        url,
      });
    }
  },
);

// A message about a class: to the other person. An absence notice says so.
export const avisarMensaje = onDocumentCreated(
  { ...opciones, document: "mensajes/{mensajeId}" },
  async (event) => {
    const m = event.data?.data();
    if (!m) return;
    const clase = (await db().collection("clases").doc(m.claseId).get()).data();
    const titulo = (clase?.titulo as string | undefined) ?? "la clase";
    const deProfesor = m.autorId === m.profesorId;
    let nombre = (clase?.profesorNombre as string | undefined) ?? "Tu profesor";
    if (!deProfesor) {
      const inscripcion = await db()
        .collection("inscripciones")
        .doc(`${m.profesorId}_${m.alumnoId}_${clase?.instrumento}`)
        .get();
      nombre = (inscripcion.get("alumnoNombre") as string | undefined) ?? "Tu alumno";
    }
    await enviar([deProfesor ? m.alumnoId : m.profesorId], {
      titulo:
        m.tipo === "ausencia" ? `${nombre} no puede ir a «${titulo}»` : `Mensaje de ${nombre}`,
      cuerpo: String(m.texto).slice(0, 180),
      url: urlDeClase(m.claseId),
      tag: `mensajes-${m.claseId}-${m.alumnoId}`,
    });
  },
);

// Every hour: the alumnos whose reminder is this hour (Paraguay) and have not logged practice
// today; with their streak, so they do not break it.
export const recordarPractica = onSchedule(
  { schedule: "0 * * * *", timeZone: "America/Asuncion", region: "us-central1" },
  async () => {
    const hora = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Asuncion",
        hour: "numeric",
        hourCycle: "h23",
      }).format(new Date()),
    );
    const usuarios = await db().collection("usuarios").where("recordatorio", "==", hora).get();
    const hoy = hoyEnParaguay();
    for (const usuario of usuarios.docs) {
      // One equality filter (no composite index needed); a diary is small.
      const diario = await db().collection("diario").where("alumnoId", "==", usuario.id).get();
      const dias = new Set(diario.docs.map((d) => d.get("fecha") as string));
      if (dias.has(hoy)) continue;
      let racha = 0;
      while (dias.has(sumarDias(hoy, -(racha + 1)))) racha++;
      await enviar([usuario.id], {
        titulo: racha >= 2 ? `Llevas ${racha} días seguidos` : "¿Practicamos hoy?",
        cuerpo:
          racha >= 2
            ? "Unos minutos hoy y no cortas la racha. Mira tu práctica de hoy."
            : "Aunque sean 10 minutos: tu práctica de hoy ya está armada.",
        url: `${SITIO}/`,
        tag: "recordatorio",
      });
    }
  },
);
