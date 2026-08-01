const fs = require("fs");
const path = require("path");
const https = require("https");

const countriesPath = path.join(
  __dirname,
  "../docs/data/countries.json"
);

const statsPath = path.join(
  __dirname,
  "../docs/data/country-stats.json"
);

const rankingsPath = path.join(
  __dirname,
  "../docs/data/fifa-rankings.json"
);

const countries = JSON.parse(
  fs.readFileSync(countriesPath, "utf8")
);

const existingStats = fs.existsSync(statsPath)
  ? JSON.parse(fs.readFileSync(statsPath, "utf8"))
  : {};

const fifaRankings = fs.existsSync(rankingsPath)
  ? JSON.parse(fs.readFileSync(rankingsPath, "utf8"))
  : {};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        let body = "";

        if (response.statusCode !== 200) {
          reject(
            new Error(
              `HTTP-fout ${response.statusCode} bij ${url}`
            )
          );
          response.resume();
          return;
        }

        response.setEncoding("utf8");

        response.on("data", chunk => {
          body += chunk;
        });

        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(
              new Error(
                `Ongeldige JSON ontvangen: ${error.message}`
              )
            );
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const populationUrl =
    "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL" +
    "?format=json&mrnev=1&per_page=400";

  console.log("Bevolkingsdata ophalen bij de World Bank...");

  const response = await fetchJson(populationUrl);

  if (!Array.isArray(response) || !Array.isArray(response[1])) {
    throw new Error(
      "De World Bank API gaf een onverwachte datastructuur terug."
    );
  }

  const populationByCode = {};

  for (const record of response[1]) {
    const code = record.countryiso3code;
    const population = record.value;

    if (!code || population === null) {
      continue;
    }

    populationByCode[code] = {
      value: population,
      year: record.date
    };
  }

  const countryStats = {};
  const missingPopulation = [];

  let populationCount = 0;
  let preservedRankingCount = 0;

  for (const [mapId, country] of Object.entries(countries)) {
    const code = country.code;
    const populationRecord = populationByCode[code];

    const existingRecord = existingStats[code] || {};

    const fifaRanking =
        fifaRankings[code] ??
        existingRecord.fifaRanking ??
        null;

    if (fifaRanking !== null) {
      preservedRankingCount += 1;
    }

    const population = populationRecord
        ? Number(populationRecord.value)
        : existingRecord.population ?? null;

    const populationYear = populationRecord
      ? Number(populationRecord.year)
      : existingRecord.populationYear ?? null;

    if (population !== null) {
      populationCount += 1;
    } else {
      missingPopulation.push({
        mapId,
        name: country.name,
        code
      });
    }

    countryStats[code] = {
      fifaRanking,
      population,
      populationYear
    };
  }

  fs.writeFileSync(
    statsPath,
    JSON.stringify(countryStats, null, 2) + "\n",
    "utf8"
  );

  console.log("");
  console.log(`Statistiekrecords geschreven: ${Object.keys(countryStats).length}`);
  console.log(`Bevolkingswaarden gevonden: ${populationCount}`);
  console.log(`Bestaande FIFA-rankings behouden: ${preservedRankingCount}`);
  console.log(`Zonder bevolkingswaarde: ${missingPopulation.length}`);
  console.log(`Bestand opgeslagen: ${statsPath}`);

  if (missingPopulation.length > 0) {
    console.log("");
    console.log("Eerste 30 gebieden zonder World Bank-bevolkingsdata:");
    console.table(missingPopulation.slice(0, 30));
  }
}

main().catch(error => {
  console.error("");
  console.error("Opbouwen van country-stats.json is mislukt:");
  console.error(error.message);
  process.exitCode = 1;
});