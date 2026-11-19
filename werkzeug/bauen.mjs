// Baut index.html und projekte/<slug>/index.html aus daten/projekte.json.
// Aufruf: node werkzeug/bauen.mjs   (keine Abhängigkeiten)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
// Jede Fassung der Stylesheets bekommt eine eigene Adresse, damit nie neues HTML auf altes CSS trifft
const fassung = (datei) => createHash("sha256").update(readFileSync(join(wurzel, datei))).digest("hex").slice(0, 8);
const css = (wurzelPfad, name) => `${wurzelPfad}assets/css/${name}.css?v=${fassung(`assets/css/${name}.css`)}`;
const daten = JSON.parse(readFileSync(join(wurzel, "daten/projekte.json"), "utf8"));
const { seite, gruppen } = daten;

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// In großen Titeln nicht am Bindestrich umbrechen ("3D-|Drucker"): Wortverbinder U+2060 dahinter
const ohneBindestrichUmbruch = (s) => s.replace(/-(?=\p{L})/gu, "-⁠");
// Aussagen tragen Sinnabschnitte, getrennt durch „|“. Umbrochen wird nur dazwischen.
// Ein Zeilenwechsel „\n“ erzwingt eine neue Zeile in jeder Ansicht.
// „¦“ teilt einen Abschnitt noch einmal: Dort bricht er nur, wenn er als Ganzes nicht in die Zeile passt.
const flach = (s) => s.replace(/\s*[|¦\n]\s*/g, " ").replace(/\u00ad/g, "");
const teil = (t) => `<span class="z">${ohneBindestrichUmbruch(esc(t))}</span>`;
const abschnitt = (t) => t.includes("¦") ? `<span class="z">${t.split(/\s*¦\s*/).map(teil).join(" ")}</span>` : teil(t);
// In der Einleitung markiert „|“ den Zeilenwechsel, der nur in sehr breiten Fenstern gilt.
const einleitungSatz = (s) => s.split(/\s*\|\s*/).map(satz).join('<br class="weit"> ');
const abschnitte = (s) => s.split("\n").map((zeile) => zeile.split(/\s*\|\s*/).map(abschnitt).join(" ")).join("<br>");
const satz = (s) => ohneBindestrichUmbruch(esc(s));
const nr = (i) => String(i).padStart(2, "0");
const ohneProtokoll = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Alle Projekte in der Reihenfolge der Startseite (daten.start), mit laufender Nummer und Gruppe
const nachSlug = {};
for (const g of gruppen) for (const p of g.projekte) nachSlug[p.slug] = { ...p, gruppe: g };
const { start } = daten;
const reihenfolge = start.reihenfolge;
const fehlt = Object.keys(nachSlug).filter((s) => !reihenfolge.includes(s));
if (fehlt.length) throw new Error(`In daten.start fehlen: ${fehlt.join(", ")}`);
const alle = reihenfolge.map((s, i) => ({ ...nachSlug[s], nr: nr(i + 1) }));

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
<link rel="stylesheet" href="${css(wurzelPfad, "tokens")}">
<link rel="stylesheet" href="${css(wurzelPfad, "site")}">`;
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
  // Kontaktabzug: ein Raster mit vier Spalten, jede Kachel trägt ihre Gruppe als Etikett.
  // Die Reihenfolge steht in daten.start.reihenfolge. Darunter führt ein schwarzer Balken zu GitHub.
  const kachel = (p) => `  <li>
    <a class="kachel" href="projekte/${p.slug}/"${p.kachelHinweis ? ` title="${esc(p.kachelHinweis)}"` : ""}>
      <img src="assets/bilder/${p.slug}-800.webp" width="800" height="500" alt=""${p.bildPosition ? ` style="object-position: ${esc(p.bildPosition)}"` : ""}>
      <span class="kachel-text">
        <span class="kachel-nr" aria-hidden="true">${p.nr}</span>
        <span class="kachel-name">${esc(p.name)}</span>
        <span class="kachel-gruppe etikett">${esc(p.gruppe.name)}</span>
        <span class="kachel-satz">${satz(p.satz)}</span>
      </span>
    </a>
  </li>`;

  // Scroll-Fokus für schmale Bildschirme (Handy, Tablet), wo es kein Mouse-over gibt:
  // Die Zeile an der Fokuslinie bekommt die Klasse "fokus". Die Linie wandert beim Scrollen
  // von 30 % auf 75 % der Bildschirmhöhe, damit auch die letzte Zeile drankommt.
  const fokusSkript = `<script>
(() => {
  const schmal = matchMedia("(max-width: 64rem)");
  const kacheln = [...document.querySelectorAll("a.kachel")];
  function fokus() {
    let zeile = null;
    // Ganz oben auf der Seite bleibt alles ruhig, der Fokus beginnt erst nach dem ersten Scrollen
    if (schmal.matches && scrollY > 24) {
      const max = document.documentElement.scrollHeight - innerHeight;
      const linie = innerHeight * (0.3 + 0.45 * (max > 0 ? scrollY / max : 0));
      let abstand = Infinity;
      for (const k of kacheln) {
        const r = k.getBoundingClientRect(), a = Math.abs(r.top + r.height / 2 - linie);
        if (a < abstand) { abstand = a; zeile = r.top; }
      }
    }
    for (const k of kacheln) k.classList.toggle("fokus", zeile !== null && Math.abs(k.getBoundingClientRect().top - zeile) < 4);
  }
  addEventListener("scroll", fokus, { passive: true });
  addEventListener("resize", fokus);
  fokus();
})();
</script>`;

  const koerper = `<div class="start">
${kopf("./")}
<section class="einleitung">
  <h1>${esc(seite.einleitungTitel)}</h1>
  <p>${[].concat(seite.einleitung).map((satz) => `<span>${einleitungSatz(satz)}</span>`).join(" ")}</p>
</section>
<main id="inhalt">
<ul class="raster">
${alle.map(kachel).join("\n")}
</ul>
<a class="mehr" href="${esc(seite.github)}">
  <span class="etikett">Mehr auf</span>
  <span class="mehr-name">GitHub</span>
  <span class="mehr-pfeil" aria-hidden="true">→</span>
</a>
</main>
</div>
${fokusSkript}`;

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
    // Ein Projekt kann statt Bauweise und Stand seinen Nutzen nennen
    p.fakten.wozu ? ["Wozu", p.fakten.wozu] : ["Womit gebaut", p.fakten.womit],
    p.fakten.wert ? ["Wert", p.fakten.wert] : ["Stand", p.fakten.stand],
  ]
    .map(([k, v]) => `      <div><dt class="etikett">${k}</dt><dd>${abschnitte(v)}</dd></div>`)
    .join("\n");

  const absaetze = p.absaetze
    .map(
      (a) => `      <div class="text-block">
        <h2>${esc(a.titel)}</h2>
        <div><p>${satz(a.text).replace(/\n/g, ' <br class="breit">')}</p></div>
      </div>`
    )
    .join("\n");

  // Optional: Galerie einzelner Modelle (Bilder unter assets/bilder/<slug>/<bild>-800.webp)
  const modelle = p.modelle
    ? `
    <section class="modelle" aria-labelledby="modelle">
      <div class="gruppe-kopf"><h2 class="etikett" id="modelle">Die Modelle</h2><span class="etikett">${nr(p.modelle.length)}</span></div>
      <ul class="modelle-liste">
${p.modelle
  .map(
    (m) => `        <li>
          <img src="${w}assets/bilder/${p.slug}/${m.bild}-800.webp" width="800" height="550" alt="${esc(m.name)}, gerendert" loading="lazy">
          <h3>${satz(m.name)}</h3>
          <p>${satz(m.text)}</p>
        </li>`
  )
  .join("\n")}
      </ul>
    </section>
`
    : "";

  // Optional: rechtlicher Hinweis, etwa zu Marken Dritter
  const hinweis = p.hinweis
    ? `
    <aside class="hinweis" aria-label="Rechtlicher Hinweis">
      <p class="etikett">Rechtlicher Hinweis</p>
      <p>${satz(p.hinweis)}</p>
    </aside>
`
    : "";

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
      <h1 id="aussage">${abschnitte(p.aussage)}</h1>
      <p class="held-unter">${abschnitte(p.unter)}</p>
      <figure>
        <div class="bild">
          <img src="${bild}-1600.webp" srcset="${bild}-800.webp 800w, ${bild}-1600.webp 1600w" sizes="(max-width: 64rem) 100vw, 66rem" width="1600" height="1000" alt="${esc(p.bildAlt)}" fetchpriority="high">
        </div>
        <figcaption class="bild-unter etikett">${esc(p.bildUnter || `Screenshot der Live-Seite, ${seite.bilderStand}`)}</figcaption>
      </figure>
    </section>

    <dl class="band" aria-label="Fakten">
${fakten}
    </dl>

    <section class="text" aria-label="Mehr über ${esc(p.name)}">
${absaetze}
    </section>
${modelle}${hinweis}
    <nav class="weiter" aria-labelledby="weiter">
      <div class="gruppe-kopf"><h2 class="etikett" id="weiter">Weiter</h2></div>
      <ul class="weiter-liste">
${links}
      </ul>
      <a class="naechstes" href="${w}projekte/${naechstes.slug}/">
        <span class="etikett">Nächstes Projekt</span>
        <span class="naechstes-name">${esc(naechstes.name)}</span>
        <span class="naechstes-pfeil" aria-hidden="true">→</span>
      </a>
    </nav>
  </div>
</main>`;

  return seitenRahmen(
    kopfdaten({
      titel: `${p.name} · ${seite.name}`,
      beschreibung: `${flach(p.aussage)} ${flach(p.unter)}`,
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
