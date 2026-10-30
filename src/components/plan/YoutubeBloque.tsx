import { StyleSheet, Text, View } from "react-native";
import { Input } from "@/components/ui/input";
import { youtube, type Bloque } from "@/lib/plan";
import { colors, fonts, radius } from "@/lib/theme";

type Youtube = Extract<Bloque, { tipo: "youtube" }>;

// Reference video, embedded without tracking cookies (youtube-nocookie.com).
export function YoutubeBloque({
  bloque,
  editable,
  onChange,
}: {
  bloque: Youtube;
  editable: boolean;
  onChange: (bloque: Youtube) => void;
}) {
  const video = youtube(bloque.url);

  return (
    <View style={styles.wrap}>
      {editable ? (
        <>
          <Input
            value={bloque.url}
            onChangeText={(url) => onChange({ ...bloque, url: url.trim().slice(0, 300) })}
            placeholder="Pega el enlace de YouTube (también sirve con ?t=90 para empezar en un minuto)"
            accessibilityLabel="Enlace de YouTube"
            autoCapitalize="none"
            inputMode="url"
          />
          {bloque.url && !video ? (
            <Text style={styles.error}>Ese enlace no parece de un video de YouTube.</Text>
          ) : null}
        </>
      ) : null}
      {video ? (
        <View style={styles.frame}>
          <iframe
            title={bloque.titulo || "Video de YouTube"}
            src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0${video.inicio ? `&start=${video.inicio}` : ""}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </View>
      ) : !editable ? (
        <Text style={styles.vacio}>Sin video.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  frame: {
    position: "relative",
    width: "100%",
    maxWidth: 720,
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.destructive,
  },
  vacio: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});
