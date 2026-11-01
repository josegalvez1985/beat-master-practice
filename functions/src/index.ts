import { initializeApp } from "firebase-admin/app";

// Cloud Functions of Pulso (the site itself has no server). Deploy: npm run deploy:funciones
initializeApp();

export { preguntarAsistente } from "./asistente.js";
