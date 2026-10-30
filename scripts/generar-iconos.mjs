// Renders public/favicon.svg to every PNG icon, the logos (public/brand/) and the share image
// (public/og-image.png) with headless Chrome. Run after changing the mark: npm run iconos
// CHROME_PATH overrides the Chrome executable.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const project = join(import.meta.dirname, "..");
const chrome = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const work = mkdtempSync(join(tmpdir(), "pulso-iconos-"));

const svg = readFileSync(join(project, "public/favicon.svg"), "utf8");
const fonts = join(project, "node_modules/@fontsource");
const font = (pkg, file) => pathToFileURL(join(fonts, pkg, "files", file)).href;

function shot(name, width, height, body, { transparent = false, scale = 1 } = {}) {
  const html = join(work, `${name}.html`);
  writeFileSync(
    html,
    `<!doctype html><html><head><meta charset="utf-8"><style>
      @font-face { font-family: Bebas; src: url(${font("bebas-neue", "bebas-neue-latin-400-normal.woff2")}); }
      @font-face { font-family: Barlow; font-weight: 500; src: url(${font("barlow", "barlow-latin-500-normal.woff2")}); }
      @font-face { font-family: Barlow; font-weight: 600; src: url(${font("barlow", "barlow-latin-600-normal.woff2")}); }
      html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: ${transparent ? "transparent" : "#100c0a"}; }
      svg.icon { display: block; width: 100%; height: 100%; }
    </style></head><body>${body}</body></html>`,
  );
  const out = join(work, `${name}.png`);
  execFileSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--force-device-scale-factor=${scale}`,
    ...(transparent ? ["--default-background-color=00000000"] : []),
    `--window-size=${width},${height}`,
    "--virtual-time-budget=3000",
    `--screenshot=${out}`,
    pathToFileURL(html).href,
  ]);
  return out;
}

const icon = svg.replace("<svg ", '<svg class="icon" ');

function logo(name, textColor) {
  return shot(
    name,
    1400,
    480,
    `<div style="display:flex;align-items:center;gap:72px;height:480px;padding:0 64px;box-sizing:border-box;">
      <div style="width:352px;height:352px;flex:none;border-radius:80px;overflow:hidden;">${icon}</div>
      <div style="font-family:Bebas;font-size:300px;line-height:1;letter-spacing:12px;color:${textColor};
          padding-top:28px;">PULSO</div>
    </div>`,
    { transparent: true, scale: 2 },
  );
}
const outputs = {
  "favicon.png": shot("favicon-96", 96, 96, icon),
  "icons/icon-192.png": shot("icon-192", 192, 192, icon),
  "icons/icon-512.png": shot("icon-512", 512, 512, icon),
  "icons/apple-touch-icon.png": shot("apple-180", 180, 180, icon),
  "brand/icon-1024.png": shot("icon-1024", 1024, 1024, icon),
  // Horizontal logo on a transparent background, rendered at 2x (1400x480 -> 2800x960):
  // light text for dark backgrounds, dark text for light ones.
  "brand/logo.png": logo("logo", "#f8f5ef"),
  "brand/logo-fondo-claro.png": logo("logo-claro", "#100c0a"),
  "og-image.png": shot(
    "og",
    1200,
    630,
    `<div style="position:relative;width:1200px;height:630px;overflow:hidden;
        background:radial-gradient(ellipse 900px 520px at 50% -10%, rgba(249,161,41,.32), rgba(249,161,41,0) 70%), #100c0a;
        display:flex;align-items:center;gap:64px;padding:0 96px;box-sizing:border-box;">
      <div style="width:300px;height:300px;flex:none;border-radius:64px;overflow:hidden;
          box-shadow:0 0 0 2px rgba(249,161,41,.25), 0 30px 80px rgba(0,0,0,.5);">${icon}</div>
      <div style="color:#f8f5ef;">
        <div style="font-family:Bebas;font-size:168px;line-height:.9;letter-spacing:6px;">PULSO</div>
        <div style="font-family:Barlow;font-weight:600;font-size:44px;line-height:1.2;margin-top:18px;">
          Clases y práctica de música<br>en Paraguay
        </div>
        <div style="font-family:Barlow;font-weight:500;font-size:30px;color:#f9a129;margin-top:22px;">
          Guitarra · Arpa paraguaya · Piano · Batería y más
        </div>
      </div>
      <div style="position:absolute;right:56px;bottom:40px;font-family:Barlow;font-weight:500;
          font-size:24px;color:#a69d91;">www.pypulso.online</div>
    </div>`,
  ),
};

for (const [target, source] of Object.entries(outputs)) {
  writeFileSync(join(project, "public", target), readFileSync(source));
  console.log(target);
}
