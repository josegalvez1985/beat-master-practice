import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { MaterialList, UploadButton } from "@/components/Materials";
import { Partitura } from "@/components/plan/Partitura";
import { ACCEPT_MATERIAL, useDownloadUrl, type Material } from "@/lib/files";
import type { Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Archivos = Extract<Bloque, { tipo: "archivos" }>;

// Images as a gallery; PDF, Guitar Pro and MusicXML with an inline preview; audio and video with
// players. Uploading and removing go through the plan (it saves right away, see PlanClase).
export function ArchivosBloque({
  bloque,
  editable,
  claseId,
  onAgregar,
  onQuitar,
}: {
  bloque: Archivos;
  editable: boolean;
  claseId: string;
  onAgregar: (material: Material) => Promise<void>;
  onQuitar: (material: Material) => void;
}) {
  const imagenes = bloque.archivos.filter((m) => m.tipo === "imagen");
  const otros = bloque.archivos.filter((m) => m.tipo !== "imagen");
  const previsualizables = otros.filter((m) => m.tipo === "pdf" || m.tipo === "partitura");

  return (
    <View style={styles.wrap}>
      {imagenes.length ? (
        <View style={styles.galeria}>
          {imagenes.map((imagen) => (
            <Miniatura
              key={imagen.id}
              material={imagen}
              onQuitar={editable ? onQuitar : undefined}
            />
          ))}
        </View>
      ) : null}
      {otros.length ? (
        <MaterialList materiales={otros} onRemove={editable ? onQuitar : undefined} />
      ) : null}
      {previsualizables.map((material) => (
        <Vista key={material.id} material={material} />
      ))}
      {bloque.archivos.length === 0 && !editable ? (
        <Text style={styles.vacio}>Sin archivos.</Text>
      ) : null}
      {editable ? (
        <UploadButton
          label="Subir imágenes, PDF, audio, video o Guitar Pro"
          carpeta={`clases/${claseId}`}
          accept={ACCEPT_MATERIAL}
          onUploaded={onAgregar}
        />
      ) : null}
    </View>
  );
}

function Miniatura({
  material,
  onQuitar,
}: {
  material: Material;
  onQuitar?: (m: Material) => void;
}) {
  const url = useDownloadUrl(material.ruta);
  return (
    <View style={styles.miniatura}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Abrir ${material.nombre}`}
        href={url ?? undefined}
        hrefAttrs={{ target: "_blank", rel: "noopener" }}
        style={styles.miniaturaLink}
      >
        {url ? (
          <Image
            source={{ uri: url }}
            resizeMode="cover"
            style={styles.imagen}
            accessibilityLabel={material.nombre}
          />
        ) : (
          <View style={styles.imagen} />
        )}
      </Pressable>
      {onQuitar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${material.nombre}`}
          onPress={() => onQuitar(material)}
          style={styles.quitar}
        >
          <X size={12} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

// Inline preview of a PDF or a score file, opened on demand.
function Vista({ material }: { material: Material }) {
  const [abierta, setAbierta] = useState(false);
  const url = useDownloadUrl(abierta ? material.ruta : null);
  const Icono = abierta ? ChevronUp : ChevronDown;
  return (
    <View style={styles.vista}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setAbierta(!abierta)}
        style={styles.vistaToggle}
      >
        <Icono size={14} color={colors.primary} />
        <Text style={styles.vistaToggleText} numberOfLines={1}>
          {abierta ? "Ocultar" : material.tipo === "pdf" ? "Ver PDF" : "Ver partitura"}:{" "}
          {material.nombre}
        </Text>
      </Pressable>
      {abierta && url ? (
        material.tipo === "pdf" ? (
          <iframe
            title={material.nombre}
            src={url}
            style={{ width: "100%", height: 560, border: 0, borderRadius: 12, background: "#fff" }}
          />
        ) : (
          <Partitura url={url} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  galeria: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  miniatura: {
    position: "relative",
  },
  miniaturaLink: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  imagen: {
    width: 160,
    height: 120,
    backgroundColor: colors.muted,
  },
  quitar: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  vista: {
    gap: 8,
  },
  vistaToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  vistaToggleText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  vacio: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
