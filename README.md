# Portfolio

Öffentliche Projektübersicht von Nikola Djordjevic, mit einer eigenen Seite pro Projekt.

Seite: https://tschortsch3711.github.io/portfolio/

## Aufbau

- `daten/projekte.json`: alle Texte, Gruppen und Links
- `werkzeug/bauen.mjs`: erzeugt daraus `index.html` und `projekte/<slug>/index.html`
- `werkzeug/bilder.mjs`: macht Screenshots der Live-Seiten und die Vorschaubilder für Open Graph
- `assets/css/tokens.css` und `assets/css/site.css`: das Designsystem, beschrieben in [DESIGN.md](DESIGN.md)
- `fonts/Sen`: Schrift Sen, selbst gehostet (SIL Open Font License)

Kein Framework, kein externes JavaScript, kein Tracking. GitHub Pages liefert die Dateien direkt aus `main` aus.

## Ändern

```
node werkzeug/bauen.mjs
```

Nach einer Änderung an `daten/projekte.json` neu bauen und die erzeugten Dateien mit committen. Für neue Screenshots `node werkzeug/bilder.mjs` (braucht lokal Google Chrome und Node 22 oder neuer), danach noch einmal bauen.

Lokal ansehen:

```
python -m http.server 8765
```
