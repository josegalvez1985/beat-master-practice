import type { Role } from "@/lib/auth";
import { PLANES, guaranies } from "@/lib/planes";

// "Inicial (hasta 5 alumnos, Gs. 50.000), …", from the same list the app charges.
const listaDePlanes = PLANES.map(
  (p) => `${p.nombre} (hasta ${p.alumnos} alumnos, ${guaranies(p.precio)})`,
).join(", ");

// The user manual in Mi perfil, one per role: topics with short steps, in the words and button
// names of the app. Update it (with PrimerosPasosDialog and the guides) whenever something
// visible to alumnos or profesores changes.

export type TemaManual = { titulo: string; pasos: string[] };

const cuenta = (rol: Role): TemaManual => ({
  titulo: "Tu cuenta y tu perfil",
  pasos: [
    "Entras con tu número de documento y tu contraseña. Si la olvidas, toca «¿Olvidaste tu contraseña?» en el inicio de sesión: la recuperas con tu documento y tu correo.",
    rol === "profesor"
      ? "En Mi perfil cambias tu foto, ves tus datos y sumas instrumentos para enseñar (con cada uno puedes armar listas de alumnos y clases)."
      : "En Mi perfil cambias tu foto (la ven tus profesores), ves tu número de documento y sumas instrumentos que estudias (cada uno trae sus herramientas).",
    ...(rol === "profesor"
      ? [
          "En Mis datos está tu celular: lo usamos para avisarte sobre tu plan y solo lo ve el equipo de Pulso. Si te registraste antes de que fuera obligatorio, agrégalo ahí.",
        ]
      : []),
    "En Apariencia eliges el tema Claro, Oscuro o el de tu dispositivo (Sistema).",
    "Salir, arriba a la derecha, cierra la sesión y borra la copia de tus datos guardada en ese dispositivo.",
  ],
});

const herramientas = (rol: Role): TemaManual => ({
  titulo: "Herramientas",
  pasos: [
    "En Herramientas eliges el instrumento (si tienes varios) y ves solo las herramientas que le sirven.",
    "Afinador: escucha el micrófono, muestra la nota y te dice si subir o bajar; tocar una cuerda fija esa cuerda y suena su nota.",
    "Metrónomo: compás, subdivisión y «Subir el tempo solo» (sube unos BPM cada tantos compases hasta un tope).",
    "Grabadora: audio o video, con o sin click (usa auriculares). Al terminar ves el análisis de afinación y tiempo, y puedes descargar la toma.",
    "También, según el instrumento: acordes, oído, lectura de notas y a primera vista, y polca, guarania y galopa con su acompañamiento.",
    "En los audios, videos y YouTube de una clase puedes bajar la velocidad y repetir un pasaje de A a B.",
    rol === "alumno"
      ? "Una vez abiertas, funcionan sin internet. El micrófono pide permiso la primera vez."
      : "Una vez abiertas, funcionan sin internet. El micrófono pide permiso la primera vez. El diario de práctica es solo de los alumnos.",
  ],
});

const avisos: TemaManual = {
  titulo: "Calendario y avisos",
  pasos: [
    "Una clase con hora tiene «Google Calendar» y «Otro calendario (.ics)» para agendarla, con aviso una hora antes. Si es virtual, «Entrar a la videollamada».",
    "En Mi perfil → Avisos activas las notificaciones del navegador en ese dispositivo.",
  ],
};

const asistente: TemaManual = {
  titulo: "Asistente ✦",
  pasos: [
    "El botón redondo ✦ abre el asistente. Arrástralo para dejarlo donde no te moleste.",
    "Pregúntale cómo se usa una pantalla o por tus clases y tu avance: solo lee tus datos y no cambia nada.",
    "Tienes 30 preguntas por día. Puede equivocarse: revisa lo importante.",
  ],
};

const ayuda: TemaManual = {
  titulo: "¿Necesitas ayuda?",
  pasos: [
    "En Mi perfil → Ayuda y contacto, «Escribir a Pulso» abre WhatsApp con tu consulta lista para enviar y te respondemos por ahí.",
  ],
};

export const manual: Record<Role, TemaManual[]> = {
  profesor: [
    cuenta("profesor"),
    {
      titulo: "Agregar alumnos",
      pasos: [
        "El alumno primero crea su cuenta en Pulso (gratis) con su número de documento.",
        "En Inicio → Agregar alumno, búscalo por número de documento o por nombre.",
        "Toca «+ Guitarra», «+ Piano»… según el instrumento que le enseñas. Si ya está en esa lista, ves «Guitarra ✓».",
        "Desde ese momento ve tus clases de ese instrumento.",
      ],
    },
    {
      titulo: "Planificar clases",
      pasos: [
        "En Planificación ves tus clases por Semana, Mes o Año; las flechas cambian de período y «Hoy» vuelve a la fecha actual.",
        "Toca «+» en un día (o Nueva clase) y completa instrumento, título, fecha, hora, modalidad (presencial o virtual con su enlace), objetivos y tarea.",
        "«Repetir cada semana hasta…» crea varias clases de una vez (hasta 60).",
        "«Es un recital o muestra» agrega el lugar y el programa: quién toca qué.",
        "En la clase: Editar, Duplicar a otra fecha (sin archivos) o Eliminar (también borra sus materiales y las entregas de los alumnos).",
      ],
    },
    {
      titulo: "Armar el plan de la clase",
      pasos: [
        "Abre la clase y toca «Usar plantilla de 60 min» o empieza en blanco.",
        "Completa la ficha: nivel, estilo, afinación, capo y duración.",
        "Suma bloques con «Agregar bloque» o con el «+» entre dos bloques: tablatura o partitura con sonido, acordes, rasgueo, tempo con metrónomo, escala o arpegio, respiración, afinar, YouTube, archivos y texto. En batería, también groove y rudimento.",
        "Cambia el orden arrastrando en «Orden de la clase» o con las flechas de cada bloque.",
        "Todo se guarda solo (verás «Guardado»). «Vista del alumno» muestra la clase como la verá el alumno.",
        "Si eliminas un bloque, tienes unos segundos para tocar «Deshacer».",
      ],
    },
    {
      titulo: "Tu biblioteca de bloques",
      pasos: [
        "El ícono de marcador de un bloque lo guarda en tu biblioteca (los bloques de archivos no).",
        "Al agregar un bloque, arriba aparece «De tu biblioteca» con los guardados de ese instrumento.",
        "La ✕ lo quita de la biblioteca, no de las clases donde ya lo usaste.",
      ],
    },
    {
      titulo: "Materiales de la clase",
      pasos: [
        "«Subir materiales» acepta audio, video, imágenes, PDF, MusicXML y Guitar Pro, hasta 200 MB por archivo.",
        "En el celular, «Sacar foto» abre la cámara: fotografía una partitura, el pizarrón o una tarea y se sube al instante. También en los bloques de archivos del plan.",
        "Tus alumnos los ven en la clase; audio y video se reproducen ahí mismo.",
        "La papelera quita un archivo; tienes unos segundos para «Deshacer».",
      ],
    },
    {
      titulo: "Revisar entregas y evaluar",
      pasos: [
        "En la clase, «Alumnos de la clase» muestra quién entregó y quién asistió.",
        "Escucha o mira cada grabación, más lento o repitiendo un pasaje, con su análisis: notas afinadas, estabilidad del tiempo y BPM.",
        "Pausa en el momento justo y toca «Comentar en este momento»: el alumno ve tu comentario en ese segundo y te responde «Entendido» o «Ya lo corregí».",
        "«Evaluar con rúbrica»: de 1 a 5 en cada criterio del instrumento, más una devolución breve.",
        "Marca la asistencia (Presente, Llegó tarde, Ausente; tocar la marcada la borra) y escríbele en Mensajes. Si un alumno avisa que no puede ir, lo ves ahí.",
      ],
    },
    {
      titulo: "Seguir el avance de cada alumno",
      pasos: [
        "En Inicio → Mis alumnos ves la barra de progreso de cada uno; filtra por instrumento.",
        "Toca un alumno para ver sus clases entregadas y pendientes, su asistencia, sus habilidades (promedio de la rúbrica) y su diario de práctica.",
        "En su ruta de aprendizaje eliges el nivel y marcas cada objetivo que alcanza.",
        "Ahí mismo escriben, tú y el alumno, sus metas de la semana y su repertorio, con el estado de cada obra.",
      ],
    },
    {
      titulo: "Tu plan y cómo pagar",
      pasos: [
        "Al registrarte tienes 30 días gratis con todo habilitado. Para tus alumnos Pulso es siempre gratis.",
        `Después eliges un plan por mes según tus alumnos: ${listaDePlanes}. Cada alumno cuenta una vez, aunque le enseñes varios instrumentos. Si necesitas otra cantidad, avísanos al pagar.`,
        "En Mi plan (en el menú) ves cuándo vence, los planes y los datos para pagar por transferencia, con tu número de documento en el concepto.",
        "Activamos tu plan apenas vemos el pago, y lo ves en Mi plan con su nueva fecha y en «Tus pagos».",
        "Si vence, tienes 5 días hábiles para pagar. Después no puedes crear clases, agregar alumnos ni subir archivos, pero nada se borra: tus clases, tus alumnos y sus entregas siguen ahí.",
      ],
    },
    herramientas("profesor"),
    avisos,
    asistente,
    ayuda,
  ],
  alumno: [
    cuenta("alumno"),
    {
      titulo: "Empezar con tu profesor",
      pasos: [
        "Pásale tu número de documento a tu profesor: él te agrega a su lista.",
        "Hasta entonces no verás clases; ya puedes usar las herramientas y el diario.",
      ],
    },
    {
      titulo: "Tu inicio",
      pasos: [
        "El anillo muestra tu semana: tu meta de minutos o, sin meta, las clases entregadas.",
        "«Tu próxima práctica» es la clase pendiente más cercana: toca «Practicar ahora». Al lado ves tu racha de días.",
        "«Tu práctica de hoy»: elige 10, 20 o 40 minutos y sigue los pasos.",
        "Más abajo, una tarjeta por profesor con tus clases y tu avance.",
      ],
    },
    {
      titulo: "Practicar una clase",
      pasos: [
        "Abre la clase y toca «Empezar práctica» (o «Continuar práctica»).",
        "Ves un bloque por pantalla, con cronómetro y sonido. «Hecho y siguiente» pasa al próximo; también un pedal Bluetooth o las flechas del teclado.",
        "«Afinar» abre el afinador con la afinación de la clase.",
        "Al terminar, tus minutos se anotan solos en el diario.",
      ],
    },
    {
      titulo: "Grabarte y entregar",
      pasos: [
        "En la clase, en «Tu entrega», graba audio o video. Con click, usa auriculares para que no se escuche en la grabación.",
        "Pulso analiza tu afinación y tu tiempo; escúchate y toca «Enviar a mi profesor», o graba de nuevo.",
        "También puedes subir un archivo: audio, video, o fotos y PDF de una tarea escrita (hasta 20 MB).",
        "En el celular, «Sacar foto» abre la cámara: fotografía tu tarea escrita o tu partitura y se envía a tu profesor.",
        "Entregar es lo que cuenta en el avance de tus clases. La papelera quita un archivo; tienes unos segundos para «Deshacer».",
      ],
    },
    {
      titulo: "Correcciones de tu profesor",
      pasos: [
        "Sus comentarios aparecen debajo de la grabación; tocar uno te lleva a ese segundo.",
        "Respóndele «Entendido» o «Ya lo corregí».",
        "Su evaluación (rúbrica) aparece en la clase, con barras por criterio.",
        "Si tienes una duda, escríbele en Mensajes. Si no puedes ir a una clase, toca «No puedo ir».",
      ],
    },
    {
      titulo: "Tu avance",
      pasos: [
        "Cada clase entregada suma al progreso de ese instrumento.",
        "Ves tu ruta de aprendizaje (la marca tu profesor), tus habilidades y tus insignias.",
        "Metas de la semana: las escriben tú y tu profesor; márcalas al cumplirlas.",
        "Repertorio: tú y tu profesor agregan obras con su estado; toca «Repasé hoy» al repasarla.",
        "Mi evolución compara tu primera grabación con la última.",
      ],
    },
    {
      titulo: "Diario de práctica",
      pasos: [
        "«Anotar práctica»: instrumento, hoy o ayer, minutos y un comentario.",
        "Ponte una meta semanal de minutos con − y +.",
        "Para borrar una anotación, tienes unos segundos para «Deshacer».",
      ],
    },
    herramientas("alumno"),
    avisos,
    asistente,
    ayuda,
  ],
};
