// Passwortschutz per clientseitiger AES-256-GCM-Verschlüsselung ("StatiCrypt"-
// Prinzip). Jede fertig gerenderte Seite wird beim Build verschlüsselt; statt
// des Klartexts wird eine kleine "Gate"-Seite geschrieben, die nur Geheimtext
// enthält. Erst das richtige Passwort leitet (PBKDF2) den Schlüssel ab,
// entschlüsselt im Browser und schreibt die echte Seite via document.write.
//
// Folge: Der Inhalt ist weder über die öffentliche GitHub-Pages-URL noch im
// öffentlichen Repo lesbar — die Sicherheit entspricht der Stärke des Passworts.
import { webcrypto as wc, createHash } from "node:crypto";

const encoder = new TextEncoder();

// Verbindet Benutzername und Passwort zu einem Geheimnis, aus dem der Schluessel
// abgeleitet wird. Der Zeilenumbruch als Trenner ist notwendig: ohne ihn ergaeben
// ("ab","cd") und ("a","bcd") denselben Schluessel.
//
// Der Benutzername wird normalisiert (getrimmt, kleingeschrieben), damit
// "Robert" und " robert " denselben Zugang oeffnen. Das Passwort bleibt
// buchstabengetreu — dort ist jede Abweichung beabsichtigt.
export function zugangsGeheimnis(benutzer, passwort) {
  return `${String(benutzer || "").trim().toLowerCase()}\n${String(passwort || "")}`;
}

// Schlüssel aus Zugangsgeheimnis + Salt ableiten (PBKDF2-SHA256). Spiegelbild
// der gleichnamigen Funktion in assets/crypt.js (Browser).
export async function deriveKey(password, saltB64, iterations, usages = ["encrypt"]) {
  const salt = Buffer.from(saltB64, "base64");
  const baseKey = await wc.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return wc.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages
  );
}

// Deterministische IV aus (Salt | Seiten-ID | Klartext): unveränderte Seiten
// ergeben über Builds hinweg identischen Geheimtext → kleine Git-Diffs.
// Unterschiedlicher Inhalt ⇒ andere IV (SHA-256) ⇒ keine GCM-Nonce-Wiederholung.
function deriveIv(saltB64, pageId, plaintext) {
  return createHash("sha256")
    .update(saltB64)
    .update("\0")
    .update(pageId)
    .update("\0")
    .update(plaintext)
    .digest()
    .subarray(0, 12);
}

export async function encryptPage(plaintext, key, saltB64, pageId) {
  const iv = deriveIv(saltB64, pageId, plaintext);
  const ctBuf = await wc.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  return {
    iv: Buffer.from(iv).toString("base64"),
    ct: Buffer.from(ctBuf).toString("base64"),
  };
}

// Die öffentlich sichtbare "Gate"-Seite: enthält nur Geheimtext + Login-Formular.
// Kein Klartext, kein Seitentitel, der etwas verrät; noindex für Suchmaschinen.
export function gatePage({ relRoot = "", salt, iterations, iv, ct }) {
  const payload = JSON.stringify({ salt, iterations, iv, ct });
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Geschützt</title>
<link rel="stylesheet" href="${relRoot}assets/style.css?v=gate1">
</head>
<body class="gate-body">
<main class="gate-card" id="gate">
  <div class="gate-lock" aria-hidden="true">🔒</div>
  <h1 class="gate-title">Geschützter Bereich</h1>
  <p class="gate-sub">Diese Seite ist noch im Aufbau. Bitte melde dich an.</p>
  <form id="gate-form" autocomplete="off">
    <input type="text" id="gate-user" class="gate-input" placeholder="Benutzername"
           autocomplete="username" aria-label="Benutzername" autofocus>
    <input type="password" id="gate-pw" class="gate-input" placeholder="Passwort"
           autocomplete="current-password" aria-label="Passwort">
    <label class="gate-remember"><input type="checkbox" id="gate-remember" checked> angemeldet bleiben</label>
    <button type="submit" class="gate-btn" id="gate-btn">Entsperren</button>
  </form>
  <p class="gate-msg" id="gate-msg" role="alert"></p>
</main>
<script type="application/json" id="enc-payload">${payload}</script>
<script src="${relRoot}assets/crypt.js?v=gate1"></script>
</body>
</html>`;
}
