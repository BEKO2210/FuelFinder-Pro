#!/usr/bin/env node
// =============================================================
// Tankstellenpreise von der Tankerkoenig API holen
// Wird stuendlich von GitHub Actions ausgefuehrt
//
// Strategie: 4 Grossstaedte × 25km Radius = 4 API-Aufrufe/Stunde
// 4 × 24h = 96 Aufrufe/Tag (Limit: 100)
// =============================================================

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const API_KEY = process.env.TANKERKOENIG_API_KEY;
const BASE_URL = 'https://creativecommons.tankerkoenig.de/json';

// 4 Grossstaedte decken die wichtigsten Ballungsraeume ab
const CITIES = [
  { name: 'Berlin',    lat: 52.520, lng: 13.405 },
  { name: 'Muenchen',  lat: 48.137, lng: 11.576 },
  { name: 'Frankfurt', lat: 50.110, lng: 8.682  },
  { name: 'Hamburg',   lat: 53.551, lng: 9.994  },
];

const RADIUS = 25; // km — Maximaler Suchradius

// Tankstellen fuer eine Stadt abrufen
async function fetchCity(city) {
  const url = `${BASE_URL}/list.php?lat=${city.lat}&lng=${city.lng}&rad=${RADIUS}&sort=dist&type=all&apikey=${API_KEY}`;

  const res = await fetch(url);
  if (res.status === 429) {
    console.warn(`  Rate-Limit erreicht bei ${city.name}, ueberspringe`);
    return [];
  }
  if (!res.ok) {
    throw new Error(`API Fehler ${res.status} fuer ${city.name}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`API Antwort-Fehler fuer ${city.name}: ${data.message}`);
  }

  return data.stations || [];
}

// Vorherige Daten laden (falls vorhanden)
function loadExisting(filePath) {
  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // Datei beschaedigt oder nicht vorhanden
  }
  return null;
}

async function main() {
  if (!API_KEY) {
    console.error('TANKERKOENIG_API_KEY ist nicht gesetzt!');
    process.exit(1);
  }

  const outDir = join(process.cwd(), 'public', 'data');
  const outFile = join(outDir, 'stations.json');
  mkdirSync(outDir, { recursive: true });

  // Bestehende Daten laden fuer Merge
  const existing = loadExisting(outFile);
  const stationMap = new Map();

  // Alte Stationen behalten (werden bei Neufetch ueberschrieben)
  if (existing?.stations) {
    existing.stations.forEach(s => stationMap.set(s.id, s));
  }

  let apiCalls = 0;
  let totalNew = 0;

  for (const city of CITIES) {
    console.log(`Hole Tankstellen fuer ${city.name}...`);
    try {
      const stations = await fetchCity(city);
      apiCalls++;
      let newCount = 0;

      stations.forEach(s => {
        // Nur offene Stationen mit gueltigem Preis speichern
        if (s.e5 || s.e10 || s.diesel) {
          stationMap.set(s.id, {
            id: s.id,
            name: s.name,
            brand: s.brand,
            street: s.street,
            houseNumber: s.houseNumber || '',
            postCode: s.postCode,
            place: s.place,
            lat: s.lat,
            lng: s.lng,
            isOpen: s.isOpen,
            e5: s.e5 ?? null,
            e10: s.e10 ?? null,
            diesel: s.diesel ?? null,
          });
          newCount++;
        }
      });

      totalNew += newCount;
      console.log(`  ${newCount} Stationen gespeichert (${stations.length} total)`);
    } catch (err) {
      console.error(`  Fehler: ${err.message}`);
    }

    // 1 Sekunde Pause zwischen API-Aufrufen
    if (apiCalls < CITIES.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // JSON schreiben
  const output = {
    lastUpdated: new Date().toISOString(),
    apiCalls,
    stationCount: stationMap.size,
    stations: Array.from(stationMap.values()),
  };

  writeFileSync(outFile, JSON.stringify(output));

  const sizeKB = (Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(1);
  console.log(`\nFertig! ${stationMap.size} Stationen gespeichert (${sizeKB} KB)`);
  console.log(`API-Aufrufe: ${apiCalls}`);
}

main().catch(err => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
