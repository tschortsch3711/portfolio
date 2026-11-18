// Macht Screenshots der Live-Seiten und das Vorschaubild der Startseite.
// Aufruf: node werkzeug/bilder.mjs [slug ...]
// Braucht lokal Google Chrome (oder CHROME=<Pfad>) und Node 22 oder neuer.
// Ergebnis: assets/bilder/<slug>-800.webp, <slug>-1600.webp, og/<slug>.jpg, og/start.png

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const daten = JSON.parse(readFileSync(join(wurzel, "daten/projekte.json"), "utf8"));
const ziel = join(wurzel, "assets/bilder");
mkdirSync(join(ziel, "og"), { recursive: true });

const CHROME =
  process.env.CHROME ||
  (process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome");

// Pro Seite: Adresse, optional ein Element, zu dem gescrollt wird, und Elemente, die ausgeblendet werden
// (Cookie-Hinweise, Lauftexte und Overlays, die im Standbild nur stören).
const ZIELE = {
  "3dmensional": { url: "https://3dmensional.de/" },
  lagerhimmel: { url: "https://lagerhimmel.de/" },
  ganachekatze: { url: "https://ganachekatze.de/", scrollZu: process.env.GK_SCROLL || "" },
  "von-ka-zu-ki": { url: "https://tschortsch3711.github.io/von-ka-zu-ki/" },
  fleischbibel: { url: "https://fleischbibel.de/" },
  "shisha-as-a-service": { url: "https://tschortsch3711.github.io/shisha-as-a-service/" },
  "this-is-tschortsch": {
    url: "https://open.spotify.com/artist/4StU5O0sjXiyuYFDU4IFiL",
    verstecke: '#onetrust-consent-sdk, aside[data-testid="now-playing-bar"]',
  },
};

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function starteChrome() {
  const profil = mkdtempSync(join(tmpdir(), "portfolio-chrome-"));
  const port = 9300 + Math.floor(Math.random() * 500);
  const prozess = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--mute-audio",
    `--user-data-dir=${profil}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ]);
  for (let i = 0; i < 50; i++) {
    try {
      const liste = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const seite = liste.find((t) => t.type === "page");
      if (seite) return { prozess, profil, ws: seite.webSocketDebuggerUrl };
    } catch {}
    await warte(200);
  }
  throw new Error("Chrome startet nicht");
}

function verbinde(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const offen = new Map();
  const ereignisse = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && offen.has(m.id)) {
      const { ok, nein } = offen.get(m.id);
      offen.delete(m.id);
      m.error ? nein(new Error(m.error.message)) : ok(m.result);
    } else if (m.method) ereignisse.forEach((f) => f(m));
  };
  const senden = (method, params = {}) =>
    new Promise((ok, nein) => {
      const n = ++id;
      offen.set(n, { ok, nein });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const bereit = new Promise((r) => (ws.onopen = r));
  return { bereit, senden, ws, auf: (f) => ereignisse.push(f) };
}

async function laden(cdp, url) {
  const geladen = new Promise((r) => cdp.auf((m) => m.method === "Page.loadEventFired" && r()));
  await cdp.senden("Page.navigate", { url });
  await Promise.race([geladen, warte(20000)]);
  await warte(3500); // Schriften, Bilder und Einblendungen
}

// Blendet Cookie-Hinweise und ähnliche feste Ebenen aus und stoppt Animationen
const AUFRAEUMEN = `(() => {
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';
  document.head.appendChild(st);
  const treffer = /cookie|consent|gdpr|cmplz|borlabs|banner-notice/i;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const kennung = (el.id || '') + ' ' + (el.className && el.className.baseVal === undefined ? el.className : '');
    if (treffer.test(kennung) && (cs.position === 'fixed' || cs.position === 'sticky')) el.style.setProperty('display','none','important');
  }
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
})()`;

async function aufnahme(cdp, { breite, hoehe, faktor, format, qualitaet, y = 0 }) {
  await cdp.senden("Emulation.setDeviceMetricsOverride", {
    width: breite, height: hoehe, deviceScaleFactor: faktor, mobile: false,
  });
  await warte(600);
  const { data } = await cdp.senden("Page.captureScreenshot", {
    format, quality: qualitaet, captureBeyondViewport: false,
    clip: { x: 0, y, width: breite, height: hoehe, scale: 1 },
  });
  return Buffer.from(data, "base64");
}

async function screenshots(cdp, slug, z) {
  await cdp.senden("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await laden(cdp, z.url);
  await cdp.senden("Runtime.evaluate", { expression: AUFRAEUMEN });
  if (z.verstecke) {
    await cdp.senden("Runtime.evaluate", {
      expression: `(() => { const st = document.createElement('style'); st.textContent = ${JSON.stringify(z.verstecke + "{display:none!important}")}; document.head.appendChild(st); })()`,
    });
  }
  let y = 0;
  if (z.scrollZu) {
    const { result } = await cdp.senden("Runtime.evaluate", {
      expression: `(() => { const el = document.querySelector(${JSON.stringify(z.scrollZu)}); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : 0; })()`,
      returnByValue: true,
    });
    y = result.value || 0;
  }
  await cdp.senden("Runtime.evaluate", { expression: `window.scrollTo(0, ${y}); ${AUFRAEUMEN}` });
  await warte(1500);
  const vs = { y: 0 };
  // Nach dem Scrollen liegt der Ausschnitt im Viewport, daher y = 0 relativ zum Dokument + Scroll
  const { result: sy } = await cdp.senden("Runtime.evaluate", { expression: "scrollY", returnByValue: true });
  vs.y = sy.value || 0;

  writeFileSync(join(ziel, `${slug}-1600.webp`),
    await aufnahme(cdp, { breite: 1280, hoehe: 800, faktor: 1.25, format: "webp", qualitaet: 82, y: vs.y }));
  writeFileSync(join(ziel, `${slug}-800.webp`),
    await aufnahme(cdp, { breite: 1280, hoehe: 800, faktor: 0.625, format: "webp", qualitaet: 82, y: vs.y }));
  writeFileSync(join(ziel, "og", `${slug}.jpg`),
    await aufnahme(cdp, { breite: 1280, hoehe: 672, faktor: 0.9375, format: "jpeg", qualitaet: 84, y: vs.y }));
  console.log(`  ${slug}`);
}

async function vorschaubild(cdp) {
  const s = daten.seite;
  const anzahl = daten.gruppen.reduce((n, g) => n + g.projekte.length, 0);
  const sen = pathToFileURL(join(wurzel, "fonts/Sen/Sen-Bold.woff2")).href;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Sen;src:url("${sen}") format("woff2");font-weight:700}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#fff;color:#000;font-family:Sen,Arial,sans-serif;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.kopf{display:flex;align-items:center;gap:20px;font-weight:700;font-size:34px;letter-spacing:-.03em;border-bottom:4px solid #000;padding-bottom:28px}
.z{display:grid;place-items:center;width:56px;height:56px;background:#000;color:#fff;font-size:22px;letter-spacing:0;border-radius:3px}
h1{font-size:78px;line-height:1.04;letter-spacing:-.04em;max-width:15ch}
.fuss{display:flex;justify-content:space-between;font-family:ui-monospace,Consolas,monospace;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:#595959;border-top:2px solid #000;padding-top:20px}
</style></head><body>
<div class="kopf"><span class="z">nd</span><span>${s.name}</span></div>
<h1>${s.einleitungTitel}</h1>
<div class="fuss"><span>${daten.gruppen.map((g) => g.name.replace("&", "&amp;")).join(" · ")}</span><span>${anzahl} Projekte</span></div>
</body></html>`;
  const tmp = mkdtempSync(join(tmpdir(), "portfolio-og-"));
  const datei = join(tmp, "og.html");
  writeFileSync(datei, html);
  await laden(cdp, pathToFileURL(datei).href);
  writeFileSync(join(ziel, "og", "start.png"),
    await aufnahme(cdp, { breite: 1200, hoehe: 630, faktor: 1, format: "png" }));
  rmSync(tmp, { recursive: true, force: true });
  console.log("  og/start.png");
}

const nur = process.argv.slice(2);
const { prozess, profil, ws } = await starteChrome();
const cdp = verbinde(ws);
await cdp.bereit;
await cdp.senden("Page.enable");
try {
  console.log("Bilder:");
  for (const [slug, z] of Object.entries(ZIELE)) {
    if (nur.length && !nur.includes(slug)) continue;
    await screenshots(cdp, slug, z);
  }
  if (!nur.length || nur.includes("start")) await vorschaubild(cdp);
} finally {
  cdp.ws.close();
  prozess.kill();
  await warte(500);
  try { rmSync(profil, { recursive: true, force: true }); } catch {}
}
