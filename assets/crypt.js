// Clientseitige Entschlüsselung der passwortgeschützten Seiten.
// Leitet aus dem eingegebenen Passwort (PBKDF2-SHA256) den AES-256-GCM-Schlüssel
// ab, entschlüsselt den eingebetteten Geheimtext und schreibt die echte Seite.
// Spiegelbild von crypt.mjs (Node/Build-Seite).
//
// Hinweis zur 3-Versuche-Sperre: Auf einer rein statischen Seite gibt es keinen
// Server, der eine Sperre erzwingen könnte. Diese Sperre wird im Browser-Speicher
// gehalten (localStorage) und ist daher bewusst nur eine Bremse gegen
// Gelegenheits-Rateversuche — über Inkognito-Modus/Speicher-Löschen umgehbar.
// Die eigentliche Sicherheit liegt in der AES-Verschlüsselung + Passwortstärke.
(function () {
  "use strict";

  var LOCK_KEY = "fa_gate_lock"; // { fails, until }
  var PW_KEY = "fa_gate_pw";     // gemerktes Passwort (Session bzw. Local)
  var MAX_FAILS = 3;
  var LOCK_MS = 60 * 60 * 1000;  // 1 Stunde

  var enc = JSON.parse(document.getElementById("enc-payload").textContent);
  var form = document.getElementById("gate-form");
  var input = document.getElementById("gate-pw");
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

  // -- Krypto -----------------------------------------------------------------
  function deriveKey(password) {
    return crypto.subtle
      .importKey("raw", textEnc.encode(password), "PBKDF2", false, ["deriveKey"])
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

  function decrypt(password) {
    return deriveKey(password)
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
      btn.disabled = false;
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      if (msg.className.indexOf("is-locked") !== -1) {
        msg.textContent = "";
        msg.className = "gate-msg";
      }
      return false;
    }
    input.disabled = true;
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
        "Falsches Passwort. Noch " + left + " Versuch" + (left === 1 ? "" : "e") + ".";
    }
  }

  function storePassword(password) {
    try {
      var store = remember && remember.checked ? localStorage : sessionStorage;
      store.setItem(PW_KEY, password);
    } catch (e) {}
  }
  function rememberedPassword() {
    try {
      return localStorage.getItem(PW_KEY) || sessionStorage.getItem(PW_KEY);
    } catch (e) {
      return null;
    }
  }
  function forgetPassword() {
    try {
      localStorage.removeItem(PW_KEY);
      sessionStorage.removeItem(PW_KEY);
    } catch (e) {}
  }

  // Versuch zu entschlüsseln. Bei Erfolg Seite rendern; gibt Promise<bool>.
  function attempt(password, fromMemory) {
    return decrypt(password)
      .then(function (html) {
        if (!fromMemory) {
          clearLock();
          storePassword(password);
        }
        render(html);
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  // -- Start: gesperrt? sonst gemerktes Passwort still ausprobieren -----------
  if (!applyLockUI()) {
    var saved = rememberedPassword();
    if (saved) {
      attempt(saved, true).then(function (ok) {
        if (!ok) forgetPassword(); // Passwort wurde z. B. geändert
      });
    }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (applyLockUI()) return;
    var pw = input.value;
    if (!pw) return;
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "Prüfe…";
    attempt(pw, false).then(function (ok) {
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
