import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { UploadButton } from "@/components/Materials";
import { Button, buttonForeground } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { avisar, useBorrarConDeshacer } from "@/components/ui/toast";
import {
  guardarArchivoEnBiblioteca,
  quitarArchivoDeBiblioteca,
  useBibliotecaArchivos,
  usarArchivoBiblioteca,
  type Clase,
} from "@/lib/data";
import { ACCEPT_MATERIAL, formatearTamano } from "@/lib/files";
import { colors, fonts, radius } from "@/lib/theme";

// The files a profesor uses again and again (a PDF of scales, a backing track). Uploaded once;
// "Usar" copies it into the class on the server, so every class owns its copy.
export function BibliotecaArchivos({ clase, uid }: { clase: Clase; uid: string }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <Button variant="secondary" onPress={() => setAbierta(true)}>
        <FolderOpen size={16} color={buttonForeground("secondary")} />
        De mi biblioteca
      </Button>
      <Dialog
        visible={abierta}
        onClose={() => setAbierta(false)}
        title="Mi biblioteca de archivos"
        description="Súbelos una vez y úsalos en cualquier clase. Cada clase recibe su copia: borrar uno de aquí no lo quita de las clases."
      >
        <Lista clase={clase} uid={uid} />
      </Dialog>
    </>
  );
}

function Lista({ clase, uid }: { clase: Clase; uid: string }) {
  const archivos = useBibliotecaArchivos(uid);
  const [usando, setUsando] = useState<string | null>(null);
  const { ocultos, borrar } = useBorrarConDeshacer();
  const visibles = archivos.data
    .filter((a) => !ocultos.has(a.id))
    .sort((a, b) => a.material.nombre.localeCompare(b.material.nombre, "es"));

  const usar = async (id: string) => {
    setUsando(id);
    try {
      const { nombre } = await usarArchivoBiblioteca(clase.id, id);
      avisar({ texto: `«${nombre}» agregado a la clase.` });
    } catch (e) {
      const { code, message } = (e ?? {}) as { code?: string; message?: string };
      avisar({
        texto:
          code && code !== "functions/internal" && message
            ? message
            : "No se pudo agregar el archivo. Revisa tu conexión.",
        tipo: "error",
      });
    } finally {
      setUsando(null);
    }
  };

  return (
    <View style={styles.wrap}>
      {archivos.loading ? <ActivityIndicator color={colors.primary} /> : null}
      {!archivos.loading && !visibles.length ? (
        <Text style={styles.ayuda}>Todavía no guardaste archivos.</Text>
      ) : null}
      {visibles.map((archivo) => (
        <View key={archivo.id} style={styles.fila}>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.nombre}>
              {archivo.material.nombre}
            </Text>
            <Text style={styles.ayuda}>{formatearTamano(archivo.material.tamano)}</Text>
          </View>
          <Button
            variant="secondary"
            size="sm"
            disabled={usando !== null}
            onPress={() => void usar(archivo.id)}
          >
            <Plus size={14} color={buttonForeground("secondary")} />
            {usando === archivo.id ? "Agregando…" : "Usar"}
          </Button>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${archivo.material.nombre} de la biblioteca`}
            onPress={() =>
              borrar(archivo.id, `«${archivo.material.nombre}» quitado de tu biblioteca`, () =>
                quitarArchivoDeBiblioteca(archivo),
              )
            }
            style={styles.quitar}
          >
            <Trash2 size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ))}
      <UploadButton
        label="Subir a mi biblioteca"
        carpeta={`biblioteca/${uid}`}
        accept={ACCEPT_MATERIAL}
        onUploaded={(material) => guardarArchivoEnBiblioteca(uid, material)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    gap: 10,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.muted,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  ayuda: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  quitar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
