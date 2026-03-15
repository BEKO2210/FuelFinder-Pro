# ⛽ FuelFinder Pro

[![Deploy](https://github.com/BEKO2210/FuelFinder-Pro/actions/workflows/deploy.yml/badge.svg)](https://github.com/BEKO2210/FuelFinder-Pro/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen.svg)]()

**Finde die Tankstelle, die sich wirklich lohnt** — nicht nur die günstigste nach Preis, sondern die günstigste nach tatsächlichen Gesamtkosten inklusive Umwegkosten.

## ✨ Features

- 🧮 **Smart Lohnt-sich Algorithmus** — Berechnet Netto-Ersparnis nach Umwegkosten
- 🗺️ **Interaktive Karte** — OpenFreeMap mit farbcodierten Preismarkern
- 📊 **Tageszeit-Empfehlung** — Basierend auf ADAC-Statistiken
- ⭐ **Favoriten** — Stammtankstellen speichern
- 🔄 **Live-Preise** — Auto-Refresh alle 5 Minuten
- 📱 **PWA** — Installierbar, offline-fähig
- 🌙 **Dark Mode** — Native dunkle Oberfläche
- 🧭 **Navigation** — Direkt zu Google Maps / Apple Maps / Waze
- 📤 **Teilen** — Web Share API mit Clipboard-Fallback
- 🔥 **Preis-Heatmap** — Visuelle Preisverteilung auf der Karte

## 🚀 Schnellstart

```bash
# Repository klonen
git clone https://github.com/BEKO2210/FuelFinder-Pro.git
cd FuelFinder-Pro

# Dependencies installieren
npm install

# .env Datei erstellen (API-Key eintragen)
cp .env.example .env
# → VITE_TANKERKOENIG_API_KEY=dein_key_hier

# Entwicklungsserver starten
npm run dev
```

## 🔑 API-Key besorgen

1. Gehe zu **https://creativecommons.tankerkoenig.de/**
2. Klicke auf **"Registrieren"**
3. Fülle das Formular aus (kostenlos)
4. Du erhältst den API-Key per E-Mail
5. Trage den Key in deine `.env` Datei ein

## 📦 GitHub Pages Deployment

### Schritt 1: Repository erstellen
Erstelle ein **öffentliches** Repository auf GitHub (für GitHub Pages Free).

### Schritt 2: GitHub Secret setzen
1. Gehe zu deinem Repository auf GitHub
2. Klicke auf **Settings** → **Secrets and variables** → **Actions**
3. Klicke auf **"New repository secret"**
4. Name: `VITE_TANKERKOENIG_API_KEY`
5. Value: Dein Tankerkönig API-Key
6. Klicke auf **"Add secret"**

### Schritt 3: GitHub Pages aktivieren
1. Gehe zu **Settings** → **Pages**
2. Unter "Source" wähle: **GitHub Actions**

### Schritt 4: Push & Deploy
```bash
git push origin main
```
GitHub Actions baut und deployed automatisch!

## 🛠️ Tech-Stack

| Technologie | Version | Zweck |
|---|---|---|
| Vite | 6.x | Build-Tool |
| TypeScript | 5.x | Sprache (strict mode) |
| Tailwind CSS | 4.x | Styling |
| MapLibre GL JS | 5.x | Kartenvisualisierung |
| OpenFreeMap | — | Kartentiles (kostenlos) |
| vite-plugin-pwa | 0.21.x | Service Worker / PWA |
| Lucide | 0.475.x | Icons |

## 🔒 Sicherheitshinweise

- Der Tankerkönig API-Key ist im Frontend-Bundle sichtbar — das ist bei Tankerkönig OK (kostenlose Public API)
- Tankerkönig Terms erlauben Client-seitige Nutzung
- Rate-Limiting: Max ~1 Request/Sekunde, max ~100/Tag (kostenlos)
- Für höheres Volumen: kostenpflichtiger Tankerkönig Plan

## 🆚 Was diese App besser macht

| Feature | Mehr.Tanken | TankenApp | **FuelFinder Pro** |
|---|---|---|---|
| Lohnt-sich Kalkulation | ❌ | ❌ | ✅ Netto nach Umweg |
| Break-Even Liter | ❌ | ❌ | ✅ |
| Open Source Maps | ❌ | ❌ | ✅ OpenFreeMap |
| PWA + Offline | Teilweise | ❌ | ✅ Vollständig |
| Dark Mode | ❌ | Teilweise | ✅ Native |
| Kein App-Store nötig | ❌ | ❌ | ✅ |
| Kostenlos & FOSS | ❌ | ❌ | ✅ MIT Lizenz |

## 📄 Lizenz

MIT
