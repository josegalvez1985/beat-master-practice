import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Database, FileText, RotateCcw, Users } from "lucide-react";
import { shellStyles } from "@/components/AppShell";
import { PageMeta } from "@/components/PageMeta";
import { PlanesAdmin } from "@/components/PlanesAdmin";
import { Opciones } from "@/components/plan/comunes";
import { Button, buttonForeground } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Badge, Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { Stat } from "@/components/ui/stat";
import {
  verArchivos,
  verColeccion,
  verCuentas,
  verResumen,
  type ArchivoBackend,
  type CuentaBackend,
  type DocumentoBackend,
} from "@/lib/admin";
import { colors, fonts, radius } from "@/lib/theme";

type Vista = "planes" | "firestore" | "cuentas" | "archivos";

const VISTAS = [
  { value: "planes", label: "Planes" },
  { value: "firestore", label: "Colecciones" },
  { value: "cuentas", label: "Cuentas" },
  { value: "archivos", label: "Archivos" },
] as const;

const fecha = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-PY", { dateStyle: "medium", timeStyle: "short" })
    : "nunca";

const tamano = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 ** 2
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

const mensaje = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo leer el backend.";

// Admin panel: the profesor plans (PlanesAdmin, the only part that writes) and the whole backend,
// read-only (the data comes from the verBackend Cloud Function,
// which checks that whoever asks is the admin). Only reachable through RequireAdmin.
export default function Admin() {
  const [vista, setVista] = useState<Vista>("planes");
  const queryClient = useQueryClient();
  const resumen = useQuery({ queryKey: ["admin", "resumen"], queryFn: verResumen });
  const colecciones = resumen.data?.colecciones ?? [];
  const documentos = colecciones.reduce((suma, c) => suma + c.total, 0);

  return (
    <>
      <PageMeta title="Administración — Pulso" description="Todo el backend de Pulso." />
      <View style={styles.cabecera}>
        <View style={styles.flex}>
          <Text style={shellStyles.pageTitle}>Administración</Text>
          <Text style={shellStyles.pageSubtitle}>
            Los planes de los profesores y todo el backend de Pulso (Firestore, cuentas y archivos,
            solo lectura).
          </Text>
        </View>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
        >
          <RotateCcw size={14} color={buttonForeground("secondary")} />
          Recargar
        </Button>
      </View>

      {resumen.error ? (
        <Text style={styles.error}>{mensaje(resumen.error)}</Text>
      ) : (
        <View style={styles.stats}>
          <Stat
            icon={Database}
            label="Colecciones"
            value={resumen.data ? String(colecciones.length) : "…"}
          />
          <Stat
            icon={FileText}
            label="Registros"
            value={resumen.data ? documentos.toLocaleString("es-PY") : "…"}
          />
        </View>
      )}

      <Segmented value={vista} options={VISTAS} onChange={setVista} />

      {vista === "planes" ? (
        <PlanesAdmin />
      ) : vista === "firestore" ? (
        <Colecciones colecciones={colecciones} cargando={resumen.isPending} />
      ) : vista === "cuentas" ? (
        <Cuentas />
      ) : (
        <Archivos />
      )}
    </>
  );
}

function Colecciones({
  colecciones,
  cargando,
}: {
  colecciones: { nombre: string; total: number }[];
  cargando: boolean;
}) {
  const [elegida, setElegida] = useState("");
  const [filtro, setFiltro] = useState("");
  const nombre = elegida || colecciones[0]?.nombre || "";
  const consulta = useInfiniteQuery({
    queryKey: ["admin", "coleccion", nombre],
    queryFn: ({ pageParam }) => verColeccion(nombre, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguiente ?? undefined,
    enabled: !!nombre,
  });

  if (cargando) return <ActivityIndicator color={colors.primary} />;
  if (!colecciones.length)
    return <EmptyState icon={Database} title="La base no tiene colecciones" />;

  const todos = consulta.data?.pages.flatMap((p) => p.documentos) ?? [];
  const buscado = filtro.trim().toLowerCase();
  const visibles = buscado
    ? todos.filter((d) => (d.id + JSON.stringify(d.datos)).toLowerCase().includes(buscado))
    : todos;
  const total = colecciones.find((c) => c.nombre === nombre)?.total ?? 0;

  return (
    <Section
      title={nombre}
      subtitle={`${todos.length} de ${total} documentos cargados`}
      actions={
        <View style={styles.filtro}>
          <Input value={filtro} onChangeText={setFiltro} placeholder="Buscar en lo cargado" />
        </View>
      }
    >
      <Opciones
        chico
        opciones={colecciones.map((c) => ({ value: c.nombre, label: `${c.nombre} (${c.total})` }))}
        valor={nombre}
        onChange={(valor) => {
          setElegida(valor);
          setFiltro("");
        }}
      />
      {consulta.error ? <Text style={styles.error}>{mensaje(consulta.error)}</Text> : null}
      {consulta.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      {visibles.map((d) => (
        <Documento key={d.id} documento={d} />
      ))}
      {!consulta.isPending && buscado && !visibles.length ? (
        <Text style={styles.detalle}>Nada coincide en los documentos cargados.</Text>
      ) : null}
      <MasPaginas consulta={consulta} />
    </Section>
  );
}

// One document: its id and a hint of what it is; the whole data, on tap.
function Documento({ documento }: { documento: DocumentoBackend }) {
  const [abierto, setAbierto] = useState(false);
  // On a phone the date goes under the id instead of taking the right side of the row.
  const angosto = useWindowDimensions().width < 560;
  const pista = [
    "nombre",
    "titulo",
    "pregunta",
    "alumnoNombre",
    "profesorNombre",
    "email",
    "fecha",
    "error",
  ]
    .map((k) => documento.datos[k])
    .filter((v): v is string => typeof v === "string" && !!v)
    .slice(0, 2)
    .join(" · ");
  const Icono = abierto ? ChevronDown : ChevronRight;
  return (
    <View style={styles.fila}>
      <Pressable
        accessibilityRole="button"
        aria-expanded={abierto}
        onPress={() => setAbierto(!abierto)}
        style={styles.filaCabecera}
      >
        <Icono size={16} color={colors.mutedForeground} />
        <View style={styles.flex}>
          <Text selectable style={styles.id}>
            {documento.id}
          </Text>
          {pista ? (
            <Text numberOfLines={2} style={styles.detalle}>
              {pista}
            </Text>
          ) : null}
          {angosto ? <Text style={styles.detalle}>{fecha(documento.actualizado)}</Text> : null}
        </View>
        {angosto ? null : <Text style={styles.detalle}>{fecha(documento.actualizado)}</Text>}
      </Pressable>
      {abierto ? (
        <View style={styles.json}>
          <Text selectable style={styles.codigo}>
            {JSON.stringify(documento.datos, null, 2)}
          </Text>
          <Text style={styles.detalle}>
            Creado {fecha(documento.creado)} · actualizado {fecha(documento.actualizado)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Cuentas() {
  const consulta = useInfiniteQuery({
    queryKey: ["admin", "cuentas"],
    queryFn: ({ pageParam }) => verCuentas(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguiente ?? undefined,
  });
  const cuentas: CuentaBackend[] = consulta.data?.pages.flatMap((p) => p.cuentas) ?? [];
  const sinPerfil = cuentas.filter((c) => !c.conPerfil).length;

  return (
    <Section
      title="Cuentas de Authentication"
      subtitle={`${cuentas.length} cargadas${sinPerfil ? ` · ${sinPerfil} sin perfil` : ""}`}
    >
      {consulta.error ? <Text style={styles.error}>{mensaje(consulta.error)}</Text> : null}
      {consulta.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      {cuentas.map((c) => (
        <View key={c.uid} style={[styles.fila, styles.filaCabecera, styles.filaQueBaja]}>
          <Users size={16} color={colors.mutedForeground} />
          <View style={styles.info}>
            <Text selectable style={styles.id}>
              {c.email ?? "(sin correo)"}
            </Text>
            <Text selectable style={styles.detalle}>
              {c.uid} · creada {fecha(c.creada)} · último ingreso {fecha(c.ultimoIngreso)}
            </Text>
          </View>
          {c.deshabilitada ? <Badge label="Deshabilitada" /> : null}
          {c.conPerfil ? (
            <Badge label="Con perfil" tone="success" />
          ) : (
            <Text style={styles.alerta}>Sin perfil</Text>
          )}
        </View>
      ))}
      <MasPaginas consulta={consulta} />
    </Section>
  );
}

function Archivos() {
  const consulta = useInfiniteQuery({
    queryKey: ["admin", "archivos"],
    queryFn: ({ pageParam }) => verArchivos(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.siguiente ?? undefined,
  });
  const archivos: ArchivoBackend[] = consulta.data?.pages.flatMap((p) => p.archivos) ?? [];
  const peso = archivos.reduce((suma, a) => suma + a.tamano, 0);

  return (
    <Section title="Archivos de Storage" subtitle={`${archivos.length} cargados · ${tamano(peso)}`}>
      {consulta.error ? <Text style={styles.error}>{mensaje(consulta.error)}</Text> : null}
      {consulta.isPending ? <ActivityIndicator color={colors.primary} /> : null}
      {!consulta.isPending && !archivos.length && !consulta.error ? (
        <Text style={styles.detalle}>No hay archivos.</Text>
      ) : null}
      {archivos.map((a) => (
        <View key={a.ruta} style={[styles.fila, styles.filaCabecera]}>
          <FileText size={16} color={colors.mutedForeground} />
          <View style={styles.flex}>
            <Text selectable style={styles.id}>
              {a.ruta}
            </Text>
            <Text style={styles.detalle}>
              {tamano(a.tamano)} · {a.tipo ?? "sin tipo"} · {fecha(a.actualizado)}
            </Text>
          </View>
        </View>
      ))}
      <MasPaginas consulta={consulta} />
    </Section>
  );
}

function MasPaginas({
  consulta,
}: {
  consulta: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
}) {
  if (!consulta.hasNextPage) return null;
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={consulta.isFetchingNextPage}
      onPress={() => consulta.fetchNextPage()}
    >
      {consulta.isFetchingNextPage ? "Cargando…" : "Cargar más"}
    </Button>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  filtro: {
    width: 220,
    maxWidth: "100%",
  },
  fila: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  filaCabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
  // The badges go below the text on a phone.
  filaQueBaja: {
    flexWrap: "wrap",
  },
  info: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
    minWidth: 0,
  },
  // Ids, uids and Storage paths have no spaces: they break anywhere instead of widening the page.
  id: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.foreground,
    wordBreak: "break-all",
  } as object,
  detalle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
    wordBreak: "break-word",
  } as object,
  json: {
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  codigo: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    color: colors.foreground,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  } as object,
  error: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.destructive,
  },
  alerta: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.destructive,
  },
});
