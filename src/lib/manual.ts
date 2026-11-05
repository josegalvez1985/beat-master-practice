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
    rol === "profesor"
      ? "Para irte de Pulso: Mi perfil → Eliminar mi cuenta, y confirma con tu contraseña. Se borran para siempre tu cuenta, tus clases con sus archivos, las entregas de tus alumnos, tus listas y mensajes; solo se conservan tus pagos y tu plan, como historial. No se puede deshacer."
      : "Para irte de Pulso: Mi perfil → Eliminar mi cuenta, y confirma con tu contraseña. Se borran para siempre tu cuenta, tus entregas (audios, videos, fotos y PDF), tu diario, tus récords y todo tu avance. No se puede deshacer.",
  ],
});

const herramientas = (rol: Role): TemaManual => ({
  titulo: "Herramientas",
  pasos: [
    "En Herramientas eliges el instrumento (si tienes varios) y ves solo las herramientas que le sirven.",
    "Afinador: escucha el micrófono, muestra la nota y te dice si subir o bajar; tocar una cuerda fija esa cuerda y suena su nota.",
    "Metrónomo: compás, subdivisión y «Subir el tempo solo» (sube unos BPM cada tantos compases hasta un tope).",
    "Grabadora: audio o video, con o sin click (usa auriculares). Antes de grabar hay una cuenta para volver al instrumento. Al terminar ves el análisis (tiempo; afinación en arco, viento y voz) y puedes descargar la toma.",
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
      titulo: "Tu inicio: Para hoy",
      pasos: [
        "Para hoy reúne lo que te necesita: entregas por revisar, clases de hoy, quién avisó que no puede ir, mensajes nuevos y alumnos con clases pendientes que hace más de 14 días no entregan.",
        "Toca cualquier fila para ir directo a eso.",
      ],
    },
    {
      titulo: "Agregar alumnos",
      pasos: [
        "En Inicio → Mis alumnos, toca «Agregar alumno», carga su número de documento y toca Buscar: su nombre aparece en el campo de al lado para que confirmes que es él.",
        "Toca «+ Guitarra», «+ Piano»… según el instrumento que le enseñas. Si ya está en esa lista, ves «Guitarra ✓».",
        "¿Todavía no tiene cuenta? «Invitar por WhatsApp» abre el mensaje ya escrito con el enlace para registrarse.",
        "Desde ese momento ve las clases que le asignes y las que sean para toda la lista.",
      ],
    },
    {
      titulo: "Planificar clases",
      pasos: [
        "En Planificación ves tus clases por Semana, Mes o Año; las flechas cambian de período y «Hoy» vuelve a la fecha actual.",
        "Toca «+» en un día (o Nueva clase) y elige para quién es: uno o varios alumnos, o «Todos» los de ese instrumento. Solo la ven ellos. Desde la ficha de un alumno, «Nueva clase» ya viene con él elegido.",
        "Completa instrumento, título, fecha, hora, modalidad (presencial o virtual con su enlace), objetivos y tarea.",
        "«Repetir cada semana hasta…» crea varias clases de una vez (hasta 60).",
        "«Es un recital o muestra» agrega el lugar y el programa: quién toca qué.",
        "En la clase: Editar, Duplicar a otra fecha o para otro alumno (sin archivos) o Eliminar (también borra sus materiales y las entregas de los alumnos).",
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
        "«De mi biblioteca» guarda los archivos que repites (un PDF de escalas, una pista): súbelos una vez y toca «Usar» en cada clase. La clase recibe su copia, así que borrarlo de la biblioteca no lo quita de las clases.",
      ],
    },
    {
      titulo: "Revisar entregas y evaluar",
      pasos: [
        "En Inicio, «Entregas por revisar» abre Por revisar: una entrega por vez, de la más antigua a la más nueva. «Después» la deja para el final de la cola.",
        "Escucha o mira cada grabación, más lento o repitiendo un pasaje, con su análisis: estabilidad del tiempo y BPM, y notas afinadas en arco, viento y voz.",
        "Pausa en el momento justo y toca «Comentar en este momento»: escribe, o toca «Grabar mi respuesta» para mostrárselo en audio o video. El alumno lo ve en ese segundo y te responde «Entendido» o «Ya lo corregí».",
        "El ícono de la diana convierte un comentario en una meta de su semana.",
        "«Evaluar con rúbrica»: de 1 a 5 en cada criterio del instrumento, más una devolución breve.",
        "«Revisada y siguiente» la saca de la cola y pasa a la próxima. Si el alumno sube un archivo nuevo, vuelve a la cola.",
        "En la clase, «Pasar lista» marca la asistencia (Presente, Llegó tarde, Ausente; tocar la marcada la borra), con un botón para marcar presentes a los que faltan. Si un alumno avisa que no puede ir, lo ves ahí. «Mensajes» te dice cuántos son nuevos.",
      ],
    },
    {
      titulo: "Seguir el avance de cada alumno",
      pasos: [
        "En Inicio → Mis alumnos, la barra es su avance en la ruta de aprendizaje; debajo ves si está al día con sus entregas (solo cuentan las clases desde que entró y hasta hoy).",
        "Toca un alumno. «Para preparar la clase» resume en qué quedaron: su última clase y qué le costó, cuánto practicó, tu última evaluación, sus metas y sus tempos.",
        "Ahí están tus notas privadas (el alumno no las ve) y «Enviar resumen a la familia», que abre WhatsApp con el resumen de la semana ya escrito.",
        "Más abajo: sus clases, su asistencia, sus habilidades (promedio de la rúbrica) y su diario de práctica.",
        "En su ruta de aprendizaje eliges el nivel y marcas cada objetivo que alcanza.",
        "Ahí mismo escriben, tú y el alumno, sus metas de la semana y su repertorio, con el estado de cada obra y a qué tempo va.",
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
        "Hoy: primero, lo que te dijo tu profesor. Después, «Tu práctica de hoy»: elige 10, 20 o 40 minutos, toca «Practicar ahora» y sigue los pasos. Abajo ves cuántos días practicaste esta semana.",
        "Mis clases: una tarjeta por profesor con tus clases y si estás al día. Las clases de antes de que entraras no te quedan pendientes.",
        "Mi progreso: tu ruta, tus metas, tu repertorio, tus habilidades, tus insignias y todo lo que te dijo tu profesor.",
        "En la pestaña Practicar tienes la práctica de hoy con el afinador y el metrónomo a mano.",
      ],
    },
    {
      titulo: "Practicar una clase",
      pasos: [
        "Abre la clase y toca «Empezar práctica» (o «Continuar práctica»).",
        "Ves un bloque por pantalla, con cronómetro y sonido, y la pantalla queda encendida. «Me salió y sigo» o «Me costó» pasan al próximo y le cuentan a tu profesor cómo te fue; también un pedal Bluetooth o las flechas del teclado.",
        "«Afinar» abre el afinador con la afinación de la clase.",
        "Al terminar, tus minutos se anotan solos en el diario.",
      ],
    },
    {
      titulo: "Grabarte y entregar",
      pasos: [
        "En la clase, en «Tu entrega», graba audio o video. Antes de empezar hay una cuenta para volver al instrumento. Con click, usa auriculares para que no se escuche en la grabación.",
        "Pulso analiza tu grabación (tiempo; afinación en arco, viento y voz); escúchate y toca «Enviar a mi profesor», o graba de nuevo.",
        "Si cierras la pestaña sin enviarla, la grabación te espera al volver a esa clase. Sin internet se guarda y se envía sola cuando vuelve.",
        "También puedes subir un archivo: audio, video, o fotos y PDF de una tarea escrita (hasta 20 MB).",
        "En el celular, «Sacar foto» abre la cámara: fotografía tu tarea escrita o tu partitura y se envía a tu profesor.",
        "Entregar es lo que te deja al día con tus clases. La papelera quita un archivo; tienes unos segundos para «Deshacer».",
      ],
    },
    {
      titulo: "Correcciones de tu profesor",
      pasos: [
        "Lo nuevo aparece arriba en Inicio, en «Tu profesor te dijo», y todo queda en Mi progreso, en «Lo que me dijo mi profesor».",
        "Sus comentarios aparecen debajo de la grabación; tocar uno te lleva a ese segundo. Algunos son respuestas grabadas: escúchalas ahí mismo.",
        "Respóndele «Entendido» o «Ya lo corregí».",
        "Su evaluación (rúbrica) aparece en la clase, con barras por criterio.",
        "Si tienes una duda, escríbele en Mensajes. Si no puedes ir a una clase, toca «No puedo ir».",
      ],
    },
    {
      titulo: "Tu avance",
      pasos: [
        "Tu avance real es tu ruta de aprendizaje: el nivel y los objetivos que marca tu profesor. Ahí también ves tus habilidades y tus insignias.",
        "Metas de la semana: las escriben tú y tu profesor; márcalas al cumplirlas.",
        "Repertorio: tú y tu profesor agregan obras con su estado; toca «Repasé hoy» al repasarla y anota a qué tempo va y cuál es el objetivo.",
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
