import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Drum, Flame, Timer, Trophy, ChevronRight } from "lucide-react";
import heroImage from "@/assets/drums-hero.jpg";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Metronome } from "@/components/Metronome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulso — Practica batería todos los días" },
      {
        name: "description",
        content:
          "Tu sesión diaria de batería: rudimentos, grooves, metrónomo y seguimiento de racha.",
      },
      { property: "og:title", content: "Pulso — Practica batería todos los días" },
      {
        property: "og:description",
        content: "Rudimentos, grooves, metrónomo y seguimiento de racha para bateristas.",
      },
    ],
  }),
  component: Index,
});

const lessons = [
  {
    title: "Single stroke roll",
    level: "Rudimento · Nivel 1",
    minutes: 8,
    progress: 72,
    icon: Drum,
  },
  { title: "Groove de rock 4/4", level: "Groove · Nivel 2", minutes: 12, progress: 45, icon: Flame },
  {
    title: "Independencia de pie",
    level: "Técnica · Nivel 3",
    minutes: 15,
    progress: 18,
    icon: Activity,
  },
];

function Index() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          alt="Batería iluminada en un estudio oscuro"
          width={1536}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
        <div className="stage-glow relative mx-auto max-w-5xl px-6 pb-16 pt-10">
          <header className="flex items-center justify-between">
            <span className="font-display text-2xl tracking-widest">PULSO</span>
            <Button asChild variant="secondary" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
          </header>

          <div className="mt-20 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Sesión de hoy
            </p>
            <h1 className="mt-4 text-5xl leading-[0.95] sm:text-7xl">
              Golpea fuerte,
              <br />
              <span className="text-amber-gradient">practica preciso.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Rudimentos guiados, grooves reales y un metrónomo siempre a mano. 15 minutos al día
              bastan para que tus manos cambien.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/login">
                  Empezar sesión <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={Flame} label="Racha" value="12 días" />
          <Stat icon={Timer} label="Esta semana" value="2 h 40 m" />
          <Stat icon={Trophy} label="Rudimentos" value="9 / 40" />
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="text-3xl">Continúa donde lo dejaste</h2>
            <ul className="mt-5 space-y-3">
              {lessons.map((lesson) => (
                <li
                  key={lesson.title}
                  className="panel group flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-primary/50"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <lesson.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{lesson.title}</p>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {lesson.level} · {lesson.minutes} min
                    </p>
                    <Progress value={lesson.progress} className="mt-3 h-1.5" />
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <Metronome />
            <div className="panel rounded-2xl p-6">
              <h3 className="text-xl">Reto semanal</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Paradiddles a 100 BPM durante 5 minutos sin perder el tempo.
              </p>
              <Progress value={60} className="mt-4 h-1.5" />
              <p className="mt-2 text-xs text-muted-foreground">3 de 5 sesiones completadas</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-6 py-8 text-center text-xs text-muted-foreground">
        Pulso · práctica de batería · instalable en tu teléfono
      </footer>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  return (
    <div className="panel rounded-2xl p-5">
      <Icon className="size-5 text-primary" />
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}
