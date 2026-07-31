// Strukturdaten (JSON-LD) fuer Suchmaschinen.
//
// Sie beantworten Google die Fragen, die im HTML nur als Text stehen: Was ist
// das hier, was kostet es, wer bietet es an, wo. Bei einem oertlichen Verleih
// ist das der guenstigste Sichtbarkeitsgewinn ueberhaupt — Preis und Anbieter
// koennen dann direkt in der Trefferliste stehen.
//
// Ausgegeben wird nur, was auch auf der Seite steht. Strukturdaten, die etwas
// anderes behaupten als die sichtbare Seite, wertet Google als Verstoss.

const sauber = (o) => JSON.stringify(o, (_, v) => (v === "" || v === null || v === undefined ? undefined : v));

function adresse(kontakt) {
  const [plz, ...ort] = String(kontakt.plzOrt || "").split(" ");
  return {
    "@type": "PostalAddress",
    streetAddress: kontakt.strasse || undefined,
    postalCode: plz || undefined,
    addressLocality: ort.join(" ") || undefined,
    addressCountry: "DE",
  };
}

/** Der Betrieb selbst — gehoert auf die Startseite. */
export function localBusiness(cfg) {
  const k = cfg.KONTAKT || {};
  return sauber({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${cfg.SITE.projectName}`,
    description: cfg.SITE.tagline,
    url: cfg.SITE.baseUrl,
    telephone: k.telefon || undefined,
    email: k.email || undefined,
    address: adresse(k),
    vatID: k.ustId || undefined,
    founder: cfg.SITE.betreiber ? { "@type": "Person", name: cfg.SITE.betreiber } : undefined,
    // "Mo-Su 07:00-23:00" ist die Schreibweise, die Google erwartet.
    openingHours: "Mo-Su 07:00-23:00",
    areaServed: { "@type": "City", name: cfg.SITE.ort },
  });
}

/**
 * Ein Angebot. Varianten werden als weitere Angebote gefuehrt, damit die
 * Preisspanne stimmt — sonst behauptete die Seite einen Einheitspreis, wo es
 * vier Groessen zu vier Preisen gibt.
 */
export function produkt(angebot, cfg, bildUrls = []) {
  const basis = String(cfg.SITE.baseUrl || "").replace(/\/?$/, "/");
  // Zubehoer und Zusatzleistungen bleiben aussen vor: Google zeigt die Spanne
  // als Preis DIESES Produkts an. Das Geblaese zur Huepfburg haette dort eine
  // "Hüpfburg ab 25 €" ergeben, die es nicht gibt.
  const preise = [
    ...angebot.preise,
    ...angebot.varianten.filter((v) => !v.zubehoer).flatMap((v) => v.preise || []),
  ].filter((p) => (p.rolle || "einstieg") !== "zusatz");

  const betraege = preise
    .map((p) => parseFloat(String(p.betrag).replace(/[^\d,.]/g, "").replace(",", ".")))
    .filter((n) => Number.isFinite(n));

  // Ohne Preis kein Angebotsblock: eine Preisangabe von 0 waere schlicht falsch.
  const angebotsBlock = betraege.length
    ? {
        "@type": "AggregateOffer",
        priceCurrency: "EUR",
        lowPrice: Math.min(...betraege),
        highPrice: Math.max(...betraege),
        offerCount: betraege.length,
        availability: "https://schema.org/InStock",
        seller: { "@type": "LocalBusiness", name: cfg.SITE.projectName },
      }
    : undefined;

  return sauber({
    "@context": "https://schema.org",
    "@type": "Product",
    name: angebot.titel,
    description: angebot.beschreibungssatz || undefined,
    category: angebot.kategorie,
    image: bildUrls.map((b) => basis + b),
    url: `${basis}a/${angebot.slug}/`,
    offers: angebotsBlock,
  });
}
