# Projekt: Englischtest-Trainer (Arbeitstitel, Name noch offen)

Dieses Dokument ist der Projektauftrag für Claude Code. Lies es vollständig, bevor du etwas baust. Es fasst alle bisherigen Entscheidungen zusammen. Was unter „Verworfen“ steht, wird nicht wieder vorgeschlagen, außer der Nutzer bringt einen neuen Grund.

Der Projektinhaber (Mauriz) programmiert selbst kaum. Erkläre Schritte, die er ausführen muss (Konten, Schlüssel, Klicks in Dashboards), kurz und auf Deutsch. Code, Kommentare und Commit-Messages auf Englisch.

## 1. Ziel

Eine Web-App zur Vorbereitung auf den TOEFL iBT im Format ab 2026 (Bänder 1–6). Sie entsteht aus einem funktionierenden Prototyp (Ordner `prototype/`), der als einzelne HTML-Seite auf claude.ai läuft. Die App soll:

- alle elf Aufgabentypen des neuen Formats abdecken (Reading: Complete the Words, Read in Daily Life, Read an Academic Passage; Listening: Choose a Response, Conversation, Announcement, Academic Talk; Writing: Build a Sentence, Write an Email, Academic Discussion; Speaking: Listen and Repeat, Take an Interview)
- komplette Probetests in voller ETS-Länge mit Timern bieten (Reading 50 Fragen/27 Min, Listening 47, Writing 12, Speaking 11)
- einen Trainingsmodus pro Aufgabentyp mit Lösung und Erklärung (auf Deutsch) bieten
- Reading/Listening/Build a Sentence automatisch auswerten, Writing und Speaking per KI nach den offiziellen ETS-Rastern (0–5)
- Fehler nach Fragetyp analysieren und mit KI gezielt neue Aufgaben für die Schwächen erzeugen
- Fortschritt, Fehlerheft und Verlauf pro Nutzer speichern, geräteübergreifend

Zielgruppe für den Start: deutschsprachige Studierende, die sich für einen Master im Ausland bewerben. Oberfläche und Erklärungen auf Deutsch, Testinhalte auf Englisch.

## 2. Phasen

1. **Phase 1, geschlossene Beta (jetzt bauen):** Login per Einladung (Magic Link), kein öffentlicher Zugang, keine Zahlung, kein Impressum nötig. Ziel: echte Nutzung und Feedback von ca. 10–30 Testern.
2. **Phase 2, Validierung:** Tester geben ihr echtes TOEFL-Ergebnis ein, damit wird die Band-Schätzung kalibriert. Warteliste-Seite.
3. **Phase 3, Verkauf (erst nach Freigabe durch Mauriz):** Paddle-Checkout, Rechtstexte, Impressum, KI-Kennzeichnung, öffentliche Landingpage.

Baue zunächst nur Phase 1. Bereite Phase 3 im Code nicht vor, außer es kostet nichts.

## 3. Technik-Stack (entschieden)

| Baustein | Wahl | Grund |
|---|---|---|
| Frontend | statische Web-App (Vorschlag: Vite + TypeScript, gerne React oder Svelte) | Prototyp ist Vanilla JS, Logik lässt sich übernehmen |
| Hosting | Cloudflare Pages + Workers | kostenlos auch kommerziell (Vercel Hobby ist nicht kommerziell) |
| Server-Teil | Cloudflare Worker als API-Proxy | API-Schlüssel nie im Browser |
| Datenbank + Auth | Supabase Free (Postgres, Auth mit Magic Link, Row Level Security) | reicht weit, Pro erst mit zahlenden Kunden |
| KI | Anthropic API (Claude Sonnet für Bewertung, Haiku für Aufgaben-Erzeugung prüfen) | gleiche Qualität wie im Prototyp |
| Sprachausgabe | ein TTS-Dienst mit US/UK/AUS-Stimmen; feste Aufgaben einmal vorab als Audiodateien erzeugen und speichern | spart laufende Kosten |
| Spracherkennung | Whisper-artiger Dienst oder Web Speech API als günstige Variante; Audio nicht speichern | Datenschutz |
| Zahlung (Phase 3) | Paddle als Merchant of Record | Rechnungen ohne Namen des Inhabers, Umsatzsteuer wird übernommen |

Anbieter für TTS/STT sind noch offen: vergleiche 2–3 Optionen nach Preis, Stimmenqualität und Akzenten, schlage eine vor und warte auf Freigabe.

## 4. Was aus dem Prototyp übernommen wird

Im Ordner `prototype/`:

- `toefl-trainer.html`: die komplette Seite, so wie sie läuft
- `src/c1_reading.js`, `c2_listening.js`, `c3_ws.js`, `c4_train.js`, `c5_listen2.js`: der Aufgabenpool (`POOL`) und die Probetests (`MOCKS`)
- `src/p3_engine.js`: die gesamte Logik (Rendering, Timer, Auswertung, Fehleranalyse, KI-Prompts, Sync)
- `src/p1_shell.html`: Styles und Grundgerüst

Der Prototyp nutzt claude.ai-Laufzeitfunktionen, die es außerhalb nicht gibt. Ersetzen:

| Im Prototyp | In der App |
|---|---|
| `claude.use("tts")` | TTS-Dienst über den Worker, für feste Aufgaben vorab erzeugte Dateien |
| `claude.use("dictation")` | Spracherkennung (Upload des Audios an den Worker oder Web Speech API) |
| `claude.use("sample")` | Anthropic API über den Worker, gleiche Prompts (`aiPrompt`, `GEN`, `GEN_COMMON`) |
| `claude.use("db")` + localStorage | Supabase-Tabellen pro Nutzer, localStorage nur als Cache |

Übernimm die Inhalte unverändert. Sie wurden einzeln geprüft (zweiter, blinder Lösungsdurchgang, Fehler korrigiert). Die Lösungsreihenfolge wird zur Laufzeit per Hash gemischt (`__shuf`, `__h`). Die Buchstaben in den Erklärungen werden dabei automatisch umgemappt, das muss erhalten bleiben.

## 5. Fachliche Regeln (aus dem Feedback, nicht ändern)

- Niveau: schwerer zweiter Testblock (C1–C2). Band-Umrechnung bewusst streng (`pctBand`: 6 ab 97 %, 5,5 ab 92 %, 5 ab 85 %, 4,5 ab 77 %, 4 ab 68 %, …). Ergebnisse immer als Schätzung kennzeichnen.
- **Probetest-Aufgaben kommen im Training nicht vor.** Bekannte Probetest-Aufgaben können per KI durch neue ersetzt werden (`refreshMock`).
- Complete the Words: keine Lücken in großgeschriebenen Wörtern (Namen, Orte, Satzanfänge). Bis zu 10 Lücken, jedes zweite Wort ab dem zweiten Satz, erste Hälfte des Wortes bleibt stehen.
- Listening: Umgangssprache wie unter Muttersprachlern, Standardtempo 1,15x, Option 1,3x.
- Trainingsergebnisse zählen nur Aufgaben, bei denen „Antwort prüfen“ geklickt wurde.
- Status pro Aufgabe: „offen“ oder „bearbeitet · x/y richtig“. Ins Fehlerheft kommen lange Aufgaben (≥ 5 Fragen/Lücken) erst unter 80 %, kurze bei einem Fehler.
- Fehleranalyse nach Fragetyp (`qSkill`, `lcrSkill`, `cwSkill`, `BAS_TAG`), Schwächen aus den letzten 30 Antworten je Typ.
- Speaking-Interview: Sprechtempo, Startverzögerung und lange Pausen messen und die KI-Note deckeln (`fluencyCap`). Hinweis, dass Aussprache nicht bewertet wird.
- Jede neue feste Aufgabe vor Aufnahme blind prüfen lassen (Lösung ohne Schlüssel bestimmen, Abweichungen und Mehrdeutigkeiten beheben).
- Keine ETS-Fragen oder -Materialien kopieren. Bewertungsraster nur sinngemäß.

## 6. Recht und Kennzeichnung (für Phase 3 vormerken, in Phase 1 nur die Hinweise)

- „TOEFL“ ist eine Marke von ETS: nicht im Produktnamen, Logo oder in der Domain. Hinweis „nicht mit ETS verbunden oder von ETS unterstützt“ im Footer.
- KI-Kennzeichnung (EU AI Act, seit 2. August 2026): klar sichtbar, dass Bewertungen und erzeugte Aufgaben von einer KI stammen.
- Datenschutz: Sprachaufnahmen nur transkribieren, nicht speichern. Nur nötige Daten speichern.

## 7. Sicherheit (Pflicht)

- Alle Konten laufen über eine eigene Geschäfts-E-Mail, getrennt von privaten Konten.
- API-Schlüssel (Anthropic, TTS, STT, Supabase Service Key) nur als Cloudflare-Secrets im Worker. Nie im Frontend, nie im Repository. `.env` in `.gitignore`.
- Supabase: Row Level Security auf allen Tabellen, jeder Nutzer sieht nur seine Daten.
- Worker: Prüfung des Supabase-Logins bei jeder Anfrage, Rate-Limit pro Nutzer für KI-Aufrufe, Größenlimits für Eingaben.
- Ausgabenlimit im Anthropic-Konto (macht Mauriz im Dashboard, erinnere ihn daran).
- Abhängigkeiten aktuell halten, keine unnötigen Pakete.

## 8. Datenmodell (Vorschlag, gerne verbessern)

- `profiles` (user_id, created_at, settings jsonb)
- `sessions` (id, user_id, date, mode train/exam, title, types jsonb, skills jsonb, bands jsonb, overall)
- `item_status` (user_id, type, item_id, last_date, c, n, best, mode, score) entspricht `done`
- `wrong_answers` (user_id, date, type, skill, q, your, right)
- `generated_items` (id, user_id, type, item jsonb, created_at)
- `mock_swaps` (user_id, mock_id, original_key, new_item_id)
- `run_state` (user_id, snapshot jsonb) für „Fortsetzen“

Feste Aufgaben bleiben als statische Daten im Code bzw. als JSON-Dateien, nicht in der Datenbank.

## 9. Verworfen (nicht wieder vorschlagen)

- Probetest-Aufgaben im Training wiederverwenden
- Eigenständige HTML-Datei ohne Server (verliert KI, Spracheingabe, Sync)
- „TOEFL“ im Produktnamen
- Vercel Hobby als Hosting (nicht kommerziell)
- Supabase Pro von Anfang an
- UG/GmbH jetzt (Entscheidung von Mauriz, betrifft den Code nicht)

## 10. Erste Aufgaben für Claude Code

1. Prototyp lesen und kurz zusammenfassen, welche Teile 1:1 übernommen werden und welche ersetzt werden.
2. Projektgerüst anlegen (Vite + TypeScript, Cloudflare Worker, Supabase-Client), README mit Setup-Schritten auf Deutsch für Mauriz.
3. Inhalte (`POOL`, `MOCKS`) als typisierte Daten übernehmen, mit einem Test, der Anzahl und Struktur prüft (Probetest A/B: Reading 50, Listening 47).
4. Logik ohne KI/Audio portieren: Probetests, Training, Auswertung, Fehlerheft, Statistik, mit localStorage.
5. Supabase anbinden: Login per Magic Link, Tabellen mit RLS, Sync.
6. Worker mit Anthropic-Proxy: Writing/Interview-Bewertung, Aufgaben-Erzeugung, gezieltes Training.
7. TTS/STT nach Anbieter-Freigabe.
8. Geschlossene Beta deployen.

Nach jedem Schritt: kurz zeigen, was fertig ist, und was Mauriz selbst tun muss.
