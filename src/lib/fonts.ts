import barlow400 from "@fontsource/barlow/files/barlow-latin-400-normal.woff2";
import barlow500 from "@fontsource/barlow/files/barlow-latin-500-normal.woff2";
import barlow600 from "@fontsource/barlow/files/barlow-latin-600-normal.woff2";
import barlow700 from "@fontsource/barlow/files/barlow-latin-700-normal.woff2";
import bebasNeue400 from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2";
import { fonts } from "@/lib/theme";

// Each weight is registered as its own family, matching the names in `fonts`.
const faces: [family: string, url: string][] = [
  [fonts.display, bebasNeue400],
  [fonts.sans, barlow400],
  [fonts.medium, barlow500],
  [fonts.semibold, barlow600],
  [fonts.bold, barlow700],
];

// Resolves once every font has loaded or failed, so the first paint uses them.
export function loadFonts() {
  return Promise.allSettled(
    faces.map(async ([family, url]) => {
      const face = await new FontFace(family, `url(${url})`).load();
      document.fonts.add(face);
    }),
  );
}
