import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { GuestOnly, RequireAuth, RequireRole } from "@/components/RouteGuards";
import { loadFonts } from "@/lib/fonts";
import ClasePage from "@/routes/clase";
import Inicio from "@/routes/index";
import RootLayout, { ErrorBoundary } from "@/routes/layout";
import LoginPage from "@/routes/login";
import NotFoundScreen from "@/routes/not-found";
import AlumnoDetalle from "@/routes/profesor/alumno";
import Planificacion from "@/routes/profesor/planificacion";

const router = createBrowserRouter([
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
      {
        element: <GuestOnly />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "registro", element: <Navigate to="/login?modal=registro" replace /> },
        ],
      },
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
]);

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
