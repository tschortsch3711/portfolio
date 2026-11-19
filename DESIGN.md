# Designsystem

Schwarz auf Weiß, eine Schrift, klare Linien. Die Seite soll sich wie ein gut gesetztes Inhaltsverzeichnis lesen: Gruppen, Zeilen, und hinter jeder Zeile eine Projektseite.

Alle Werte stehen als CSS-Variablen in [`assets/css/tokens.css`](assets/css/tokens.css). Die Komponenten in [`assets/css/site.css`](assets/css/site.css) benutzen nur diese Variablen.

## Tokens

| Gruppe | Variablen | Werte |
| --- | --- | --- |
| Farben | `--c-tinte`, `--c-papier`, `--c-leise`, `--c-haar`, `--c-flaeche` | `#000`, `#fff`, `#595959` (7:1 auf Weiß), `#e3e3e3`, `#f4f4f4` |
| Schrift | `--f-text`, `--f-mono` | Sen 400 und 700, selbst gehostet in `fonts/Sen`. Mono nur für Etiketten und Nummern |
| Typo-Skala | `--t-klein`, `--t-text`, `--t-gross`, `--t-zwischen`, `--t-titel`, `--t-aussage` | 13, 16, 19, 24 px, Titel 32 bis 48 px, Aussage 32 bis 60 px (`clamp`) |
| Zeilen und Laufweite | `--z-eng`, `--z-text`, `--sp-eng`, `--sp-etikett` | 1.08 für Titel, 1.55 für Text, -0.035em für große Titel |
| Abstände | `--s-1` bis `--s-9` | 4, 8, 12, 16, 24, 32, 48, 72, 104 px |
| Radien | `--r-0`, `--r-1` | 0 und 2 px. Fast alles ist eckig |
| Linien | `--l-duenn`, `--l-fett` | 1 px für Trennlinien, 2 px für Abschnittsgrenzen |
| Raster | `--breite`, `--rand`, `--lesebreite` | 960 px Inhalt, Rand 32 px (16 px unter 640 px), 42rem Lesebreite |

## Komponenten

**Kopfzeile** `.kopf`: Wortmarke oben links (schwarzes Kästchen „nd“ plus Name). Sie führt immer zur Startseite und ist der Weg zurück. Rechts nur der Link zu GitHub. Unten eine 2-px-Linie.

**Startseite als Kontaktabzug** `.start`, `.raster`, `.kachel`, `.stempel`: Ein Raster mit vier Spalten, auf dem Desktop passt alles auf einen Bildschirm. Die Reihenfolge steht in `daten/projekte.json` unter `start.reihenfolge`, danach richten sich auch die Nummern und „Nächstes Projekt“. Jede Kachel zeigt den Screenshot in Farbe und darunter eine Leiste mit Nummer, Name und Gruppe. Beim Überfahren wird die Leiste schwarz und der Satz zum Projekt klappt auf. Bis 64rem Breite (Handy, Tablet) übernimmt das der Scroll-Fokus: Ein kleines Skript in der Startseite gibt der Zeile an der Fokuslinie die Klasse `fokus`. Die Kacheln werden nie höher als das Bildformat 16:10, damit kein Screenshot seitlich beschnitten wird. Welcher Teil des Bildes bei flachen Kacheln zu sehen ist, steuert pro Projekt das optionale Feld `bildPosition`. Auf dem letzten Platz steht der runde Stempel mit dem Link zu GitHub. Er ist die eine bewusste Ausnahme von „fast alles ist eckig“.

**Projektzeile** `.zeile` (nicht mehr auf der Startseite, die Stile nutzt noch der Weiter-Block): Ein ganzer Link pro Projekt mit Nummer, Name, einem Satz und Pfeil. Beim Überfahren dreht sich die Zeile auf Weiß auf Schwarz. Auf dem Handy rutscht der Satz unter den Namen.

**Projekt-Hero** `.held`: Etikett mit Gruppe und Nummer, darunter die Aussage in einem Satz in der größten Stufe, dann ein kurzer Untertitel und ein Screenshot der Live-Seite mit 1-px-Rahmen.

**Fakten-Band** `.band`: Vier Felder zwischen zwei 2-px-Linien: Was, Für wen, Womit gebaut, Stand. Ein Projekt kann die letzten beiden durch Wozu und Wert ersetzen (`fakten.wozu`, `fakten.wert`). Auf dem Tablet zwei mal zwei, auf dem Handy eine Zeile pro Angabe mit dem Etikett links.

**Absätze** `.text`: Kurze Zwischentitel links, Text rechts. Auf dem Handy untereinander.

**Weiter** `.weiter`, `.naechstes`: Zeilen im Stil der Projektzeile mit Live-Seite und Repo (nur wenn öffentlich). Darunter, mit Abstand, das nächste Projekt als schwarzer Balken mit großem Namen und Pfeil.

Eine Fußzeile gibt es nicht. Der Link zu GitHub steht in der Kopfzeile und im Stempel.

## Regeln

- Nur Schwarz, Weiß und die zwei Grautöne. Farbe kommt allein aus den Screenshots.
- Text in kurzen Sätzen, ohne lange Gedankenstriche.
- Kein externes JavaScript, kein Tracking, keine Schriften von fremden Servern.
- Jedes Bild hat einen Alt-Text, der sagt, was zu sehen ist.

## Bauen

Inhalte stehen in [`daten/projekte.json`](daten/projekte.json). Daraus erzeugt

```
node werkzeug/bauen.mjs
```

die Startseite `index.html` und alle Seiten unter `projekte/<slug>/`. Die erzeugten Dateien werden mit eingecheckt, GitHub Pages liefert sie direkt aus `main` aus. Screenshots und Vorschaubild entstehen mit `werkzeug/bilder.mjs` (braucht lokal Chrome und Python mit Pillow).
