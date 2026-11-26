# Bandsix

Trainingsplattform für den akademischen Englischtest im Format ab 2026 (Bänder 1–6).
Arbeitstitel „Bandsix“, der Name steht an einer Stelle in `index.html`, `src/main.ts` und `public/ext/app-ext.js`.

## Was drin ist

- Startseite (Landingpage) und App mit Dashboard, Probetests, Training, Fortschritt und Einstellungen
- 2 Probetests in voller Länge (Reading 50, Listening 47, Writing 12, Speaking 11), 11 Aufgabentypen, Lösungen auf Deutsch
- Sprachausgabe, Mikrofon und Spracherkennung über den Browser (Chrome, Edge, Safari)
- Fortschritt im Browser gespeichert, Export/Import als Datei für den Gerätewechsel
- Writing/Speaking: Selbsteinschätzung nach Raster. Die KI-Bewertung ist vorbereitet (`functions/`), aber noch aus.

Die Aufgaben und die Logik stammen unverändert aus dem Prototyp (`prototype/`). Beim Build kopiert
`scripts/import-prototype.mjs` sie nach `public/legacy/` und ändert nur ein paar Texte (Produktname).
Neue Oberfläche: `index.html`, `src/theme.css`, `src/landing.css`, `public/ext/app-ext.js`.

## Für Mauriz: veröffentlichen mit GitHub Pages (kostenlos)

1. Auf github.com ein **neues Repository** anlegen, z. B. `bandsix` (öffentlich, denn GitHub Pages ist für private Repos nur mit Bezahlkonto möglich).
2. Den Code hochladen (das übernimmt Claude, sobald GitHub verbunden ist).
3. Im Repository: **Settings → Pages → Build and deployment → Source: „GitHub Actions“** auswählen.
4. Nach etwa 2 Minuten ist die Seite unter `https://DEIN-NAME.github.io/bandsix/` erreichbar. Jede Änderung auf `main` wird automatisch neu veröffentlicht.

## Für Entwickler

```bash
npm install
npm run dev      # lokal unter http://localhost:5173
npm test         # prüft Aufgabenpool und Probetest-Längen
npm run build    # baut nach dist/
```

Rechtliches: „TOEFL“ nicht im Namen, Logo oder in der Domain verwenden. Der Hinweis „nicht mit ETS verbunden“ steht im Footer.
