const fs = require("fs");
const path = require("path");
const https = require("https");

const countriesPath = path.join(
  __dirname,
  "../docs/data/countries.json"
);

const metadataPath = path.join(
  __dirname,
  "../docs/data/country-metadata.json"
);

const countries = JSON.parse(
  fs.readFileSync(countriesPath, "utf8")
);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        let body = "";

        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP-fout ${response.statusCode} bij ${url}`)
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
              new Error(`Ongeldige JSON: ${error.message}`)
            );
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const url =
    "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

  console.log("Landmetadata ophalen...");

  const response = await fetchJson(url);

  if (!Array.isArray(response)) {
    throw new Error(
      "De gegevensbron gaf geen geldige landenlijst terug."
    );
  }

  const sourceByCode = {};

  for (const record of response) {
    if (!record.cca3) {
      continue;
    }

    sourceByCode[record.cca3] = record;
  }

  const metadataOverrides = {
  SCO: {
    capital: "Edinburgh",
    countryCoordinates: {
      latitude: 56.49,
      longitude: -4.2
    },
    continent: "Europe",
    subregion: "Northern Europe",
    areaKm2: 77933,
    currencies: ["GBP"],
    languages: ["English", "Scottish Gaelic", "Scots"]
  }
};

const metadata = {};
const missingCountries = [];
let matchedCount = 0;

for (const [mapId, country] of Object.entries(countries)) {
  const code = country.code;
  const source = sourceByCode[code];
  const override = metadataOverrides[code];

  if (override) {
    metadata[code] = override;
    matchedCount += 1;
    continue;
  }

    if (!source) {
      metadata[code] = {
        capital: null,
        countryCoordinates: null,
        continent: null,
        subregion: null,
        areaKm2: null,
        currencies: [],
        languages: []
      };

      missingCountries.push({
        mapId,
        name: country.name,
        code
      });

      continue;
    }

    matchedCount += 1;

    metadata[code] = {
      capital:
        typeof source.capital === "string"
          ? source.capital
          : null,

      countryCoordinates:
        Array.isArray(source.latlng) &&
        source.latlng.length === 2
          ? {
              latitude: source.latlng[0],
              longitude: source.latlng[1]
            }
          : null,

      continent: source.region ?? null,
      subregion: source.subregion ?? null,

      areaKm2:
        typeof source.area === "number"
          ? source.area
          : null,

      currencies:
        Array.isArray(source.currency)
          ? source.currency
          : [],

      languages:
        source.languages &&
        typeof source.languages === "object"
          ? Object.values(source.languages)
          : []
    };
  }

  fs.writeFileSync(
    metadataPath,
    JSON.stringify(metadata, null, 2) + "\n",
    "utf8"
  );

  console.log("");
  console.log(
    `Kaartgebieden verwerkt: ${Object.keys(metadata).length}`
  );
  console.log(`Metadata gevonden: ${matchedCount}`);
  console.log(
    `Zonder metadata: ${missingCountries.length}`
  );
  console.log(`Bestand opgeslagen: ${metadataPath}`);

  if (missingCountries.length > 0) {
    console.log("");
    console.log("Gebieden zonder metadata:");
    console.table(missingCountries);
  }
}

main().catch(error => {
  console.error("");
  console.error("Ophalen van landmetadata is mislukt:");
  console.error(error.message);
  process.exitCode = 1;
});