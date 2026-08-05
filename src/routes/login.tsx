import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import heroImage from "@/assets/drums-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Pulso batería" },
      {
        name: "description",
        content: "Entra a Pulso para retomar tus rudimentos, grooves y racha de práctica.",
      },
      { property: "og:title", content: "Iniciar sesión — Pulso batería" },
      {
        property: "og:description",
        content: "Accede a tus lecciones de batería y continúa tu racha.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.email.includes("@") || form.password.length < 6) {
      setError("Revisa tu correo y usa una contraseña de al menos 6 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      navigate({ to: "/" });
    }, 900);
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img
          src={heroImage}
          alt="Batería iluminada en un escenario oscuro"
          width={1536}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <span className="font-display text-2xl tracking-widest">PULSO</span>
          <h2 className="mt-4 max-w-sm text-4xl leading-tight">
            Cada sesión cuenta.
            <span className="text-amber-gradient"> Vuelve al kit.</span>
          </h2>
        </div>
      </div>

      <div className="stage-glow flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <span className="font-display text-2xl tracking-widest lg:hidden">PULSO</span>
          <h1 className="mt-6 text-4xl">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Retoma tus rudimentos y mantén tu racha viva.
          </p>

          <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="baterista@pulso.app"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <Checkbox id="remember" /> Recordarme
              </label>
              <span className="text-primary">¿Olvidaste tu contraseña?</span>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar al kit"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Primera vez aquí?{" "}
            <Link to="/" className="text-primary">
              Explora las lecciones
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}