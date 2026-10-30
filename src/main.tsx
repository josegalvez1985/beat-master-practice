import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { LoginRedirect, RequireAuth, RequireRole } from "@/components/RouteGuards";
import { loadFonts } from "@/lib/fonts";
import PracticarAhora from "@/routes/alumno/practicar";
import ClasePage from "@/routes/clase";
import Inicio from "@/routes/index";
import RootLayout, { ErrorBoundary } from "@/routes/layout";
import NotFoundScreen from "@/routes/not-found";
import PerfilPage from "@/routes/perfil";
import AlumnoDetalle from "@/routes/profesor/alumno";
import Planificacion from "@/routes/profesor/planificacion";

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
                {
                  element: <RequireRole rol="alumno" />,
                  children: [{ path: "practicar", element: <PracticarAhora /> }],
                },
                {
                  element: <RequireRole rol="profesor" />,
                  children: [
                    { path: "planificacion", element: <Planificacion /> },
                    { path: "alumnos/:alumnoId", element: <AlumnoDetalle /> },
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

loadFonts().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
});
