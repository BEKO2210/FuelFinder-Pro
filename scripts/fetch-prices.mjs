#!/usr/bin/env node
// =============================================================
// Tankstellenpreise von der Tankerkönig API holen
// Wird alle 30 Minuten von GitHub Actions ausgeführt
//
// Strategie: 48 Standorte über ganz Deutschland verteilt
// Aufgeteilt in 24 Gruppen à 2 Standorte (Rotation)
// Jeder Lauf holt 2 Standorte → 48 Runs/Tag × 2 = 96 Aufrufe
// Jede Region wird ca. 2× täglich aktualisiert
// =============================================================

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const API_KEY = process.env.TANKERKOENIG_API_KEY;
const BASE_URL = 'https://creativecommons.tankerkoenig.de/json';
const RADIUS = 25; // km — Maximaler Suchradius

// 48 strategische Standorte: Decken ganz Deutschland flächendeckend ab
// Sortiert: Großstädte + Mittelstädte + ländliche Lückenfüller
const ALL_LOCATIONS = [
  // Großstädte (16)
  { name: 'Berlin',      lat: 52.520, lng: 13.405 },
  { name: 'Hamburg',      lat: 53.551, lng:  9.994 },
  { name: 'München',      lat: 48.137, lng: 11.576 },
  { name: 'Köln',         lat: 50.938, lng:  6.960 },
  { name: 'Frankfurt',    lat: 50.110, lng:  8.682 },
  { name: 'Stuttgart',    lat: 48.776, lng:  9.183 },
  { name: 'Düsseldorf',   lat: 51.228, lng:  6.774 },
  { name: 'Leipzig',      lat: 51.340, lng: 12.375 },
  { name: 'Dortmund',     lat: 51.514, lng:  7.466 },
  { name: 'Essen',        lat: 51.456, lng:  7.012 },
  { name: 'Bremen',       lat: 53.079, lng:  8.802 },
  { name: 'Dresden',      lat: 51.051, lng: 13.738 },
  { name: 'Hannover',     lat: 52.376, lng:  9.739 },
  { name: 'Nürnberg',     lat: 49.454, lng: 11.078 },
  { name: 'Mannheim',     lat: 49.489, lng:  8.467 },
  { name: 'Augsburg',     lat: 48.366, lng: 10.898 },

  // Mittelstädte / Landeshauptstädte (16)
  { name: 'Kiel',         lat: 54.323, lng: 10.123 },
  { name: 'Rostock',      lat: 54.089, lng: 12.141 },
  { name: 'Schwerin',     lat: 53.629, lng: 11.417 },
  { name: 'Magdeburg',    lat: 52.131, lng: 11.636 },
  { name: 'Potsdam',      lat: 52.396, lng: 13.058 },
  { name: 'Erfurt',       lat: 50.978, lng: 11.029 },
  { name: 'Kassel',       lat: 51.313, lng:  9.497 },
  { name: 'Saarbrücken',  lat: 49.240, lng:  6.997 },
  { name: 'Mainz',        lat: 49.993, lng:  8.248 },
  { name: 'Karlsruhe',    lat: 49.007, lng:  8.404 },
  { name: 'Freiburg',     lat: 47.999, lng:  7.842 },
  { name: 'Regensburg',   lat: 49.014, lng: 12.098 },
  { name: 'Würzburg',     lat: 49.792, lng:  9.932 },
  { name: 'Münster',      lat: 51.963, lng:  7.628 },
  { name: 'Bielefeld',    lat: 52.022, lng:  8.532 },
  { name: 'Chemnitz',     lat: 50.828, lng: 12.921 },

  // Ländliche Lückenfüller (16)
  { name: 'Flensburg',    lat: 54.787, lng:  9.437 },
  { name: 'Oldenburg',    lat: 53.144, lng:  8.214 },
  { name: 'Osnabrück',    lat: 52.279, lng:  8.043 },
  { name: 'Göttingen',    lat: 51.533, lng:  9.935 },
  { name: 'Cottbus',      lat: 51.760, lng: 14.334 },
  { name: 'Passau',       lat: 48.574, lng: 13.459 },
  { name: 'Ulm',          lat: 48.401, lng:  9.988 },
  { name: 'Konstanz',     lat: 47.660, lng:  9.175 },
  { name: 'Trier',        lat: 49.750, lng:  6.637 },
  { name: 'Aachen',       lat: 50.776, lng:  6.084 },
  { name: 'Lübeck',       lat: 53.870, lng: 10.687 },
  { name: 'Gera',         lat: 50.878, lng: 12.083 },
  { name: 'Bayreuth',     lat: 49.946, lng: 11.578 },
  { name: 'Stralsund',    lat: 54.310, lng: 13.090 },
  { name: 'Emden',        lat: 53.367, lng:  7.206 },
  { name: 'Ingolstadt',   lat: 48.764, lng: 11.425 },
];

// 24 Gruppen à 2 Standorte
const GROUPS = [];
for (let i = 0; i < ALL_LOCATIONS.length; i += 2) {
  GROUPS.push(ALL_LOCATIONS.slice(i, i + 2));
}

// Aktuelle Gruppe basierend auf Uhrzeit bestimmen
// 48 Slots/Tag (alle 30 Min) → 24 Gruppen → jede Gruppe 2×/Tag
function getCurrentGroupIndex() {
  const now = new Date();
  const slotIndex = now.getUTCHours() * 2 + Math.floor(now.getUTCMinutes() / 30);
  return slotIndex % GROUPS.length;
}

// Tankstellen für einen Standort abrufen
async function fetchLocation(location) {
  const url = `${BASE_URL}/list.php?lat=${location.lat}&lng=${location.lng}&rad=${RADIUS}&sort=dist&type=all&apikey=${API_KEY}`;

  const res = await fetch(url);
  if (res.status === 429) {
    console.warn(`  ⚠ Rate-Limit erreicht bei ${location.name}, überspringe`);
    return [];
  }
  if (!res.ok) {
    throw new Error(`API Fehler ${res.status} für ${location.name}`);
  }

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`API Antwort-Fehler für ${location.name}: ${data.message}`);
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
    // Datei beschädigt oder nicht vorhanden
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

  // Bestehende Daten laden für Merge
  const existing = loadExisting(outFile);
  const stationMap = new Map();

  // Alte Stationen behalten (werden bei Neufetch überschrieben)
  if (existing?.stations) {
    existing.stations.forEach(s => stationMap.set(s.id, s));
  }

  // Aktuelle Gruppe bestimmen
  const groupIndex = getCurrentGroupIndex();
  const currentGroup = GROUPS[groupIndex];

  console.log(`\n🔄 Rotation: Gruppe ${groupIndex + 1}/${GROUPS.length}`);
  console.log(`   Standorte: ${currentGroup.map(c => c.name).join(', ')}`);
  console.log(`   Gesamt: ${ALL_LOCATIONS.length} Standorte in ${GROUPS.length} Gruppen\n`);

  let apiCalls = 0;
  let totalNew = 0;

  for (const location of currentGroup) {
    console.log(`📍 Hole Tankstellen für ${location.name}...`);
    try {
      const stations = await fetchLocation(location);
      apiCalls++;
      let newCount = 0;

      stations.forEach(s => {
        // Nur Stationen mit gültigem Preis speichern
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
      console.log(`   ✅ ${newCount} Stationen aktualisiert (${stations.length} gefunden)`);
    } catch (err) {
      console.error(`   ❌ Fehler: ${err.message}`);
    }

    // 1 Sekunde Pause zwischen API-Aufrufen
    if (apiCalls < currentGroup.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // JSON schreiben
  const output = {
    lastUpdated: new Date().toISOString(),
    apiCalls,
    stationCount: stationMap.size,
    group: groupIndex + 1,
    groupLocations: currentGroup.map(c => c.name),
    totalGroups: GROUPS.length,
    stations: Array.from(stationMap.values()),
  };

  writeFileSync(outFile, JSON.stringify(output));

  const sizeKB = (Buffer.byteLength(JSON.stringify(output)) / 1024).toFixed(1);
  console.log(`\n✅ Fertig! ${stationMap.size} Stationen gesamt (${sizeKB} KB)`);
  console.log(`   ${totalNew} Stationen in diesem Lauf aktualisiert`);
  console.log(`   API-Aufrufe: ${apiCalls}`);
}

main().catch(err => {
  console.error('Fataler Fehler:', err);
  process.exit(1);
});
