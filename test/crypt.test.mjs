import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto as wc } from "node:crypto";
import { deriveKey, encryptPage, gatePage, zugangsGeheimnis } from "../crypt.mjs";

const SALT = "mm+feezqLXaVs+Ld7ugoVw==";
const RUNDEN = 1000; // im Test klein halten, sonst dauert jeder Lauf Sekunden

async function entschluessele(geheim, iv, ct) {
  const key = await deriveKey(geheim, SALT, RUNDEN, ["decrypt"]);
  const buf = await wc.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(iv, "base64") },
    key,
    Buffer.from(ct, "base64")
  );
  return new TextDecoder().decode(buf);
}

test("verbindet Benutzername und Passwort eindeutig", () => {
  assert.equal(zugangsGeheimnis("robert", "geheim"), "robert\ngeheim");
  // Ohne Trenner waeren diese beiden Paare identisch — mit Trenner nicht:
  assert.notEqual(zugangsGeheimnis("ab", "cd"), zugangsGeheimnis("a", "bcd"));
});

test("Benutzername wird ohne Ruecksicht auf Gross-/Kleinschreibung verarbeitet", () => {
  assert.equal(zugangsGeheimnis("Robert", "x"), zugangsGeheimnis("robert", "x"));
  assert.equal(zugangsGeheimnis("  robert  ", "x"), zugangsGeheimnis("robert", "x"));
});

test("Passwort bleibt buchstabengetreu", () => {
  assert.notEqual(zugangsGeheimnis("r", "Geheim"), zugangsGeheimnis("r", "geheim"));
  assert.notEqual(zugangsGeheimnis("r", " geheim"), zugangsGeheimnis("r", "geheim"));
});

test("richtige Zugangsdaten entschluesseln die Seite", async () => {
  const klartext = "<html><body>Geheimer Inhalt</body></html>";
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const { iv, ct } = await encryptPage(klartext, key, SALT, "index.html");
  assert.equal(await entschluessele(zugangsGeheimnis("robert", "geheim"), iv, ct), klartext);
});

test("falscher Benutzername scheitert trotz richtigem Passwort", async () => {
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const { iv, ct } = await encryptPage("<html>x</html>", key, SALT, "index.html");
  await assert.rejects(() => entschluessele(zugangsGeheimnis("falsch", "geheim"), iv, ct));
});

test("falsches Passwort scheitert trotz richtigem Benutzernamen", async () => {
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const { iv, ct } = await encryptPage("<html>x</html>", key, SALT, "index.html");
  await assert.rejects(() => entschluessele(zugangsGeheimnis("robert", "falsch"), iv, ct));
});

test("gleiche Seite ergibt gleichen Geheimtext (kleine Git-Unterschiede)", async () => {
  const key = await deriveKey(zugangsGeheimnis("robert", "geheim"), SALT, RUNDEN);
  const a = await encryptPage("<html>gleich</html>", key, SALT, "index.html");
  const b = await encryptPage("<html>gleich</html>", key, SALT, "index.html");
  assert.equal(a.ct, b.ct);
});

test("die Gate-Seite verraet keinen Klartext und traegt beide Felder", () => {
  const html = gatePage({ salt: SALT, iterations: RUNDEN, iv: "aaa", ct: "bbb" });
  assert.match(html, /id="gate-user"/);
  assert.match(html, /id="gate-pw"/);
  assert.match(html, /noindex/);
  assert.doesNotMatch(html, /Sackkarre|Zapfanlage|Bierzelt/);
});
