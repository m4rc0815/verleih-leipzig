// Zuordnung zwischen der Google-Drive-Ablage und den lokalen Bildordnern.
//
// In Drive heissen die Ordner "NN Titel" (durchnummeriert, gewachsen aus dem
// urspruenglichen Archiv). Lokal heissen sie nach dem Slug, weil daraus die
// Adressen der Detailseiten entstehen. Diese Datei uebersetzt zwischen beidem.
//
// Der Titel ist der Schluessel. Schraegstriche koennen in Ordnernamen nicht
// vorkommen und wurden beim Anlegen durch Bindestriche ersetzt.

export function ordnerName(nr, titel) {
  return `${String(nr).padStart(2, "0")} ${titelFuerOrdner(titel)}`;
}

export function titelFuerOrdner(titel) {
  return String(titel || "").replace(/\//g, "-").trim();
}

// Vergleichsform: Gross-/Kleinschreibung, Trennzeichen und Mehrfach-Leerzeichen
// spielen keine Rolle — sonst scheitert die Zuordnung an Kleinigkeiten, die beim
// Anlegen der Ordner entstanden sind.
export function vergleichsform(text) {
  return String(text || "")
    .replace(/[\/\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Dasselbe fuer Drive-Ordner, aber ohne die vorangestellte Ordnungsnummer.
//
// Die Nummer wird NUR hier entfernt, nie am Titel: Eine Anzeige heisst
// "15 Bierzeltgarnituren…" und liegt im Ordner "22 15 Bierzeltgarnituren…".
// Schneidet man auch im Titel vorne die Ziffern ab, findet die Zuordnung nichts.
export function vergleichsformOrdner(name) {
  return vergleichsform(String(name || "").replace(/^\d{1,3}\s+/, ""));
}

// Ordnet jeder Anzeige den passenden Drive-Ordner zu.
// Liefert { treffer: [{slug, titel, driveOrdner}], ohneOrdner: [...], unbenutzt: [...] }
export function ordneZu(anzeigen, driveOrdner) {
  const offen = new Map();
  for (const o of driveOrdner) {
    const k = vergleichsformOrdner(o);
    if (!offen.has(k)) offen.set(k, []);
    offen.get(k).push(o);
  }

  const treffer = [];
  const ohneOrdner = [];
  for (const a of anzeigen) {
    const k = vergleichsform(a.titel);
    const kandidaten = offen.get(k);
    if (kandidaten && kandidaten.length) {
      treffer.push({ slug: a.slug, titel: a.titel, driveOrdner: kandidaten.shift() });
    } else {
      ohneOrdner.push({ slug: a.slug, titel: a.titel });
    }
  }

  const unbenutzt = [...offen.values()].flat();
  return { treffer, ohneOrdner, unbenutzt };
}
