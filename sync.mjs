// Holt Roberts Anzeigen samt Bildern von Kleinanzeigen nach content/.
//
// content/ wird mitversioniert und ist die Wahrheit fuer den Bau: Die Seite
// bleibt dadurch baubar, auch wenn Kleinanzeigen den Zugriff sperrt oder
// einzelne Anzeigen verschwinden.
//
// Der Abruf ist bewusst langsam (Pause zwischen den Aufrufen) — schnelle
// Serienabrufe werden geblockt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cfg from "./config.mjs";
import { holeBestandsliste, holeAnzeige, ladeBild } from "./lib/kleinanzeigen.mjs";
import { slugFuer } from "./lib/slug.mjs";
import { kategorieFuer } from "./lib/kategorien.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.join(__dirname, "content");
const BILDER = path.join(__dirname, cfg.BILDER.ordner);
const PAUSE_MS = 900;

const schlafe = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(BILDER, { recursive: true });

  console.log("→ Bestandsliste abrufen…");
  const urls = await holeBestandsliste(cfg.BESTANDSLISTE);
  console.log(`  ${urls.length} Anzeigen gefunden`);
  if (urls.length === 0) throw new Error("Bestandsliste leer — Seitenaufbau geaendert oder geblockt?");

  const anzeigen = [];
  const fehler = [];
  let bilderNeu = 0;
  let bilderVorhanden = 0;

  for (const [i, url] of urls.entries()) {
    await schlafe(PAUSE_MS);
    try {
      const a = await holeAnzeige(url);
      const slug = slugFuer(a.titel, a.anzeigenId);
      const bildOrdner = path.join(BILDER, slug);
      fs.mkdirSync(bildOrdner, { recursive: true });

      const bilder = [];
      for (const [j, bildUrl] of a.bildUrls.entries()) {
        const name = `bild_${String(j + 1).padStart(2, "0")}.jpg`;
        const ziel = path.join(bildOrdner, name);
        if (fs.existsSync(ziel) && fs.statSync(ziel).size > 0) {
          bilderVorhanden++; // schon geladen → nicht erneut anfassen
        } else {
          await schlafe(250);
          fs.writeFileSync(ziel, await ladeBild(bildUrl));
          bilderNeu++;
        }
        bilder.push(name);
      }

      anzeigen.push({
        slug,
        nr: i + 1,
        anzeigenId: a.anzeigenId,
        titel: a.titel,
        preis: a.preis,
        ort: a.ort,
        datum: a.datum,
        kategorie: kategorieFuer(a.titel),
        kategorieQuelle: a.kategorie,
        beschreibung: a.beschreibung,
        url: a.url,
        bilder,
      });
      console.log(`  ${String(i + 1).padStart(2)}/${urls.length} ${a.titel.slice(0, 55)} (${bilder.length} Bilder)`);
    } catch (e) {
      fehler.push({ url, fehler: e.message });
      console.error(`  ✗ ${url}: ${e.message}`);
    }
  }

  // Verwaiste Bildordner melden (Anzeige geloescht) — aber nicht selbst loeschen.
  const bekannte = new Set(anzeigen.map((a) => a.slug));
  const verwaist = fs.readdirSync(BILDER).filter((d) => !bekannte.has(d));

  fs.writeFileSync(
    path.join(CONTENT, "anzeigen.json"),
    JSON.stringify({ abgerufen: new Date().toISOString().slice(0, 10), anzeigen }, null, 2) + "\n"
  );

  console.log("\n── Abruf-Bericht ─────────────────────────");
  console.log(`Anzeigen        : ${anzeigen.length} von ${urls.length}`);
  console.log(`Bilder neu      : ${bilderNeu}`);
  console.log(`Bilder vorhanden: ${bilderVorhanden}`);
  if (verwaist.length) {
    console.log(`Verwaiste Ordner: ${verwaist.length} — Anzeige entfernt?`);
    for (const v of verwaist) console.log(`  · content/bilder/${v}`);
    console.log("  (bleiben liegen; bei Bedarf von Hand loeschen)");
  }
  if (fehler.length) {
    console.log(`\nFehlgeschlagen  : ${fehler.length}`);
    for (const f of fehler) console.log(`  · ${f.url} — ${f.fehler}`);
  }
  console.log("──────────────────────────────────────────\n");

  if (anzeigen.length === 0) process.exit(1);
}

main().catch((e) => {
  console.error("Abbruch:", e.message);
  process.exit(1);
});
