
const fs = require("fs");
const path = require("path");

const countriesPath = path.join(
  __dirname,
  "../docs/data/countries.json"
);

const statsPath = path.join(
  __dirname,
  "../docs/data/country-stats.json"
);

const countries = JSON.parse(
  fs.readFileSync(countriesPath, "utf8")
);

const countryStats = JSON.parse(
  fs.readFileSync(statsPath, "utf8")
);

let updatedCount = 0;
let missingRecordCount = 0;
let missingPopulationCount = 0;
let missingRankingCount = 0;

const missingCountries = [];

for (const [mapId, country] of Object.entries(countries)) {
  const code = country.code;
  const fifaCode = country.fifaCode;

  const stats =
    countryStats[code] ||
    countryStats[fifaCode];

  if (!stats) {
  missingRecordCount += 1;

  country.fifaRanking = null;
  country.population = null;

  missingCountries.push({
    mapId,
    name: country.name,
    code,
    fifaCode: fifaCode || null
  });

  continue;
}

country.fifaRanking = stats.fifaRanking ?? null;
country.population = stats.population ?? null;

if (country.fifaRanking === null) {
  missingRankingCount += 1;
}

if (country.population === null) {
  missingPopulationCount += 1;
}

updatedCount += 1;
}

fs.writeFileSync(
  countriesPath,
  JSON.stringify(countries, null, 2) + "\n",
  "utf8"
);

console.log(`Bestand opgeslagen: ${countriesPath}`);
console.log(`Statistiekrecords verwerkt: ${updatedCount}`);
console.log(`Landen zonder statistiekrecord: ${missingRecordCount}`);
console.log(`Landen zonder bevolkingsdata: ${missingPopulationCount}`);
console.log(`Landen zonder FIFA-ranking: ${missingRankingCount}`);

if (missingCountries.length > 0) {
  console.log("\nEerste 20 ontbrekende landen:");
  console.table(missingCountries.slice(0, 20));
}