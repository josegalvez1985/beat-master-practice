import Anthropic from "@anthropic-ai/sdk";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  ErrorHerramienta,
  ejecutar,
  fechaParaguay,
  herramientasPara,
  type Rol,
} from "./herramientas.js";

// The AI assistant: a callable Cloud Function. The Claude API key lives in Secret Manager
// (ANTHROPIC_API_KEY) and never reaches the browser. Read-only: the model only has the fixed
// searches of herramientas.ts, scoped to whoever asks. One usage document per user
// (asistenteUso/{uid}) holds the daily count and the month's tokens; questions and answers are
// not stored.

const CLAVE = defineSecret("ANTHROPIC_API_KEY");

// The model and its effort: one line each to change.
const MODELO = "claude-opus-5-5";
const ESFUERZO = "low";
const LIMITE_DIARIO = 30;

// Per question: round trips with the API, searches, answer tokens (thinking included), previous
// messages sent, and lengths accepted from the browser.
const MAX_VUELTAS = 5;
const MAX_BUSQUEDAS = 8;
const MAX_TOKENS = 8000;
const MAX_HISTORIAL = 10;
const MAX_PREGUNTA = 1500;
const MAX_GUIA = 40000;
const MAX_RESULTADO = 20000;

const db = () => getFirestore("default");

const INSTRUCCIONES = `Eres el asistente de Pulso (www.pypulso.online), una plataforma web exclusiva para profesores de música y sus alumnos en Paraguay. El profesor arma listas de alumnos por instrumento, planifica clases por bloques y revisa las grabaciones; el alumno practica, entrega su audio o video y sigue su avance. Instrumentos: guitarra, arpa paraguaya, piano, batería, voz, bajo, violín, acordeón, ukelele, saxofón y flauta.

Ayudas con dos cosas:
1. Cómo se usa Pulso: responde con la guía de uso que viene abajo. No inventes pantallas, botones ni funciones que no estén ahí.
2. Los datos de la persona: usa las búsquedas (solo lectura) para responder con sus clases, entregas, avance, diario y, si es profesor, sus alumnos. Nunca inventes datos: si una búsqueda no lo trae, dilo.

Reglas:
- Solo lees. No puedes crear, cambiar ni borrar nada: si te piden hacerlo, explica en qué pantalla y con qué botón se hace.
- Solo ves los datos de quien pregunta (y, si es profesor, de sus alumnos). No hay forma de ver los de otras personas.
- No muestres identificadores internos (claseId, alumnoId), nombres de colecciones ni detalles técnicos.
- También puedes orientar sobre práctica musical (técnica, cómo estudiar, rutinas) cuando te lo pidan, sin contradecir lo que indica el profesor en sus clases.
- Responde en español, tratando de "tú", breve y concreto: primero la respuesta, después el detalle si hace falta. Usa listas cortas y **negrita** para lo importante. Las fechas, como "lunes 3 de noviembre".`;

type Mensaje = { rol: "usuario" | "asistente"; texto: string };
type Entrada = { pregunta?: unknown; historial?: unknown; guia?: unknown; pantalla?: unknown };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Previous turns as plain text, starting with the person and alternating (what the API expects).
function historialValido(valor: unknown): Anthropic.Beta.BetaMessageParam[] {
  if (!Array.isArray(valor)) return [];
  const mensajes: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of valor.slice(-MAX_HISTORIAL) as Mensaje[]) {
    const contenido = texto(m?.texto, 4000);
    const role = m?.rol === "asistente" ? "assistant" : m?.rol === "usuario" ? "user" : null;
    if (!contenido || !role) continue;
    if (!mensajes.length && role !== "user") continue;
    if (mensajes.at(-1)?.role === role) continue;
    mensajes.push({ role, content: contenido });
  }
  // The new question goes after: the history has to end with the assistant.
  if (mensajes.at(-1)?.role === "user") mensajes.pop();
  return mensajes;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function mensajeDeError(error: unknown): HttpsError {
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  )
    return new HttpsError(
      "failed-precondition",
      "El asistente no está bien configurado (la clave de la API). Avísale al administrador.",
    );
  if (error instanceof Anthropic.RateLimitError)
    return new HttpsError(
      "resource-exhausted",
      "El asistente está saturado o se llegó al límite de la cuenta. Prueba en un rato.",
    );
  if (
    error instanceof Anthropic.APIConnectionError ||
    error instanceof Anthropic.InternalServerError
  )
    return new HttpsError(
      "unavailable",
      "El asistente no está disponible en este momento. Prueba en un rato.",
    );
  if (error instanceof Anthropic.APIError)
    return new HttpsError("internal", "El asistente no pudo responder. Prueba de nuevo.");
  return new HttpsError("internal", "Algo falló al responder. Prueba de nuevo.");
}

export const preguntarAsistente = onCall(
  {
    region: "southamerica-east1",
    secrets: [CLAVE],
    timeoutSeconds: 120,
    memory: "512MiB",
    maxInstances: 5,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Entra a tu cuenta para usar el asistente.");

    const datos = (request.data ?? {}) as Entrada;
    const pregunta = texto(datos.pregunta, MAX_PREGUNTA);
    if (!pregunta) throw new HttpsError("invalid-argument", "Escribe tu pregunta.");

    const perfil = (await db().doc(`usuarios/${uid}`).get()).data();
    if (!perfil) throw new HttpsError("failed-precondition", "Tu cuenta no tiene perfil.");
    const rol: Rol = perfil.rol === "profesor" ? "profesor" : "alumno";

    // Daily limit (failed questions do not count).
    const hoy = fechaParaguay();
    const mes = hoy.slice(0, 7);
    const usoRef = db().doc(`asistenteUso/${uid}`);
    const uso = (await usoRef.get()).data();
    const usadasHoy = uso?.dia === hoy ? Number(uso.preguntasDia) || 0 : 0;
    if (usadasHoy >= LIMITE_DIARIO)
      throw new HttpsError(
        "resource-exhausted",
        `Llegaste a las ${LIMITE_DIARIO} preguntas de hoy. Mañana puedes seguir.`,
      );

    // Fixed parts first (cached), the person's context last.
    const [y = 0, m = 1, d = 1] = hoy.split("-").map(Number);
    const system: Anthropic.Beta.BetaTextBlockParam[] = [
      { type: "text", text: INSTRUCCIONES },
      {
        type: "text",
        text: "GUÍA DE USO DE PULSO:\n\n" + (texto(datos.guia, MAX_GUIA) || "(no disponible)"),
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text:
          `Quien pregunta: ${perfil.nombre} (${rol}). ` +
          `Instrumentos: ${(perfil.instrumentos ?? []).join(", ")}. ` +
          `Está en la pantalla: ${texto(datos.pantalla, 200) || "desconocida"}. ` +
          `Hoy es ${DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${hoy} (hora de Paraguay).`,
      },
    ];

    const cliente = new Anthropic({ apiKey: CLAVE.value() });
    const herramientas = herramientasPara(rol);
    const mensajes: Anthropic.Beta.BetaMessageParam[] = [
      ...historialValido(datos.historial),
      { role: "user", content: pregunta },
    ];
    const tokens = { entrada: 0, salida: 0, cacheLeidos: 0, cacheEscritos: 0 };
    let busquedas = 0;
    let respuesta = "";

    try {
      for (let vuelta = 1; vuelta <= MAX_VUELTAS && !respuesta; vuelta++) {
        // Last round (or too many searches): answer with what it has.
        const ultima = vuelta === MAX_VUELTAS || busquedas >= MAX_BUSQUEDAS;
        const r = await cliente.beta.messages.create({
          model: MODELO,
          max_tokens: MAX_TOKENS,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: ESFUERZO },
          system,
          tools: herramientas,
          ...(ultima ? { tool_choice: { type: "none" as const } } : {}),
          messages: mensajes,
        });
        tokens.entrada += r.usage.input_tokens;
        tokens.salida += r.usage.output_tokens;
        tokens.cacheLeidos += r.usage.cache_read_input_tokens ?? 0;
        tokens.cacheEscritos += r.usage.cache_creation_input_tokens ?? 0;

        if (r.stop_reason === "refusal") {
          respuesta = "No puedo ayudarte con eso. Prueba preguntar de otra forma.";
          break;
        }
        const llamadas = r.content.filter(
          (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
        );
        if (r.stop_reason !== "tool_use" || !llamadas.length) {
          respuesta = r.content
            .flatMap((b) => (b.type === "text" ? [b.text] : []))
            .join("\n")
            .trim();
          break;
        }

        // The whole assistant turn goes back unchanged (thinking blocks included).
        mensajes.push({ role: "assistant", content: r.content });
        const resultados = await Promise.all(
          llamadas.map(async (b): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
            busquedas += 1;
            try {
              const resultado = await ejecutar(
                rol,
                uid,
                b.name,
                (b.input ?? {}) as Record<string, unknown>,
              );
              return {
                type: "tool_result",
                tool_use_id: b.id,
                content: JSON.stringify(resultado).slice(0, MAX_RESULTADO),
              };
            } catch (error) {
              return {
                type: "tool_result",
                tool_use_id: b.id,
                is_error: true,
                content:
                  error instanceof ErrorHerramienta ? error.message : "No se pudo leer ese dato.",
              };
            }
          }),
        );
        mensajes.push({ role: "user", content: resultados });
      }
    } catch (error) {
      console.error("asistente", error);
      throw mensajeDeError(error);
    }

    if (!respuesta) respuesta = "No llegué a una respuesta. Prueba preguntarlo de otra forma.";

    // Count it: one document per user, today's questions and the month's tokens.
    await db().runTransaction(async (tx) => {
      const actual = (await tx.get(usoRef)).data();
      const otroDia = actual?.dia !== hoy;
      const otroMes = actual?.mes !== mes;
      tx.set(
        usoRef,
        {
          dia: hoy,
          preguntasDia: otroDia ? 1 : FieldValue.increment(1),
          mes,
          preguntasMes: otroMes ? 1 : FieldValue.increment(1),
          tokensEntradaMes: otroMes ? tokens.entrada : FieldValue.increment(tokens.entrada),
          tokensSalidaMes: otroMes ? tokens.salida : FieldValue.increment(tokens.salida),
          tokensCacheLeidosMes: otroMes
            ? tokens.cacheLeidos
            : FieldValue.increment(tokens.cacheLeidos),
          tokensCacheEscritosMes: otroMes
            ? tokens.cacheEscritos
            : FieldValue.increment(tokens.cacheEscritos),
          modelo: MODELO,
          actualizadoEn: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    return { respuesta, usadasHoy: usadasHoy + 1, limite: LIMITE_DIARIO };
  },
);
