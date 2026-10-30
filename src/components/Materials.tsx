import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ExternalLink,
  FileAudio,
  FileImage,
  FileMusic,
  FileText,
  FileVideo,
  File as FileIcon,
  Play,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Button, buttonForeground } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  MAX_BYTES,
  borrarArchivo,
  elegirArchivos,
  formatearTamano,
  subirArchivo,
  useDownloadUrl,
  type Material,
  type MaterialTipo,
} from "@/lib/files";
import { colors, fonts, radius } from "@/lib/theme";

const iconos: Record<MaterialTipo, LucideIcon> = {
  audio: FileAudio,
  video: FileVideo,
  pdf: FileText,
  partitura: FileMusic,
  imagen: FileImage,
  otro: FileIcon,
};

const etiquetas: Record<MaterialTipo, string> = {
  audio: "Audio",
  video: "Video",
  pdf: "PDF",
  partitura: "Partitura",
  imagen: "Imagen",
  otro: "Archivo",
};

// List of stored files with inline players for audio and video.
export function MaterialList({
  materiales,
  onRemove,
}: {
  materiales: Material[];
  onRemove?: (material: Material) => void;
}) {
  return (
    <View style={styles.list}>
      {materiales.map((material) => (
        <MaterialRow key={material.id} material={material} onRemove={onRemove} />
      ))}
    </View>
  );
}

function MaterialRow({
  material,
  onRemove,
}: {
  material: Material;
  onRemove?: (material: Material) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const reproducible = material.tipo === "audio" || material.tipo === "video";
  // Players load their URL only when opened; other files need it for the "open" link.
  const url = useDownloadUrl(abierto || !reproducible ? material.ruta : null);
  const Icon = iconos[material.tipo];

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.icon}>
          <Icon size={18} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>
            {material.nombre}
          </Text>
          <Text style={styles.meta}>
            {etiquetas[material.tipo]} · {formatearTamano(material.tamano)}
          </Text>
        </View>
        {reproducible ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={abierto ? "Ocultar reproductor" : `Reproducir ${material.nombre}`}
            onPress={() => setAbierto((v) => !v)}
            style={styles.action}
          >
            <Play size={16} color={colors.foreground} />
          </Pressable>
        ) : null}
        {url && !reproducible ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Abrir ${material.nombre}`}
            href={url}
            hrefAttrs={{ target: "_blank", rel: "noopener" }}
            style={styles.action}
          >
            <ExternalLink size={16} color={colors.foreground} />
          </Pressable>
        ) : null}
        {onRemove ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${material.nombre}`}
            onPress={() => onRemove(material)}
            style={styles.action}
          >
            <Trash2 size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      {abierto && url ? (
        material.tipo === "video" ? (
          <video controls src={url} style={{ width: "100%", maxHeight: 360, borderRadius: 12 }} />
        ) : (
          <audio controls autoPlay src={url} style={{ width: "100%" }} />
        )
      ) : null}
    </View>
  );
}

type Subida = { nombre: string; porcentaje: number; error?: string };

// Picks files, uploads them one by one with progress, and reports each finished upload.
export function UploadButton({
  label,
  carpeta,
  accept,
  onUploaded,
  variant = "secondary",
}: {
  label: string;
  carpeta: string;
  accept: string;
  onUploaded: (material: Material) => Promise<void>;
  variant?: "default" | "secondary";
}) {
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const subiendo = subidas.some((s) => s.porcentaje < 100 && !s.error);

  const actualizar = (index: number, cambios: Partial<Subida>) =>
    setSubidas((actuales) => actuales.map((s, i) => (i === index ? { ...s, ...cambios } : s)));

  const onPress = async () => {
    const files = await elegirArchivos({ accept });
    if (files.length === 0) return;
    setSubidas(files.map((file) => ({ nombre: file.name, porcentaje: 0 })));
    for (const [index, file] of files.entries()) {
      if (file.size > MAX_BYTES) {
        actualizar(index, { error: `Supera ${formatearTamano(MAX_BYTES)}` });
        continue;
      }
      try {
        const material = await subirArchivo(carpeta, file, (porcentaje) =>
          actualizar(index, { porcentaje }),
        );
        try {
          await onUploaded(material);
        } catch (error) {
          // Not saved in Firestore: remove the file so it is not left orphaned in Storage.
          await borrarArchivo(material.ruta).catch(() => {});
          throw error;
        }
        actualizar(index, { porcentaje: 100 });
      } catch {
        actualizar(index, { error: "No se pudo subir" });
      }
    }
    setSubidas((actuales) => actuales.filter((s) => s.error));
  };

  return (
    <View style={styles.uploader}>
      <Button variant={variant} disabled={subiendo} onPress={onPress}>
        <Upload size={16} color={buttonForeground(variant)} />
        {subiendo ? "Subiendo..." : label}
      </Button>
      {subidas.map((subida, index) => (
        <View key={index} style={styles.progressRow}>
          <View style={styles.progressText}>
            <Text numberOfLines={1} style={styles.meta}>
              {subida.nombre}
            </Text>
            <Text style={[styles.meta, subida.error ? styles.error : null]}>
              {subida.error ?? `${subida.porcentaje}%`}
            </Text>
          </View>
          {subida.error ? null : <Progress value={subida.porcentaje} style={styles.progress} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    gap: 10,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  error: {
    color: colors.destructive,
  },
  action: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  uploader: {
    gap: 8,
  },
  progressRow: {
    gap: 6,
  },
  progressText: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  progress: {
    height: 6,
  },
});
