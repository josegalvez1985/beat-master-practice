import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Play } from "lucide-react";
import { oidoStyles } from "@/components/herramientas/Oido";
import { PrimeraVista } from "@/components/herramientas/PrimeraVista";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { tocarNota } from "@/lib/audio";
import { clavesPara, type Clave } from "@/lib/herramientas";
import type { InstrumentId } from "@/lib/instruments";
import { frecuenciaDe } from "@/lib/notas";
import { colors, fonts } from "@/lib/theme";

// Note reading: a note on the staff, name it as fast as you can; or a whole new melody to read
// at first sight. Only the clefs the instrument reads, natural notes only.

const NOMBRES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
const SEMITONOS = [0, 2, 4, 5, 7, 9, 11];
// Diatonic step (octave × 7 + letter) of the bottom line: E4 in treble clef, G2 in bass clef.
const LINEA_INFERIOR: Record<Clave, number> = { sol: 4 * 7 + 2, fa: 2 * 7 + 4 };

// Staff positions (0 = bottom line, 8 = top line): inside the staff, or with two ledger lines.
const RANGOS = { pentagrama: [0, 8], adicionales: [-4, 12] } as const;

const midiDe = (paso: number) => (Math.floor(paso / 7) + 1) * 12 + SEMITONOS[paso % 7]!;

export function LecturaNotas({ instrumento }: { instrumento: InstrumentId }) {
  const claves = clavesPara(instrumento);
  const [clave, setClave] = useState<Clave>(claves[0] ?? "sol");
  const [modo, setModo] = useState<"notas" | "melodia">("notas");
  const [rango, setRango] = useState<keyof typeof RANGOS>("pentagrama");
  const [posicion, setPosicion] = useState<number | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [puntos, setPuntos] = useState({ aciertos: 0, total: 0, racha: 0 });

  const paso = posicion === null ? null : LINEA_INFERIOR[clave] + posicion;
  const letra = paso === null ? null : paso % 7;

  const nueva = () => {
    const [desde, hasta] = RANGOS[rango];
    let siguiente = posicion;
    while (siguiente === posicion)
      siguiente = desde + Math.floor(Math.random() * (hasta - desde + 1));
    setPosicion(siguiente);
    setElegida(null);
  };

  const responder = (valor: number) => {
    if (paso === null || elegida !== null) return;
    setElegida(valor);
    tocarNota(frecuenciaDe(midiDe(paso)));
    const bien = valor === letra;
    setPuntos((p) => ({
      aciertos: p.aciertos + (bien ? 1 : 0),
      total: p.total + 1,
      racha: bien ? p.racha + 1 : 0,
    }));
  };

  const selectorDeClave =
    claves.length > 1 ? (
      <Opciones
        chico
        opciones={claves.map((c) => ({ value: c, label: `Clave de ${c}` }))}
        valor={clave}
        onChange={(c) => {
          setClave(c);
          setPosicion(null);
        }}
      />
    ) : null;

  const modos = (
    <Opciones
      opciones={[
        { value: "notas", label: "Notas sueltas" },
        { value: "melodia", label: "Primera vista" },
      ]}
      valor={modo}
      onChange={setModo}
    />
  );

  if (modo === "melodia")
    return (
      <View style={styles.wrap}>
        {modos}
        {selectorDeClave}
        <PrimeraVista key={clave} instrumento={instrumento} clave={clave} />
      </View>
    );

  return (
    <View style={styles.wrap}>
      {modos}
      <View style={styles.fila}>
        {selectorDeClave}
        <Opciones
          chico
          opciones={[
            { value: "pentagrama", label: "En el pentagrama" },
            { value: "adicionales", label: "Con líneas adicionales" },
          ]}
          valor={rango}
          onChange={(r) => {
            setRango(r);
            setPosicion(null);
          }}
        />
      </View>

      <View style={oidoStyles.marcador}>
        <Text style={oidoStyles.numero}>
          {puntos.aciertos}/{puntos.total}
        </Text>
        <Text style={oidoStyles.marcadorTexto}>
          aciertos{puntos.racha >= 3 ? ` · ${puntos.racha} seguidos` : ""}
        </Text>
      </View>

      <View style={styles.papel} accessibilityLabel={`Pentagrama en clave de ${clave}`}>
        <Pentagrama clave={clave} posicion={posicion} />
      </View>

      {posicion === null || elegida !== null ? (
        <Button style={styles.empezar} onPress={nueva}>
          <Play size={16} color={buttonForeground()} />
          {posicion === null ? "Empezar" : "Siguiente"}
        </Button>
      ) : null}

      {posicion !== null ? (
        <>
          <Text style={oidoStyles.consigna}>
            {elegida === null
              ? "¿Qué nota es?"
              : elegida === letra
                ? "¡Bien!"
                : `Era ${NOMBRES[letra!]}`}
          </Text>
          <View style={styles.respuestas}>
            {NOMBRES.map((nombre, i) => (
              <Pressable
                key={nombre}
                accessibilityRole="button"
                disabled={elegida !== null}
                onPress={() => responder(i)}
                style={[
                  oidoStyles.respuesta,
                  styles.respuesta,
                  elegida !== null && i === letra && oidoStyles.correcta,
                  elegida === i && i !== letra && oidoStyles.fallada,
                ]}
              >
                <Text style={oidoStyles.respuestaTexto}>{nombre}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

// Five lines on paper, the clef and a whole note with its ledger lines.
function Pentagrama({ clave, posicion }: { clave: Clave; posicion: number | null }) {
  const sep = 10;
  const abajo = 90;
  const y = (pos: number) => abajo - (pos * sep) / 2;
  const x = 150;
  const adicionales: number[] = [];
  if (posicion !== null) {
    for (let p = -2; p >= posicion; p -= 2) adicionales.push(p);
    for (let p = 10; p <= posicion; p += 2) adicionales.push(p);
  }
  const tinta = colors.paperInk;
  return (
    <svg viewBox="0 0 240 130" width="100%" style={{ maxWidth: 360 }} aria-hidden="true">
      {[0, 2, 4, 6, 8].map((p) => (
        <line key={p} x1={8} x2={232} y1={y(p)} y2={y(p)} stroke={tinta} strokeWidth={1.2} />
      ))}
      <text
        x={clave === "sol" ? 12 : 14}
        y={clave === "sol" ? y(0) + 11 : y(6) + 9}
        fontSize={clave === "sol" ? 68 : 38}
        fill={tinta}
        fontFamily="'Noto Music', 'Segoe UI Symbol', 'Apple Symbols', 'Bravura', serif"
      >
        {clave === "sol" ? "\u{1D11E}" : "\u{1D122}"}
      </text>
      {adicionales.map((p) => (
        <line
          key={p}
          x1={x - 14}
          x2={x + 14}
          y1={y(p)}
          y2={y(p)}
          stroke={tinta}
          strokeWidth={1.2}
        />
      ))}
      {posicion !== null ? (
        <ellipse
          cx={x}
          cy={y(posicion)}
          rx={7.5}
          ry={5}
          fill="none"
          stroke={tinta}
          strokeWidth={2.4}
          transform={`rotate(-20 ${x} ${y(posicion)})`}
        />
      ) : null}
    </svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  fila: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  papel: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  empezar: {
    alignSelf: "flex-start",
  },
  respuestas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  respuesta: {
    minWidth: 64,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
