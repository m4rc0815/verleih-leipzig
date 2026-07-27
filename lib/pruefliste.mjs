// Findet Textstellen, die sich auf Kleinanzeigen beziehen und auf einer eigenen
// Homepage schief klingen ("findet ihr auf meiner Seite").
//
// Die Texte werden bewusst NICHT veraendert — es sind Roberts Formulierungen mit
// seinen Zusagen. Der Bau gibt nur eine Liste aus, damit vor dem
// Oeffentlichgehen gezielt entschieden werden kann.

const MUSTER = [
  /anderen?\s+anzeigen/i,
  /meiner\s+seite/i,
  /meine[rn]?\s+profil/i,
  /kleinanzeigen/i,
  /ebay/i,
];

export function findeBezuege(text) {
  const treffer = [];
  const zeilen = String(text || "").split("\n");
  zeilen.forEach((zeile, i) => {
    if (MUSTER.some((m) => m.test(zeile))) {
      treffer.push({ nr: i + 1, zeile: zeile.trim() });
    }
  });
  return treffer;
}
