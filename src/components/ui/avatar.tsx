import { Image, StyleSheet, Text, View } from "react-native";
import type { Perfil } from "@/lib/auth";
import { useDownloadUrl } from "@/lib/files";
import { colors, fonts } from "@/lib/theme";

// Profile photo, or the initials while there is none (or while it loads).
export function Avatar({
  nombre,
  foto,
  size = 40,
}: {
  nombre: string;
  foto?: Perfil["foto"];
  size?: number;
}) {
  const url = useDownloadUrl(foto?.ruta ?? null, foto?.actualizadoEn?.toMillis());
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        accessibilityLabel={`Foto de ${nombre}`}
        style={[circle, styles.photo]}
      />
    );
  }

  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
  return (
    <View style={[circle, styles.initials]}>
      <Text style={[styles.text, { fontSize: Math.round(size * 0.36) }]}>{iniciales || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: colors.muted,
  },
  initials: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(249, 161, 41, 0.16)",
  },
  text: {
    fontFamily: fonts.semibold,
    color: colors.primary,
  },
});
