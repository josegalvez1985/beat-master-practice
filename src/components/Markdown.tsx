import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link } from "@/components/Link";
import { colors, fonts } from "@/lib/theme";

// The assistant's answers: a small Markdown subset (headings, lists, paragraphs, **bold**,
// *italic*, `code` and links), always as React nodes, never as HTML. Internal links ("/…")
// navigate inside the app.

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function enLinea(texto: string, clave: string): ReactNode[] {
  return texto.split(INLINE).map((parte, i) => {
    const k = `${clave}-${i}`;
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4)
      return (
        <Text key={k} style={styles.negrita}>
          {parte.slice(2, -2)}
        </Text>
      );
    if (parte.startsWith("`") && parte.endsWith("`") && parte.length > 2)
      return (
        <Text key={k} style={styles.codigo}>
          {parte.slice(1, -1)}
        </Text>
      );
    const enlace = parte.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (enlace) {
      const [, etiqueta = "", destino = ""] = enlace;
      if (destino.startsWith("/"))
        return (
          <Link key={k} href={destino}>
            <Text style={styles.enlace}>{etiqueta}</Text>
          </Link>
        );
      if (/^https?:\/\//.test(destino))
        return (
          <Text
            key={k}
            href={destino}
            hrefAttrs={{ target: "_blank", rel: "noopener noreferrer" }}
            style={styles.enlace}
          >
            {etiqueta}
          </Text>
        );
      return etiqueta;
    }
    if (parte.startsWith("*") && parte.endsWith("*") && parte.length > 2)
      return (
        <Text key={k} style={styles.cursiva}>
          {parte.slice(1, -1)}
        </Text>
      );
    return parte;
  });
}

type Bloque =
  | { tipo: "titulo"; texto: string }
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; items: { marca: string; texto: string }[] };

function bloques(texto: string): Bloque[] {
  const lista: Bloque[] = [];
  for (const linea of texto.replace(/\r\n/g, "\n").split("\n")) {
    const limpia = linea.trim();
    const anterior = lista.at(-1);
    if (!limpia) {
      lista.push({ tipo: "parrafo", texto: "" });
      continue;
    }
    const titulo = limpia.match(/^#{1,6}\s+(.*)$/);
    if (titulo) {
      lista.push({ tipo: "titulo", texto: titulo[1] ?? "" });
      continue;
    }
    const item = limpia.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      const marca = /^\d/.test(item[1] ?? "") ? (item[1] ?? "") : "•";
      if (anterior?.tipo === "lista") anterior.items.push({ marca, texto: item[2] ?? "" });
      else lista.push({ tipo: "lista", items: [{ marca, texto: item[2] ?? "" }] });
      continue;
    }
    if (anterior?.tipo === "parrafo" && anterior.texto) anterior.texto += " " + limpia;
    else lista.push({ tipo: "parrafo", texto: limpia });
  }
  return lista.filter((b) => b.tipo !== "parrafo" || b.texto);
}

export function Markdown({ texto }: { texto: string }) {
  return (
    <View style={styles.wrap}>
      {bloques(texto).map((b, i) => {
        if (b.tipo === "titulo")
          return (
            <Text key={i} style={styles.titulo}>
              {enLinea(b.texto, `t${i}`)}
            </Text>
          );
        if (b.tipo === "lista")
          return (
            <View key={i} style={styles.lista}>
              {b.items.map((item, j) => (
                <View key={j} style={styles.item}>
                  <Text style={styles.marca}>{item.marca}</Text>
                  <Text style={[styles.texto, styles.flex]}>
                    {enLinea(item.texto, `l${i}-${j}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        return (
          <Text key={i} style={styles.texto}>
            {enLinea(b.texto, `p${i}`)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.foreground,
  },
  flex: {
    flex: 1,
  },
  titulo: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.foreground,
  },
  negrita: {
    fontFamily: fonts.semibold,
  },
  cursiva: {
    fontStyle: "italic",
  },
  codigo: {
    fontFamily: "monospace",
    fontSize: 13,
    backgroundColor: colors.secondary,
  },
  enlace: {
    color: colors.foreground,
    textDecorationLine: "underline",
    textDecorationColor: colors.primary,
  },
  lista: {
    gap: 4,
  },
  item: {
    flexDirection: "row",
    gap: 8,
  },
  marca: {
    minWidth: 14,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 21,
    color: colors.primary,
  },
});
