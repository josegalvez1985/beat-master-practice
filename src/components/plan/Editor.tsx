import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  LayoutTemplate,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  ContenidoBloque,
  Fila,
  Herramienta,
  IconoEtapa,
  LineaDeTiempo,
  Opciones,
  planStyles,
  resumen,
} from "@/components/plan/comunes";
import { Practica } from "@/components/plan/Practica";
import { Button, buttonForeground } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ui/section";
import { Stepper } from "@/components/ui/stepper";
import { avisar } from "@/components/ui/toast";
import { guardarPlan, type Clase } from "@/lib/data";
import { borrarArchivo, type Material } from "@/lib/files";
import {
  MAX_BLOQUES,
  afinacionesPara,
  conAcordes,
  conCuerdas,
  estilos,
  etapa as etapaDe,
  etapas,
  fichaInicial,
  niveles,
  nuevoBloque,
  plantilla,
  tiposPara,
  type Bloque,
  type Etapa,
  type Ficha,
  type Plan,
  type TipoBloque,
} from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Guardado = "guardado" | "pendiente" | "guardando" | "error";

const ETAPA_SUGERIDA: Record<TipoBloque, Etapa> = {
  tempo: "calentamiento",
  tablatura: "tecnica",
  acordes: "repertorio",
  rasgueo: "repertorio",
  youtube: "repertorio",
  archivos: "repertorio",
  texto: "teoria",
};

// Seconds a deleted block or file can be restored before it is really deleted.
const DESHACER_MS = 6000;

// The profesor's lesson plan editor: autosaved, two columns on wide screens (sticky index with
// drag to reorder + one open block at a time), "+" between blocks and undoable deletes.
export function Editor({ clase }: { clase: Clase }) {
  // Local copy while editing: the profesor is the only writer, so later snapshots are ignored.
  const [plan, setPlan] = useState<Plan | null>(() =>
    clase.bloques
      ? { ficha: clase.ficha ?? fichaInicial(clase.instrumento), bloques: clase.bloques }
      : null,
  );
  // Latest plan, for changes that arrive one after another before React re-renders (several
  // files uploaded in a row): each one must build on the previous, or a file would be dropped
  // from the plan and orphaned in Storage.
  const ultimo = useRef<Plan | null>(plan);
  const pendiente = useRef<Plan | null>(null);
  const [estado, setEstado] = useState<Guardado>("guardado");
  const [vistaAlumno, setVistaAlumno] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(plan?.bloques[0]?.id ?? null);
  const [paletaEn, setPaletaEn] = useState<number | null>(null);
  // Blocks and files deleted but still restorable: hidden here, still in the saved plan (and
  // their files still in Storage) until the undo time runs out.
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const borrados = useRef(new Map<string, { timer: number; ejecutar: () => Promise<void> }>());
  const { width } = useWindowDimensions();
  const dosColumnas = width >= 1100;

  const guardar = useCallback(
    async (nuevo: Plan) => {
      pendiente.current = null;
      setEstado("guardando");
      try {
        await guardarPlan(clase.id, nuevo);
        setEstado((actual) => (pendiente.current ? actual : "guardado"));
      } catch (error) {
        setEstado("error");
        avisar({ texto: "No se pudo guardar el plan. Revisa tu conexión.", tipo: "error" });
        throw error;
      }
    },
    [clase.id],
  );

  const aplicar = (cambio: (plan: Plan) => Plan) => {
    if (!ultimo.current) return null;
    const nuevo = cambio(ultimo.current);
    ultimo.current = nuevo;
    setPlan(nuevo);
    return nuevo;
  };

  // Text edits: save 800 ms after the last change.
  const cambiar = (cambio: (plan: Plan) => Plan) => {
    const nuevo = aplicar(cambio);
    if (!nuevo) return;
    pendiente.current = nuevo;
    setEstado("pendiente");
  };
  useEffect(() => {
    if (estado !== "pendiente" || !pendiente.current) return;
    const actual = pendiente.current;
    const timer = setTimeout(() => void guardar(actual).catch(() => {}), 800);
    return () => clearTimeout(timer);
  }, [plan, estado, guardar]);

  // File changes save immediately: an uploaded file must be referenced before anything else
  // happens (UploadButton deletes it if this throws).
  const cambiarYGuardar = async (cambio: (plan: Plan) => Plan) => {
    const nuevo = aplicar(cambio);
    if (nuevo) await guardar(nuevo);
  };

  const crear = (nuevo: Plan) => {
    ultimo.current = nuevo;
    setPlan(nuevo);
    setAbierto(nuevo.bloques[0]?.id ?? null);
    void guardar(nuevo).catch(() => {});
  };

  // --- Undoable deletes ---

  const mostrar = (id: string) =>
    setOcultos((actual) => {
      const nuevos = new Set(actual);
      nuevos.delete(id);
      return nuevos;
    });

  const confirmarBorrado = useCallback((id: string) => {
    const borrado = borrados.current.get(id);
    if (!borrado) return;
    borrados.current.delete(id);
    window.clearTimeout(borrado.timer);
    void borrado.ejecutar().then(
      () => mostrar(id),
      () => {
        mostrar(id);
        avisar({ texto: "No se pudo eliminar. Vuelve a probar.", tipo: "error" });
      },
    );
  }, []);

  const programarBorrado = (id: string, texto: string, ejecutar: () => Promise<void>) => {
    setOcultos((actual) => new Set(actual).add(id));
    const timer = window.setTimeout(() => confirmarBorrado(id), DESHACER_MS);
    borrados.current.set(id, { timer, ejecutar });
    avisar({
      texto,
      duracion: DESHACER_MS,
      accion: {
        label: "Deshacer",
        onPress: () => {
          const borrado = borrados.current.get(id);
          if (!borrado) return;
          window.clearTimeout(borrado.timer);
          borrados.current.delete(id);
          mostrar(id);
        },
      },
    });
  };

  // Leaving the page: finish pending deletes and save unsaved edits. Closing the tab instead
  // just keeps everything as it was saved (nothing is orphaned).
  useEffect(() => {
    const avisarAntes = (event: BeforeUnloadEvent) => {
      if (pendiente.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", avisarAntes);
    const pendientes = borrados.current;
    return () => {
      window.removeEventListener("beforeunload", avisarAntes);
      [...pendientes.keys()].forEach(confirmarBorrado);
      if (pendiente.current) void guardarPlan(clase.id, pendiente.current).catch(() => {});
    };
  }, [clase.id, confirmarBorrado]);

  if (!plan) {
    return (
      <Section
        title="Plan de la clase"
        subtitle="Arma la clase por bloques: calentamiento, técnica, repertorio y tarea."
      >
        <View style={styles.inicio}>
          <Button
            onPress={() =>
              crear({
                ficha: fichaInicial(clase.instrumento),
                bloques: plantilla(clase.instrumento),
              })
            }
          >
            <Sparkles size={16} color={buttonForeground()} />
            Usar plantilla de 60 min
          </Button>
          <Button
            variant="secondary"
            onPress={() => crear({ ficha: fichaInicial(clase.instrumento), bloques: [] })}
          >
            <LayoutTemplate size={16} color={buttonForeground("secondary")} />
            Empezar en blanco
          </Button>
        </View>
        <Text style={styles.ayuda}>
          {conCuerdas(clase.instrumento)
            ? "Incluye tablaturas con sonido, acordes, rasgueos, tempo con metrónomo, videos y archivos."
            : "Incluye tempo con metrónomo, videos de YouTube, archivos y textos."}
        </Text>
      </Section>
    );
  }

  const visibles = plan.bloques.filter((b) => !ocultos.has(b.id));
  const planVisible = { ...plan, bloques: visibles };

  if (vistaAlumno) {
    return (
      <View style={styles.vista}>
        <View style={styles.vistaBarra}>
          <Text style={styles.vistaTexto}>Vista del alumno</Text>
          <Button variant="secondary" size="sm" onPress={() => setVistaAlumno(false)}>
            <Pencil size={14} color={buttonForeground("secondary")} />
            Volver a editar
          </Button>
        </View>
        <Practica clase={clase} plan={planVisible} alumnoId={null} />
      </View>
    );
  }

  // --- Block operations (by id, so hidden blocks never shift positions) ---

  const actualizarBloque = (bloque: Bloque) =>
    cambiar((p) => ({ ...p, bloques: p.bloques.map((b) => (b.id === bloque.id ? bloque : b)) }));

  const moverA = (id: string, destinoId: string, despues: boolean) => {
    if (id === destinoId) return;
    cambiar((p) => {
      const bloques = [...p.bloques];
      const desde = bloques.findIndex((b) => b.id === id);
      const [bloque] = bloques.splice(desde, 1);
      if (!bloque) return p;
      const hasta = bloques.findIndex((b) => b.id === destinoId);
      bloques.splice(despues ? hasta + 1 : hasta, 0, bloque);
      return { ...p, bloques };
    });
  };

  const mover = (id: string, delta: number) => {
    const index = visibles.findIndex((b) => b.id === id);
    const vecino = visibles[index + delta];
    if (vecino) moverA(id, vecino.id, delta > 0);
  };

  const insertar = (tipo: TipoBloque, posicion: number) => {
    const bloque = nuevoBloque(tipo, clase.instrumento, ETAPA_SUGERIDA[tipo]);
    const antesDe = visibles[posicion]?.id;
    cambiar((p) => {
      const bloques = [...p.bloques];
      const index = antesDe ? bloques.findIndex((b) => b.id === antesDe) : bloques.length;
      bloques.splice(index, 0, bloque);
      return { ...p, bloques };
    });
    setAbierto(bloque.id);
    setPaletaEn(null);
  };

  const eliminar = (bloque: Bloque) => {
    const archivos = bloque.tipo === "archivos" ? bloque.archivos.length : 0;
    if (abierto === bloque.id) setAbierto(null);
    programarBorrado(
      bloque.id,
      `"${bloque.titulo || "Bloque"}" eliminado${archivos ? ` con ${archivos === 1 ? "su archivo" : `sus ${archivos} archivos`}` : ""}`,
      async () => {
        // Files first: if one fails, the block stays and keeps pointing at them.
        if (bloque.tipo === "archivos")
          await Promise.all(bloque.archivos.map((m) => borrarArchivo(m.ruta)));
        await cambiarYGuardar((p) => ({
          ...p,
          bloques: p.bloques.filter((b) => b.id !== bloque.id),
        }));
      },
    );
  };

  const agregarArchivo = (bloqueId: string) => async (material: Material) => {
    await cambiarYGuardar((p) => ({
      ...p,
      bloques: p.bloques.map((b) =>
        b.id === bloqueId && b.tipo === "archivos"
          ? { ...b, archivos: [...b.archivos, material] }
          : b,
      ),
    }));
  };

  const quitarArchivo = (bloqueId: string) => (material: Material) =>
    programarBorrado(material.id, `"${material.nombre}" quitado`, async () => {
      await borrarArchivo(material.ruta);
      await cambiarYGuardar((p) => ({
        ...p,
        bloques: p.bloques.map((b) =>
          b.id === bloqueId && b.tipo === "archivos"
            ? { ...b, archivos: b.archivos.filter((m) => m.id !== material.id) }
            : b,
        ),
      }));
    });

  const irA = (id: string) => {
    setAbierto(id);
    window.setTimeout(
      () =>
        document
          .getElementById(`bloque-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  const lista = (
    <View style={styles.lista}>
      {visibles.map((bloque, index) => (
        <View key={bloque.id} style={styles.lista}>
          {index > 0 ? (
            paletaEn === index ? (
              <PaletaDeBloques
                clase={clase}
                onElegir={(tipo) => insertar(tipo, index)}
                onCancelar={() => setPaletaEn(null)}
              />
            ) : (
              <Insertar onPress={() => setPaletaEn(index)} />
            )
          ) : null}
          <BloqueEditor
            bloque={bloque}
            clase={clase}
            abierto={abierto === bloque.id}
            primero={index === 0}
            ultimo={index === visibles.length - 1}
            ocultos={ocultos}
            onAlternar={() => setAbierto(abierto === bloque.id ? null : bloque.id)}
            onChange={actualizarBloque}
            onMover={(delta) => mover(bloque.id, delta)}
            onEliminar={() => eliminar(bloque)}
            onAgregarArchivo={agregarArchivo(bloque.id)}
            onQuitarArchivo={quitarArchivo(bloque.id)}
          />
        </View>
      ))}
      {plan.bloques.length < MAX_BLOQUES ? (
        paletaEn === visibles.length || visibles.length === 0 ? (
          <PaletaDeBloques
            clase={clase}
            onElegir={(tipo) => insertar(tipo, visibles.length)}
            onCancelar={visibles.length ? () => setPaletaEn(null) : undefined}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPaletaEn(visibles.length)}
            style={styles.agregar}
          >
            <Plus size={18} color={colors.primary} />
            <Text style={styles.agregarText}>Agregar bloque</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );

  return (
    <Section
      title="Plan de la clase"
      subtitle="Los cambios se guardan solos."
      actions={
        <View style={styles.acciones}>
          <EstadoGuardado estado={estado} />
          <Button variant="secondary" size="sm" onPress={() => setVistaAlumno(true)}>
            Vista del alumno
          </Button>
        </View>
      }
    >
      <View style={styles.editor}>
        <FichaEditor
          ficha={plan.ficha}
          instrumento={clase.instrumento}
          onChange={(ficha) => cambiar((p) => ({ ...p, ficha }))}
        />
        <LineaDeTiempo bloques={visibles} duracion={plan.ficha.duracion} />
        {dosColumnas && visibles.length ? (
          <View style={styles.columnas}>
            <Indice bloques={visibles} abierto={abierto} onIr={irA} onMoverA={moverA} />
            <View style={styles.flex}>{lista}</View>
          </View>
        ) : (
          lista
        )}
      </View>
    </Section>
  );
}

function EstadoGuardado({ estado }: { estado: Guardado }) {
  const texto = {
    guardado: "Guardado",
    pendiente: "Sin guardar…",
    guardando: "Guardando…",
    error: "No se pudo guardar",
  }[estado];
  return (
    <View style={styles.estado}>
      {estado === "guardado" ? <Check size={14} color={colors.success} /> : null}
      <Text style={[styles.estadoText, estado === "error" && { color: colors.destructive }]}>
        {texto}
      </Text>
    </View>
  );
}

// Sticky outline of the class: tap to open a block, drag to reorder (desktop).
function Indice({
  bloques,
  abierto,
  onIr,
  onMoverA,
}: {
  bloques: Bloque[];
  abierto: string | null;
  onIr: (id: string) => void;
  onMoverA: (id: string, destinoId: string, despues: boolean) => void;
}) {
  const arrastrado = useRef<string | null>(null);
  const [sobre, setSobre] = useState<{ id: string; despues: boolean } | null>(null);

  const posicion = (event: DragEvent<HTMLDivElement>) => {
    const caja = event.currentTarget.getBoundingClientRect();
    return event.clientY > caja.top + caja.height / 2;
  };

  return (
    <View style={styles.indice}>
      <Text style={styles.indiceTitulo}>Orden de la clase</Text>
      {bloques.map((bloque, index) => {
        const etapa = etapaDe(bloque.etapa);
        const marca =
          sobre?.id === bloque.id ? (sobre.despues ? styles.dropDespues : styles.dropAntes) : null;
        return (
          <div
            key={bloque.id}
            draggable
            onDragStart={(event) => {
              arrastrado.current = bloque.id;
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setSobre({ id: bloque.id, despues: posicion(event) });
            }}
            onDragLeave={() => setSobre(null)}
            onDrop={(event) => {
              event.preventDefault();
              if (arrastrado.current) onMoverA(arrastrado.current, bloque.id, posicion(event));
              arrastrado.current = null;
              setSobre(null);
            }}
            onDragEnd={() => setSobre(null)}
            style={{ cursor: "grab" }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ir a ${bloque.titulo || "bloque " + (index + 1)}`}
              onPress={() => onIr(bloque.id)}
              style={[styles.indiceItem, abierto === bloque.id && styles.indiceItemActivo, marca]}
            >
              <GripVertical size={14} color={colors.mutedForeground} />
              <View style={[styles.indicePunto, { backgroundColor: etapa.color }]} />
              <Text numberOfLines={1} style={styles.indiceNombre}>
                {bloque.titulo || "Sin título"}
              </Text>
              <Text style={styles.indiceMinutos}>{bloque.minutos}′</Text>
            </Pressable>
          </div>
        );
      })}
      <Text style={styles.indiceAyuda}>Arrastra para cambiar el orden.</Text>
    </View>
  );
}

function FichaEditor({
  ficha,
  instrumento,
  onChange,
}: {
  ficha: Ficha;
  instrumento: Clase["instrumento"];
  onChange: (ficha: Ficha) => void;
}) {
  return (
    <View style={styles.ficha}>
      <Fila label="Nivel">
        <Opciones
          opciones={niveles}
          valor={ficha.nivel}
          onChange={(nivel) => onChange({ ...ficha, nivel })}
        />
      </Fila>
      <Fila label="Estilo">
        <Opciones
          opciones={estilos.map((e) => ({ value: e, label: e }))}
          valor={ficha.estilo}
          onChange={(estilo) => onChange({ ...ficha, estilo })}
        />
      </Fila>
      {conCuerdas(instrumento) ? (
        <Fila label="Afinación">
          <Opciones
            opciones={afinacionesPara(instrumento).map((a) => ({ value: a.label, label: a.label }))}
            valor={ficha.afinacion}
            onChange={(afinacion) => onChange({ ...ficha, afinacion })}
          />
        </Fila>
      ) : null}
      <View style={styles.filaDoble}>
        {conAcordes(instrumento) ? (
          <Fila label="Capo">
            <Stepper
              label="capo"
              value={ficha.capo}
              min={0}
              max={12}
              suffix={ficha.capo ? "traste" : "sin capo"}
              onChange={(capo) => onChange({ ...ficha, capo })}
            />
          </Fila>
        ) : null}
        <Fila label="Duración">
          <Opciones
            opciones={[30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} min` }))}
            valor={String(ficha.duracion)}
            onChange={(duracion) => onChange({ ...ficha, duracion: Number(duracion) })}
          />
        </Fila>
      </View>
    </View>
  );
}

function BloqueEditor({
  bloque,
  clase,
  abierto,
  primero,
  ultimo,
  ocultos,
  onAlternar,
  onChange,
  onMover,
  onEliminar,
  onAgregarArchivo,
  onQuitarArchivo,
}: {
  bloque: Bloque;
  clase: Clase;
  abierto: boolean;
  primero: boolean;
  ultimo: boolean;
  ocultos: Set<string>;
  onAlternar: () => void;
  onChange: (bloque: Bloque) => void;
  onMover: (delta: number) => void;
  onEliminar: () => void;
  onAgregarArchivo: (material: Material) => Promise<void>;
  onQuitarArchivo: (material: Material) => void;
}) {
  const etapa = etapaDe(bloque.etapa);
  const Plegar = abierto ? ChevronUp : ChevronDown;

  return (
    <View
      nativeID={`bloque-${bloque.id}`}
      style={[planStyles.bloque, { borderLeftColor: etapa.color }, abierto && styles.bloqueAbierto]}
    >
      <View style={planStyles.bloqueHeader}>
        <IconoEtapa bloque={bloque} />
        {abierto ? (
          <View style={styles.titulo}>
            <Input
              value={bloque.titulo}
              onChangeText={(titulo) => onChange({ ...bloque, titulo: titulo.slice(0, 80) })}
              placeholder="Título del bloque"
              accessibilityLabel="Título del bloque"
              style={styles.tituloInput}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${bloque.titulo || "bloque"}`}
            onPress={onAlternar}
            style={styles.titulo}
          >
            <Text style={planStyles.tituloTexto} numberOfLines={1}>
              {bloque.titulo || "Sin título"}
            </Text>
            <Text style={planStyles.resumen} numberOfLines={1}>
              {etapa.label} · {resumen(bloque)}
            </Text>
          </Pressable>
        )}
        <Stepper
          label="minutos"
          value={bloque.minutos}
          min={0}
          max={180}
          step={5}
          suffix="min"
          onChange={(minutos) => onChange({ ...bloque, minutos })}
        />
        <View style={styles.herramientas}>
          <Herramienta
            label="Subir bloque"
            disabled={primero}
            onPress={() => onMover(-1)}
            icon={ArrowUp}
          />
          <Herramienta
            label="Bajar bloque"
            disabled={ultimo}
            onPress={() => onMover(1)}
            icon={ArrowDown}
          />
          <Herramienta label="Eliminar bloque" onPress={onEliminar} icon={Trash2} />
          <Herramienta
            label={abierto ? "Plegar bloque" : "Desplegar bloque"}
            onPress={onAlternar}
            icon={Plegar}
          />
        </View>
      </View>

      {abierto ? (
        <View style={planStyles.bloqueBody}>
          <Opciones
            opciones={etapas.map((e) => ({ value: e.value, label: e.label }))}
            valor={bloque.etapa}
            onChange={(valor) => onChange({ ...bloque, etapa: valor })}
            chico
          />
          <ContenidoBloque
            bloque={bloque}
            clase={clase}
            editable
            ocultos={ocultos}
            onChange={onChange}
            onAgregarArchivo={onAgregarArchivo}
            onQuitarArchivo={onQuitarArchivo}
          />
          <Input
            multiline
            value={bloque.notas}
            onChangeText={(notas) => onChange({ ...bloque, notas: notas.slice(0, 2000) })}
            placeholder={
              bloque.tipo === "texto"
                ? "Escribe las indicaciones, la teoría o la tarea…"
                : "Indicaciones para el alumno (opcional)"
            }
            accessibilityLabel="Indicaciones"
            style={[styles.notas, bloque.tipo === "texto" && styles.notasTexto]}
          />
        </View>
      ) : null}
    </View>
  );
}

// Thin "+" between two blocks: inserts right there.
function Insertar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Insertar un bloque aquí"
      onPress={onPress}
      style={({ pressed }) => [styles.insertar, pressed && styles.insertarActivo]}
    >
      <View style={styles.insertarLinea} />
      <View style={styles.insertarBoton}>
        <Plus size={14} color={colors.primary} />
      </View>
      <View style={styles.insertarLinea} />
    </Pressable>
  );
}

function PaletaDeBloques({
  clase,
  onElegir,
  onCancelar,
}: {
  clase: Clase;
  onElegir: (tipo: TipoBloque) => void;
  onCancelar?: () => void;
}) {
  return (
    <View style={styles.paleta}>
      <Text style={styles.paletaTitulo}>¿Qué quieres agregar?</Text>
      <View style={styles.paletaGrid}>
        {tiposPara(clase.instrumento).map((tipo) => (
          <Pressable
            key={tipo.value}
            accessibilityRole="button"
            onPress={() => onElegir(tipo.value)}
            style={({ pressed }) => [styles.tipo, pressed && styles.tipoActivo]}
          >
            <View style={styles.tipoIcono}>
              <tipo.icon size={20} color={colors.primary} />
            </View>
            <Text style={styles.tipoLabel}>{tipo.label}</Text>
            <Text style={styles.tipoDescripcion}>{tipo.descripcion}</Text>
          </Pressable>
        ))}
      </View>
      {onCancelar ? (
        <Pressable accessibilityRole="button" onPress={onCancelar} style={styles.cancelar}>
          <Text style={styles.cancelarText}>Cancelar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const sticky = { position: "sticky", top: 16 } as unknown as ViewStyle;

const styles = StyleSheet.create({
  inicio: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ayuda: {
    marginTop: 12,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  vista: {
    gap: 12,
  },
  vistaBarra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  vistaTexto: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  acciones: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  estado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  estadoText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  editor: {
    gap: 14,
  },
  ficha: {
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  filaDoble: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
  },
  columnas: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  indice: {
    ...sticky,
    width: 250,
    gap: 4,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  indiceTitulo: {
    paddingHorizontal: 6,
    paddingBottom: 6,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  indiceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  indiceItemActivo: {
    backgroundColor: colors.selected,
    borderColor: colors.primary,
  },
  dropAntes: {
    borderTopColor: colors.primary,
    borderTopWidth: 2,
  },
  dropDespues: {
    borderBottomColor: colors.primary,
    borderBottomWidth: 2,
  },
  indicePunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  indiceNombre: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  indiceMinutos: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    color: colors.mutedForeground,
  },
  indiceAyuda: {
    paddingHorizontal: 6,
    paddingTop: 6,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  lista: {
    gap: 10,
  },
  bloqueAbierto: {
    borderColor: colors.input,
  },
  titulo: {
    flex: 1,
    minWidth: 180,
  },
  tituloInput: {
    fontFamily: fonts.heading,
    fontSize: 18,
    borderColor: "transparent",
  },
  herramientas: {
    flexDirection: "row",
    gap: 2,
  },
  notas: {
    height: "auto",
    minHeight: 60,
    paddingVertical: 8,
  },
  notasTexto: {
    minHeight: 120,
  },
  insertar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 20,
    opacity: 0.55,
  },
  insertarActivo: {
    opacity: 1,
  },
  insertarLinea: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  insertarBoton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  agregar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  agregarText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.primary,
  },
  paleta: {
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.primary,
  },
  paletaTitulo: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.foreground,
  },
  paletaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tipo: {
    width: 150,
    flexGrow: 1,
    gap: 4,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tipoActivo: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  tipoIcono: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.selected,
  },
  tipoLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
  },
  tipoDescripcion: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  cancelar: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  cancelarText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
