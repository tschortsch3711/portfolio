// Baut index.html und projekte/<slug>/index.html aus daten/projekte.json.
// Aufruf: node werkzeug/bauen.mjs   (keine Abhängigkeiten)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const daten = JSON.parse(readFileSync(join(wurzel, "daten/projekte.json"), "utf8"));
const { seite, gruppen } = daten;

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// In großen Titeln nicht am Bindestrich umbrechen ("3D-|Drucker"): Wortverbinder U+2060 dahinter
const ohneBindestrichUmbruch = (s) => s.replace(/-(?=\p{L})/gu, "-⁠");
const nr = (i) => String(i).padStart(2, "0");
const ohneProtokoll = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Alle Projekte in Reihenfolge, mit laufender Nummer und Gruppe
const alle = [];
for (const g of gruppen) for (const p of g.projekte) alle.push({ ...p, gruppe: g, nr: nr(alle.length + 1) });

function kopfdaten({ titel, beschreibung, url, bild, bildAlt, wurzelPfad, typ }) {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
<meta name="author" content="${esc(seite.name)}">
<meta name="theme-color" content="#ffffff">
<meta name="color-scheme" content="light">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="${typ}">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="${esc(seite.name)}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschreibung)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(bild)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(bildAlt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${wurzelPfad}favicon.svg" type="image/svg+xml">
<link rel="preload" href="${wurzelPfad}fonts/Sen/Sen-Bold.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${wurzelPfad}assets/css/tokens.css">
<link rel="stylesheet" href="${wurzelPfad}assets/css/site.css">`;
}

function kopf(wurzelPfad) {
  return `<a class="springen" href="#inhalt">Zum Inhalt springen</a>
<header class="kopf">
  <div class="rahmen">
    <a class="wortmarke" href="${wurzelPfad}" aria-label="${esc(seite.name)}, zur Übersicht">
      <span class="wortmarke-zeichen" aria-hidden="true">nd</span>
      <span class="wortmarke-name">${esc(seite.name)}</span>
    </a>
    <a class="kopf-link" href="${esc(seite.github)}">GitHub</a>
  </div>
</header>`;
}

function fuss() {
  return `<footer class="fuss">
  <div class="rahmen">
    <span>${esc(seite.name)} · Freising</span>
    <span>Statische Seite, ohne Tracking</span>
    <a href="${esc(seite.github)}">github.com/tschortsch3711</a>
  </div>
</footer>`;
}

const seitenRahmen = (kopfdatenHtml, koerper) => `<!DOCTYPE html>
<html lang="de">
<head>
${kopfdatenHtml}
</head>
<body>
${koerper}
</body>
</html>
`;

// Startseite ----------------------------------------------------------------
function startseite() {
  const gruppenHtml = gruppen
    .map((g) => {
      const zeilen = alle
        .filter((p) => p.gruppe.id === g.id)
        .map(
          (p) => `        <li>
          <a class="zeile" href="projekte/${p.slug}/">
            <span class="zeile-nr" aria-hidden="true">${p.nr}</span>
            <span class="zeile-name">${esc(p.name)}</span>
            <span class="zeile-satz">${esc(p.satz)}</span>
            <span class="zeile-pfeil" aria-hidden="true">→</span>
          </a>
        </li>`
        )
        .join("\n");
      return `    <section class="gruppe" aria-labelledby="g-${g.id}">
      <div class="gruppe-kopf">
        <h2 class="etikett" id="g-${g.id}">${esc(g.name)}</h2>
        <span class="etikett" aria-hidden="true">${g.projekte.length}</span>
      </div>
      <ul>
${zeilen}
      </ul>
    </section>`;
    })
    .join("\n\n");

  const koerper = `${kopf("./")}
<main id="inhalt">
  <div class="rahmen">
    <section class="einleitung">
      <h1>${esc(seite.einleitungTitel)}</h1>
      <p>${esc(seite.einleitung)}</p>
    </section>

${gruppenHtml}
  </div>
</main>
${fuss()}`;

  return seitenRahmen(
    kopfdaten({
      titel: seite.titel,
      beschreibung: seite.beschreibung,
      url: seite.url,
      bild: `${seite.url}assets/bilder/og/start.png`,
      bildAlt: `${seite.name}: ${seite.einleitungTitel}`,
      wurzelPfad: "./",
      typ: "website",
    }),
    koerper
  );
}

// Projektseite --------------------------------------------------------------
function projektseite(p, i) {
  const w = "../../";
  const naechstes = alle[(i + 1) % alle.length];
  const url = `${seite.url}projekte/${p.slug}/`;
  const bild = `${w}assets/bilder/${p.slug}`;
  if (!existsSync(join(wurzel, `assets/bilder/${p.slug}-1600.webp`)))
    console.warn(`  Hinweis: Screenshot für ${p.slug} fehlt noch (werkzeug/bilder.mjs)`);

  const fakten = [
    ["Was", p.fakten.was],
    ["Für wen", p.fakten.fuerWen],
    ["Womit gebaut", p.fakten.womit],
    ["Stand", p.fakten.stand],
  ]
    .map(([k, v]) => `      <div><dt class="etikett">${k}</dt><dd>${esc(v)}</dd></div>`)
    .join("\n");

  const absaetze = p.absaetze
    .map(
      (a) => `      <div class="text-block">
        <h2>${esc(a.titel)}</h2>
        <div><p>${esc(a.text)}</p></div>
      </div>`
    )
    .join("\n");

  const links = p.links
    .map(
      (l) => `        <li>
          <a class="weiter-link" href="${esc(l.url)}">
            <span class="weiter-was">${esc(l.was)}</span>
            <span class="weiter-wo">${esc(ohneProtokoll(l.url))}</span>
            <span class="zeile-pfeil" aria-hidden="true">↗</span>
          </a>
        </li>`
    )
    .join("\n");

  const koerper = `${kopf(w)}
<main id="inhalt">
  <div class="rahmen">
    <section class="held" aria-labelledby="aussage">
      <p class="etikett"><span>${esc(p.gruppe.name)}</span><span>${p.nr} / ${nr(alle.length)}</span><span>${esc(p.name)}</span></p>
      <h1 id="aussage">${ohneBindestrichUmbruch(esc(p.aussage))}</h1>
      <p class="held-unter">${esc(p.unter)}</p>
      <figure>
        <div class="bild">
          <img src="${bild}-1600.webp" srcset="${bild}-800.webp 800w, ${bild}-1600.webp 1600w" sizes="(max-width: 64rem) 100vw, 60rem" width="1600" height="1000" alt="${esc(p.bildAlt)}" fetchpriority="high">
        </div>
        <figcaption class="bild-unter etikett">Screenshot der Live-Seite, ${esc(seite.bilderStand)}</figcaption>
      </figure>
    </section>

    <dl class="band" aria-label="Fakten">
${fakten}
    </dl>

    <section class="text" aria-label="Mehr über ${esc(p.name)}">
${absaetze}
    </section>

    <nav class="weiter" aria-labelledby="weiter">
      <div class="gruppe-kopf"><h2 class="etikett" id="weiter">Weiter</h2></div>
      <ul class="weiter-liste">
${links}
        <li>
          <a class="weiter-link" href="${w}projekte/${naechstes.slug}/">
            <span class="weiter-was">Nächstes Projekt</span>
            <span class="weiter-wo">${esc(naechstes.name)}</span>
            <span class="zeile-pfeil" aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
    </nav>
  </div>
</main>
${fuss()}`;

  return seitenRahmen(
    kopfdaten({
      titel: `${p.name} · ${seite.name}`,
      beschreibung: `${p.aussage} ${p.unter}`,
      url,
      bild: `${seite.url}assets/bilder/og/${p.slug}.jpg`,
      bildAlt: p.bildAlt,
      wurzelPfad: w,
      typ: "article",
    }),
    koerper
  );
}

// Schreiben -----------------------------------------------------------------
function schreibe(pfad, inhalt) {
  const ziel = join(wurzel, pfad);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt, "utf8");
  console.log(`  ${pfad}`);
}

console.log("Baue Seiten:");
schreibe("index.html", startseite());
alle.forEach((p, i) => schreibe(`projekte/${p.slug}/index.html`, projektseite(p, i)));
