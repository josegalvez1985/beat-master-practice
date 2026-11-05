import { initializeApp } from "firebase-admin/app";

// Cloud Functions of Pulso (the site itself has no server). Deploy: npm run deploy:funciones
initializeApp();

export { verBackend } from "./admin.js";
export { activarPlan, agregarAlumno, habilitarDias, planesAdmin } from "./planes.js";
export { preguntarAsistente } from "./asistente.js";
export { eliminarCuenta } from "./cuenta.js";
export { usarArchivoBiblioteca } from "./biblioteca.js";
export { avisarClaseNueva, avisarEntrega, avisarMensaje, recordarPractica } from "./avisos.js";
