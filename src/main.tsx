import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { LoginRedirect, RequireAdmin, RequireAuth, RequireRole } from "@/components/RouteGuards";
import { loadFonts } from "@/lib/fonts";
import Admin from "@/routes/admin";
import PracticarAhora from "@/routes/alumno/practicar";
import ClasePage from "@/routes/clase";
import Herramientas from "@/routes/herramientas";
import Inicio from "@/routes/index";
import RootLayout, { ErrorBoundary } from "@/routes/layout";
import NotFoundScreen from "@/routes/not-found";
import PerfilPage from "@/routes/perfil";
import AlumnoDetalle from "@/routes/profesor/alumno";
import MiPlan from "@/routes/profesor/plan";
import Planificacion from "@/routes/profesor/planificacion";
import Revision from "@/routes/profesor/revision";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <RootLayout />,
      errorElement: <ErrorBoundary />,
      children: [
        {
          element: <RequireAuth />,
          children: [
            {
              element: <AppShell />,
              children: [
                { index: true, element: <Inicio /> },
                { path: "clases/:claseId", element: <ClasePage /> },
                { path: "perfil", element: <PerfilPage /> },
                { path: "herramientas", element: <Herramientas /> },
                {
                  element: <RequireRole rol="alumno" />,
                  children: [{ path: "practicar", element: <PracticarAhora /> }],
                },
                {
                  element: <RequireAdmin />,
                  children: [{ path: "admin", element: <Admin /> }],
                },
                {
                  element: <RequireRole rol="profesor" />,
                  children: [
                    { path: "planificacion", element: <Planificacion /> },
                    { path: "alumnos/:alumnoId", element: <AlumnoDetalle /> },
                    { path: "plan", element: <MiPlan /> },
                    { path: "revision", element: <Revision /> },
                  ],
                },
              ],
            },
          ],
        },
        // The login is the home without a session (RequireAuth); these keep old links working.
        { path: "login", element: <LoginRedirect /> },
        { path: "registro", element: <Navigate to="/?modal=registro" replace /> },
        { path: "*", element: <NotFoundScreen /> },
      ],
    },
  ],
  // Served under a sub-path on GitHub Pages (see vite.config.ts).
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);

const queryClient = new QueryClient();

// Offline use: public/sw.js keeps the app and the files it used in the browser cache.
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });

// Service workers that are not ours (an old one from another app on the same address, like
// localhost:5173, or Firebase's default /firebase-messaging-sw.js): their script does not exist
// here, so the browser keeps getting the HTML page for it ("unsupported MIME type
// ('text/html')"). They are unregistered on load; ours (sw.js) stays.
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .getRegistrations()
    .then((registros) =>
      registros.forEach((registro) => {
        const script = (registro.active ?? registro.waiting ?? registro.installing)?.scriptURL;
        if (script?.endsWith(`${import.meta.env.BASE_URL}sw.js`)) return;
        console.info("Service worker ajeno dado de baja:", script ?? registro.scope);
        void registro.unregister();
      }),
    )
    .catch(() => {});

loadFonts().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
});
