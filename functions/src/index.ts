import { initializeApp } from "firebase-admin/app";

// Cloud Functions of Pulso (the site itself has no server). Deploy: npm run deploy:funciones
initializeApp();

export { verBackend } from "./admin.js";
export { preguntarAsistente } from "./asistente.js";
export { avisarClaseNueva, avisarEntrega, avisarMensaje, recordarPractica } from "./avisos.js";
