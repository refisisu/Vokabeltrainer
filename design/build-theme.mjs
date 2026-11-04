// Erzeugt vt-theme.css aus vt-tokens.json.  Aufruf: node build-theme.mjs [tokens.json] [out.css]
import { readFileSync, writeFileSync } from "node:fs";

const [src = "vt-tokens.json", out = "vt-theme.css"] = process.argv.slice(2);
const t = JSON.parse(readFileSync(src, "utf8"));
// Beide Designs laufen nebeneinander: Alles gilt nur, wenn das neue Design gewählt ist.
const SCOPE = 'body[data-design="heft"]';
const block = (sel, vars) =>
  `${sel}{\n${Object.entries(vars).filter(([k]) => !k.startsWith("$")).map(([k, v]) => `  ${k.startsWith("--") ? k : "--" + k}:${String(v).replace(/^\{(.+)\}$/, "var(--$1)")};`).join("\n")}\n}\n`;

let css = `/* Vokabeltrainer — generiert aus ${src}. Nicht von Hand ändern. */\n\n`;

// Schriften (selbst gehostet, damit die PWA offline funktioniert)
const fam = { display: "Bricolage Grotesque", ui: "Atkinson Hyperlegible Next", mono: "Spline Sans Mono" };
for (const [k, f] of Object.entries(t.font))
  css += `@font-face{font-family:"${fam[k]}";src:url("${f.file}") format("woff2");font-weight:${f.weight};font-style:normal;font-display:swap;}\n`;

// Theme-unabhängige Tokens
const root = {};
for (const [k, f] of Object.entries(t.font)) root[`font-${k}`] = f.stack;
for (const g of ["space", "radius", "border", "tilt", "motion"]) Object.assign(root, t[g]);
css += "\n" + block(SCOPE, root);

// Themes: hell = body.theme-x, dunkel = body.theme-x[data-mode="dark"] oder data-mode="auto" + System dunkel
let auto = "";
for (const [name, modes] of Object.entries(t.themes)) {
  const base = modes.light ?? modes.dark;
  css += "\n" + block(`${SCOPE}.theme-${name}`, base);
  if (modes.light && modes.dark) {
    css += block(`${SCOPE}.theme-${name}[data-mode="dark"]`, modes.dark);
    auto += block(`  ${SCOPE}.theme-${name}[data-mode="auto"]`, modes.dark);
  }
}
if (auto) css += `\n@media (prefers-color-scheme: dark){\n${auto}}\n`;

// Textstile als Klassen
css += "\n";
for (const [name, s] of Object.entries(t.text)) {
  const p = [`font-family:var(--font-${s.family})`, `font-size:${s.fontSize}`, `line-height:${s.lineHeight}`, `font-weight:${s.fontWeight}`];
  if (s.letterSpacing) p.push(`letter-spacing:${s.letterSpacing}`);
  if (s.family === "display") p.push(`font-variation-settings:"opsz" 96`);
  if (s.family === "mono") p.push("font-variant-numeric:tabular-nums");
  css += `.t-${name}{${p.join(";")}}\n`;
}

// Übergangsschicht: alte Variablennamen zeigen auf neue Tokens
css += `\n/* Übergang: alte Namen aus index.html. Nach der Migration entfernen. */\n` +
  block(`${SCOPE}[class*="theme-"]`, t.legacy);

css += `\n@media (prefers-reduced-motion: reduce){${SCOPE}{--t-press:0ms;--t-stamp:0ms}}\n`;
writeFileSync(out, css);
console.log(`${out}: ${css.length} Zeichen, ${Object.keys(t.themes).length} Themes`);
