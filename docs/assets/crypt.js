// Clientseitige Entschlüsselung der geschützten Seiten.
// Leitet aus Benutzername + Passwort (PBKDF2-SHA256) den AES-256-GCM-Schlüssel
// ab, entschlüsselt den eingebetteten Geheimtext und schreibt die echte Seite.
// Spiegelbild von crypt.mjs (Node/Build-Seite).
//
// Beide Eingaben gehen kryptografisch in den Schlüssel ein — der Benutzername
// ist kein Schmuck vor einem reinen Passwortschutz.
//
// Hinweis zur 3-Versuche-Sperre: Auf einer rein statischen Seite gibt es keinen
// Server, der eine Sperre erzwingen könnte. Diese Sperre wird im Browser-Speicher
// gehalten (localStorage) und ist daher bewusst nur eine Bremse gegen
// Gelegenheits-Rateversuche — über Inkognito-Modus/Speicher-Löschen umgehbar.
// Die eigentliche Sicherheit liegt in der AES-Verschlüsselung + Passwortstärke.
(function () {
  "use strict";

  var LOCK_KEY = "vl_gate_lock"; // { fails, until }
  var CRED_KEY = "vl_gate_cred"; // gemerktes Zugangsgeheimnis (Session bzw. Local)
  var MAX_FAILS = 3;
  var LOCK_MS = 60 * 60 * 1000;  // 1 Stunde

  var enc = JSON.parse(document.getElementById("enc-payload").textContent);
  var form = document.getElementById("gate-form");
  var input = document.getElementById("gate-pw");
  var userInput = document.getElementById("gate-user");
  var remember = document.getElementById("gate-remember");
  var btn = document.getElementById("gate-btn");
  var msg = document.getElementById("gate-msg");

  var textDec = new TextDecoder();
  var textEnc = new TextEncoder();
  var countdownTimer = null;

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // Muss zeichengenau mit zugangsGeheimnis() in crypt.mjs übereinstimmen —
  // sonst entsteht ein anderer Schlüssel und nichts lässt sich entsperren.
  function zugangsGeheimnis(benutzer, passwort) {
    return String(benutzer || "").trim().toLowerCase() + "\n" + String(passwort || "");
  }

  // -- Krypto -----------------------------------------------------------------
  function deriveKey(geheimnis) {
    return crypto.subtle
      .importKey("raw", textEnc.encode(geheimnis), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: b64ToBytes(enc.salt), iterations: enc.iterations, hash: "SHA-256" },
          base,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      });
  }

  function decrypt(geheimnis) {
    return deriveKey(geheimnis)
      .then(function (key) {
        return crypto.subtle.decrypt(
          { name: "AES-GCM", iv: b64ToBytes(enc.iv) },
          key,
          b64ToBytes(enc.ct)
        );
      })
      .then(function (buf) {
        return textDec.decode(buf);
      });
  }

  function render(html) {
    document.open();
    document.write(html);
    document.close();
  }

  // -- Sperre (kosmetisch, localStorage) --------------------------------------
  function getLock() {
    try {
      return JSON.parse(localStorage.getItem(LOCK_KEY)) || { fails: 0, until: 0 };
    } catch (e) {
      return { fails: 0, until: 0 };
    }
  }
  function setLock(o) {
    try { localStorage.setItem(LOCK_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function clearLock() {
    try { localStorage.removeItem(LOCK_KEY); } catch (e) {}
  }

  function fmtMMSS(ms) {
    var s = Math.ceil(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // Aktualisiert die Sperr-Anzeige. Gibt true zurück, solange gesperrt.
  function applyLockUI() {
    var lock = getLock();
    var rem = lock.until > Date.now() ? lock.until - Date.now() : 0;
    if (rem <= 0) {
      input.disabled = false;
      userInput.disabled = false;
      btn.disabled = false;
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      if (msg.className.indexOf("is-locked") !== -1) {
        msg.textContent = "";
        msg.className = "gate-msg";
      }
      return false;
    }
    input.disabled = true;
    userInput.disabled = true;
    btn.disabled = true;
    msg.className = "gate-msg is-locked";
    msg.textContent = "Zu viele Fehlversuche. Gesperrt — neuer Versuch in " + fmtMMSS(rem) + ".";
    if (!countdownTimer) {
      countdownTimer = setInterval(applyLockUI, 1000);
    }
    return true;
  }

  function registerFail() {
    var lock = getLock();
    lock.fails = (lock.fails || 0) + 1;
    if (lock.fails >= MAX_FAILS) {
      lock.until = Date.now() + LOCK_MS;
    }
    setLock(lock);
    if (!applyLockUI()) {
      var left = MAX_FAILS - lock.fails;
      msg.className = "gate-msg is-error";
      msg.textContent =
        "Benutzername oder Passwort falsch. Noch " + left + " Versuch" + (left === 1 ? "" : "e") + ".";
    }
  }

  function storeCred(geheimnis) {
    try {
      var store = remember && remember.checked ? localStorage : sessionStorage;
      store.setItem(CRED_KEY, geheimnis);
    } catch (e) {}
  }
  function rememberedCred() {
    try {
      return localStorage.getItem(CRED_KEY) || sessionStorage.getItem(CRED_KEY);
    } catch (e) {
      return null;
    }
  }
  function forgetCred() {
    try {
      localStorage.removeItem(CRED_KEY);
      sessionStorage.removeItem(CRED_KEY);
    } catch (e) {}
  }

  // Versuch zu entschlüsseln. Bei Erfolg Seite rendern; gibt Promise<bool>.
  function attempt(geheimnis, fromMemory) {
    return decrypt(geheimnis)
      .then(function (html) {
        if (!fromMemory) {
          clearLock();
          storeCred(geheimnis);
        }
        render(html);
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  // -- Start: gesperrt? sonst gemerkte Zugangsdaten still ausprobieren --------
  if (!applyLockUI()) {
    var saved = rememberedCred();
    if (saved) {
      attempt(saved, true).then(function (ok) {
        if (!ok) forgetCred(); // Zugangsdaten wurden z. B. geändert
      });
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (applyLockUI()) return;
    var user = userInput.value;
    var pw = input.value;
    if (!user || !pw) return;
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "Prüfe…";
    attempt(zugangsGeheimnis(user, pw), false).then(function (ok) {
      if (!ok) {
        btn.disabled = false;
        btn.textContent = label;
        input.value = "";
        input.focus();
        registerFail();
      }
    });
  });
})();
