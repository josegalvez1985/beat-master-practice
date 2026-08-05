import { useEffect, useState } from "react";
import { Minus, Plus, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Metronome() {
  const [bpm, setBpm] = useState(90);
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setBeat((b) => (b + 1) % 4), (60 / bpm) * 1000);
    return () => window.clearInterval(id);
  }, [playing, bpm]);

  return (
    <div className="panel rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Metrónomo
        </p>
        <span className="font-display text-2xl text-primary">{bpm} BPM</span>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full transition-colors ${
              playing && beat === i ? "bg-primary beat-dot" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="secondary" size="icon" onClick={() => setBpm((v) => Math.max(40, v - 5))}>
          <Minus />
          <span className="sr-only">Bajar tempo</span>
        </Button>
        <Button className="flex-1" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause /> : <Play />}
          {playing ? "Detener" : "Iniciar práctica"}
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setBpm((v) => Math.min(220, v + 5))}>
          <Plus />
          <span className="sr-only">Subir tempo</span>
        </Button>
      </div>
    </div>
  );
}