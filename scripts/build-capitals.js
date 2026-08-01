const fs = require("fs");
const world = require("world-countries");
const tzLookup = require("tz-lookup");

const capitals = {};

for (const country of world) {
  const code = country.cca3;
  const capital = country.capital?.[0];

  // world-countries bevat voor hoofdsteden een apart coördinatenveld.
  const capitalCoordinates = country.latlng;

  if (
    !code ||
    !capital ||
    !Array.isArray(capitalCoordinates) ||
    capitalCoordinates.length < 2
  ) {
    continue;
  }

  const [lat, lon] = capitalCoordinates;

  let timeZone = "";

  try {
    timeZone = tzLookup(lat, lon);
  } catch (error) {
    console.warn(
      `Geen tijdzone gevonden voor ${code} – ${capital}:`,
      error.message
    );
  }

  capitals[code] = {
    capital,
    lat,
    lon,
    timeZone
  };
}

const sortedCapitals = Object.fromEntries(
  Object.entries(capitals).sort(([codeA], [codeB]) =>
    codeA.localeCompare(codeB)
  )
);

const output =
  `window.capitals = ${JSON.stringify(sortedCapitals, null, 2)};\n`;

fs.writeFileSync(
  "docs/data/capitals.js",
  output,
  "utf8"
);

const missingTimeZones = Object.entries(sortedCapitals)
  .filter(([, country]) => !country.timeZone)
  .map(([code]) => code);

console.log(
  `✅ ${Object.keys(sortedCapitals).length} landen en gebieden geschreven.`
);

if (missingTimeZones.length > 0) {
  console.log(
    `⚠️ Zonder tijdzone: ${missingTimeZones.join(", ")}`
  );
}