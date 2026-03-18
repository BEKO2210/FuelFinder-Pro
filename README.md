# FuelFinder Pro

[![Deploy](https://github.com/BEKO2210/FuelFinder-Pro/actions/workflows/deploy.yml/badge.svg)](https://github.com/BEKO2210/FuelFinder-Pro/actions/workflows/deploy.yml)
[![Preise](https://github.com/BEKO2210/FuelFinder-Pro/actions/workflows/update-prices.yml/badge.svg)](https://github.com/BEKO2210/FuelFinder-Pro/actions/workflows/update-prices.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)]()

**Finde die Tankstelle, die sich wirklich lohnt** — nicht nur die günstigste nach Preis, sondern die günstigste nach tatsächlichen Gesamtkosten inklusive Umwegkosten.

## Features

- **Smart Lohnt-sich Algorithmus** — Berechnet Netto-Ersparnis nach Umwegkosten
- **Vollbild-Karte** — Google Maps-Style mit farbcodierten Preismarkern
- **Bottom Sheet** — Drag-Geste (peek/half/full) wie bei Google Maps
- **Automatische Preise** — GitHub Actions holt stündlich aktuelle Preise
- **Kein API-Key nötig** — Vorgeladene Daten, kein Client-Side API-Aufruf
- **Tageszeit-Empfehlung** — Basierend auf ADAC-Statistiken
- **Favoriten** — Stammtankstellen speichern
- **PWA** — Installierbar, offline-fähig
- **Dark Mode** — Natives dunkles UI
- **Navigation** — Direkt zu Google Maps / Apple Maps
- **Teilen** — Web Share API mit Clipboard-Fallback
- **Preis-Heatmap** — Visuelle Preisverteilung auf der Karte
- **Smart Kalkulator** — Tankgröße, Verbrauch, Füllstand berechnen

## Architektur

```
GitHub Actions (stündlich)          Browser (Client)
┌──────────────────────┐           ┌──────────────────────┐
│ Tankerkönig API          │           │ public/data/             │
│ 4 Städte × 25km          │──commit─▶│ stations.json            │
│ = 96 Aufrufe/Tag         │           │ (vorgeladene Preise)     │
└──────────────────────┘           └──────────┬───────────┘
                                              │
                                   ┌──────────▼───────────┐
                                   │ App lädt JSON            │
                                   │ Filtert nach Standort    │
                                   │ Berechnet Entfernung     │
                                   │ Fallback: Live API       │
                                   └──────────────────────┘
```

**Ablauf:**
1. GitHub Actions holt jede Stunde Preise für Berlin, München, Frankfurt, Hamburg (25km Radius)
2. Speichert als `public/data/stations.json` und committed nach `main`
3. Push nach `main` triggert automatisch den Deploy-Workflow
4. Die App lädt beim Öffnen die vorgeladenen Daten — kein API-Key im Browser nötig
5. Stationen werden client-seitig per Haversine-Distanz gefiltert
6. Fallback auf Live-API wenn keine gecachten Stationen im Umkreis

**API-Budget:** 4 Aufrufe/Stunde × 24h = 96/Tag (Limit: 100)

## Schnellstart

```bash
# Repository klonen
git clone https://github.com/BEKO2210/FuelFinder-Pro.git
cd FuelFinder-Pro

# Dependencies installieren
npm install

# .env Datei erstellen (optional für Live-API Fallback)
cp .env.example .env
# VITE_TANKERKOENIG_API_KEY=dein_key_hier

# Entwicklungsserver starten
npm run dev
```

## API-Key besorgen

1. Gehe zu **https://creativecommons.tankerkoenig.de/**
2. Klicke auf **"Registrieren"**
3. Fülle das Formular aus (kostenlos)
4. Du erhältst den API-Key per E-Mail
5. Trage den Key als GitHub Secret ein (siehe unten)

> **Hinweis:** Für lokale Entwicklung trägst du den Key in die `.env` Datei ein.
> Für GitHub Actions wird er als Repository Secret hinterlegt.

## GitHub Pages Deployment

### Schritt 1: Repository erstellen
Erstelle ein **öffentliches** Repository auf GitHub.

### Schritt 2: GitHub Secret setzen
1. Gehe zu **Settings** → **Secrets and variables** → **Actions**
2. Klicke auf **"New repository secret"**
3. Name: `VITE_TANKERKOENIG_API_KEY`
4. Value: Dein Tankerkönig API-Key
5. Klicke auf **"Add secret"**

> Dieses Secret wird von beiden Workflows genutzt:
> - `deploy.yml` — baut die App (optional als Fallback im Bundle)
> - `update-prices.yml` — holt stündlich die Preisdaten

### Schritt 3: GitHub Pages aktivieren
1. Gehe zu **Settings** → **Pages**
2. Unter "Source" wähle: **GitHub Actions**

### Schritt 4: Push & Deploy
```bash
git push origin main
```

Danach läuft automatisch:
- **Deploy-Workflow:** Baut und deployed die App auf GitHub Pages
- **Preis-Workflow:** Holt jede Stunde aktuelle Preise (startet nach erstem Push)

### Schritt 5: Ersten Preis-Fetch auslösen (optional)
1. Gehe zu **Actions** → **"Update Fuel Prices"**
2. Klicke auf **"Run workflow"** → **"Run workflow"**
3. Die Preisdaten werden geholt und die Seite neu gebaut

## Workflows

| Workflow | Datei | Trigger | Aufgabe |
|---|---|---|---|
| Deploy | `deploy.yml` | Push auf `main` | Baut App und deployed auf GitHub Pages |
| Update Prices | `update-prices.yml` | Stündlich (Cron) + Manuell | Holt Tankstellenpreise und committed JSON |

## Tech-Stack

| Technologie | Version | Zweck |
|---|---|---|
| Vite | 6.x | Build-Tool |
| TypeScript | 5.x | Sprache (strict mode) |
| Tailwind CSS | 4.x | Styling |
| MapLibre GL JS | 5.x | Kartenvisualisierung |
| OpenFreeMap | — | Kartentiles (kostenlos, kein API-Key) |
| vite-plugin-pwa | 0.21.x | Service Worker / PWA |
| Tankerkönig API | — | Echtzeit-Tankstellenpreise (kostenlos) |

## Projektstruktur

```
FuelFinder-Pro/
├── .github/workflows/
│   ├── deploy.yml              # GitHub Pages Deployment
│   └── update-prices.yml       # Stündlicher Preis-Fetch
├── scripts/
│   └── fetch-prices.mjs        # Node.js Script für API-Abruf
├── public/
│   ├── data/stations.json      # Vorgeladene Tankstellendaten
│   ├── manifest.webmanifest    # PWA Manifest
│   └── icons/                  # App Icons (192px, 512px)
├── src/
│   ├── api/tankerkoenig.ts     # API + Cache-Laden
│   ├── components/
│   │   ├── BottomSheet.ts      # Drag-Geste (peek/half/full)
│   │   ├── FilterPanel.ts      # Filter-Overlay (Kraftstoff, Radius)
│   │   ├── Map.ts              # MapLibre Karte + Marker
│   │   ├── SmartCalculator.ts  # Tankkosten-Rechner
│   │   ├── StationCard.ts      # Tankstellen-Karte
│   │   ├── StationList.ts      # Station-Liste im Sheet
│   │   └── Toast.ts            # Benachrichtigungen
│   ├── store/AppStore.ts       # Zentraler State Store
│   ├── styles/main.css         # Vollständiges CSS (Dark Theme)
│   ├── types/index.ts          # TypeScript Interfaces
│   ├── utils/
│   │   ├── calculator.ts       # Smart-Algorithmus
│   │   ├── formatter.ts        # Preis-/Distanz-Formatierung
│   │   ├── geo.ts              # Haversine, GPS, IP-Geolocation
│   │   ├── icons.ts            # Inline SVG Icons
│   │   └── storage.ts          # LocalStorage Wrapper
│   └── main.ts                 # App Entry Point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Sicherheitshinweise

- **API-Key wird NICHT im Browser exponiert** wenn vorgeladene Daten vorhanden sind
- Der Key wird nur server-seitig in GitHub Actions verwendet
- Optional: Key kann als Build-Env-Variable für Live-API-Fallback eingebettet werden
- Tankerkönig erlaubt Client-seitige Nutzung (kostenlose Public API)
- Rate-Limiting: Max 100 Aufrufe/Tag (kostenloser Plan)

## Vergleich

| Feature | Mehr.Tanken | TankenApp | **FuelFinder Pro** |
|---|---|---|---|
| Lohnt-sich Kalkulation | Nein | Nein | Ja — Netto nach Umweg |
| Break-Even Liter | Nein | Nein | Ja |
| Open Source Maps | Nein | Nein | Ja — OpenFreeMap |
| PWA + Offline | Teilweise | Nein | Ja — Vollständig |
| Dark Mode | Nein | Teilweise | Ja — Nativ |
| Kein App-Store nötig | Nein | Nein | Ja |
| Automatische Preise | Nein | Nein | Ja — GitHub Actions |
| Kostenlos & FOSS | Nein | Nein | Ja — MIT Lizenz |

## Lizenz

MIT
