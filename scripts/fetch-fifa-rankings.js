const fs = require("fs");
const path = require("path");

const RANKING_SOURCE_URL =
  "https://en.wikipedia.org/w/index.php?title=Module:SportsRankings/data/FIFA_World_Rankings&action=raw";

const COUNTRY_SOURCE_URL =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

const countriesPath = path.join(
  __dirname,
  "../docs/data/countries.json"
);

const outputPath = path.join(
  __dirname,
  "../docs/data/fifa-rankings.json"
);

/*
 * FIFA-leden die niet rechtstreeks als zelfstandig ISO-land
 * in de mledoze-dataset voorkomen, of waarvoor CupAtlas een
 * eigen kaartcode gebruikt.
 */
const fifaToAtlasOverrides = {
  ENG: "ENG",
  SCO: "SCO",
  WAL: "WAL",
  NIR: "NIR",

  // Kosovo heeft geen officiële ISO 3166-1 alpha-3-code.
  KVX: "XKX",
  KOS: "XKX",

  // FIFA-code wijkt af van ISO3.
  AFG: "AFG",
  ALG: "DZA",
  ANG: "AGO",
  ARU: "ABW",
  ASA: "ASM",
  BAH: "BHS",
  BAN: "BGD",
  BER: "BMU",
  BHU: "BTN",
  BOT: "BWA",
  BRU: "BRN",
  BUL: "BGR",
  CAM: "KHM",
  CAY: "CYM",
  CGO: "COG",
  CHA: "TCD",
  CHI: "CHL",
  CHN: "CHN",
  CIV: "CIV",
  CMR: "CMR",
  COD: "COD",
  COM: "COM",
  CPV: "CPV",
  CRC: "CRI",
  CRO: "HRV",
  CTA: "CAF",
  CUW: "CUW",
  DEN: "DNK",
  DOM: "DOM",
  EQG: "GNQ",
  FIJ: "FJI",
  GAM: "GMB",
  GER: "DEU",
  GNB: "GNB",
  GRE: "GRC",
  GRN: "GRD",
  GUA: "GTM",
  GUI: "GIN",
  GUY: "GUY",
  HAI: "HTI",
  HKG: "HKG",
  HON: "HND",
  IRN: "IRN",
  ISV: "VIR",
  KSA: "SAU",
  KGZ: "KGZ",
  KOR: "KOR",
  KUW: "KWT",
  LBR: "LBR",
  LCA: "LCA",
  LES: "LSO",
  LIB: "LBN",
  MAD: "MDG",
  MAR: "MAR",
  MAS: "MYS",
  MDA: "MDA",
  MDV: "MDV",
  MEX: "MEX",
  MKD: "MKD",
  MRI: "MUS",
  MTN: "MRT",
  MYA: "MMR",
  NCA: "NIC",
  NED: "NLD",
  NEP: "NPL",
  NIG: "NER",
  NIR: "NIR",
  NZL: "NZL",
  OMA: "OMN",
  PAR: "PRY",
  PHI: "PHL",
  PLE: "PSE",
  POR: "PRT",
  PRK: "PRK",
  PUR: "PRI",
  RSA: "ZAF",
  SAM: "WSM",
  SEY: "SYC",
  SKN: "KNA",
  SLV: "SLV",
  SOL: "SLB",
  SRI: "LKA",
  STP: "STP",
  SUI: "CHE",
  TAH: "PYF",
  TAN: "TZA",
  TGA: "TON",
  TOG: "TGO",
  TPE: "TWN",
  TRI: "TTO",
  UAE: "ARE",
  URU: "URY",
  USA: "USA",
  VAN: "VUT",
  VIN: "VCT",
  VIE: "VNM",
  ZAM: "ZMB",
  ZIM: "ZWE",
  CRO: "HRV",
  BUL: "BGR",
  TRI: "TTO",
  TOG: "TGO",
  NCA: "NIC",
  TAH: "PYF",
  NEP: "NPL",
  SEY: "SYC",
};

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "CupAtlas/1.0 FIFA ranking updater"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Download mislukt: ${response.status} ${response.statusText}\n${url}`
    );
  }

  return response.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Ongeldige JSON ontvangen van ${url}: ${error.message}`);
  }
}

function parseRankingRows(luaSource) {
  const rankingsSection = luaSource.match(
    /data\.rankings\s*=\s*\{([\s\S]*?)\n\s*\}/
  );

  if (!rankingsSection) {
    throw new Error("Kon data.rankings niet vinden in de rankingbron.");
  }

  const rankings = [];
  const rowRegex =
    /\{\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*-?\d+\s*,\s*[\d.]+\s*\}/g;

  let match;

  while ((match = rowRegex.exec(rankingsSection[1])) !== null) {
    rankings.push({
      name: match[1],
      ranking: Number(match[2])
    });
  }

  return rankings;
}

function parseAliases(luaSource) {
  const aliasSection = luaSource.match(
    /data\.alias\s*=\s*\{([\s\S]*?)\n\s*\}/
  );

  if (!aliasSection) {
    throw new Error("Kon data.alias niet vinden in de rankingbron.");
  }

  const aliasesByName = new Map();
  const aliasRegex = /\{\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\}/g;

  let match;

  while ((match = aliasRegex.exec(aliasSection[1])) !== null) {
    const fifaCode = match[1];
    const teamName = match[2];

    aliasesByName.set(teamName, fifaCode);
  }

  return aliasesByName;
}

function buildFifaToIsoMap(countryRecords) {
  const result = new Map();

  for (const country of countryRecords) {
    const fifaCode = country.fifa;
    const isoCode = country.cca3;

    if (
      typeof fifaCode === "string" &&
      fifaCode.length === 3 &&
      typeof isoCode === "string" &&
      isoCode.length === 3
    ) {
      result.set(fifaCode, isoCode);
    }
  }

  for (const [fifaCode, atlasCode] of Object.entries(fifaToAtlasOverrides)) {
    result.set(fifaCode, atlasCode);
  }

  return result;
}

function getAtlasCodes(countries) {
  const records = Array.isArray(countries)
    ? countries
    : Object.values(countries);

  return new Set(
    records
      .map(country => country.code)
      .filter(code => typeof code === "string")
  );
}

function getRankingDate(luaSource) {
  const match = luaSource.match(
    /data\.updated\s*=\s*\{\s*day\s*=\s*(\d+),\s*month\s*=\s*'([^']+)',\s*year\s*=\s*(\d+)/
  );

  if (!match) {
    return "onbekend";
  }

  return `${match[1]} ${match[2]} ${match[3]}`;
}

async function main() {
  console.log("FIFA-wereldranglijst ophalen...");

  if (!fs.existsSync(countriesPath)) {
    throw new Error(
      `CupAtlas-landenbestand ontbreekt: ${countriesPath}`
    );
  }

  const atlasCountries = JSON.parse(
    fs.readFileSync(countriesPath, "utf8")
  );

  const [luaSource, countryRecords] = await Promise.all([
    fetchText(RANKING_SOURCE_URL),
    fetchJson(COUNTRY_SOURCE_URL)
  ]);

  const rankingRows = parseRankingRows(luaSource);
  const aliasesByName = parseAliases(luaSource);
  const fifaToIso = buildFifaToIsoMap(countryRecords);
  const atlasCodes = getAtlasCodes(atlasCountries);

  /*
   * Hiermee voorkomen we dat een gewijzigde of kapotte bron per
   * ongeluk een bijna leeg fifa-rankings.json overschrijft.
   */
  if (rankingRows.length < 190) {
    throw new Error(
      `Slechts ${rankingRows.length} rankingregels gevonden; bestand niet overschreven.`
    );
  }

  const output = {};
  const unresolved = [];
  const notInAtlas = [];

  for (const row of rankingRows) {
    const fifaCode = aliasesByName.get(row.name);

    if (!fifaCode) {
      unresolved.push({
        name: row.name,
        ranking: row.ranking,
        reason: "geen FIFA-code gevonden"
      });
      continue;
    }

    const atlasCode = fifaToIso.get(fifaCode) || fifaCode;

    if (!atlasCodes.has(atlasCode)) {
      notInAtlas.push({
        name: row.name,
        fifaCode,
        atlasCode,
        ranking: row.ranking
      });
      continue;
    }

    output[atlasCode] = row.ranking;
  }

  const sortedOutput = Object.fromEntries(
    Object.entries(output).sort((a, b) => a[0].localeCompare(b[0]))
  );

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(sortedOutput, null, 2)}\n`,
    "utf8"
  );

  console.log("");
  console.log(`Officiële peildatum: ${getRankingDate(luaSource)}`);
  console.log(`Rankingregels gevonden: ${rankingRows.length}`);
  console.log(`Rankings gekoppeld aan CupAtlas: ${Object.keys(sortedOutput).length}`);
  console.log(`Niet opgelost: ${unresolved.length}`);
  console.log(`Niet aanwezig in CupAtlas: ${notInAtlas.length}`);
  console.log(`Bestand opgeslagen: ${outputPath}`);

  if (unresolved.length > 0) {
    console.log("");
    console.log("Niet-opgeloste teams:");
    console.table(unresolved);
  }

  if (notInAtlas.length > 0) {
    console.log("");
    console.log("FIFA-teams zonder passende CupAtlas-code:");
    console.table(notInAtlas);
  }
}

main().catch(error => {
  console.error("");
  console.error("Fout bij ophalen FIFA-ranglijst:");
  console.error(error.message);
  process.exitCode = 1;
});
