const { generateTeams } = require("./generate-teams");
require("dotenv").config();
const { transform } = require("./transform");
const { publish } = require("./publish");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const { getProvider } = require("./providers");

async function main() {
  console.log("CupAtlas updater started");

  const provider = getProvider(config.provider);
  const data = await provider.fetchWorldCupData();

  fs.mkdirSync(config.output.raw, { recursive: true });

  const outputFile = path.join(config.output.raw, "fixtures.json");

  fs.writeFileSync(
    outputFile,
    JSON.stringify(data, null, 2)
  );

 console.log("Source:", data.source);
console.log("Fetched at:", data.fetchedAt);

const transformed = transform(data);
if (transformed.preview?.matches) {
  transformed.results = transformed.preview.matches
    .filter(match =>
      match.status === "finished" &&
      match.home &&
      match.away
    )
    .map(match => ({
      match: match.id,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePenaltyScore: match.homePenaltyScore,
      awayPenaltyScore: match.awayPenaltyScore
    }));
}

if (transformed.preview?.matches) {
  transformed.results = transformed.preview.matches
    .filter(match =>
      match.status === "finished" &&
      match.home &&
      match.away
    )
    .map(match => ({
      match: match.id,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homePenaltyScore: match.homePenaltyScore,
      awayPenaltyScore: match.awayPenaltyScore
    }));
}

if (transformed.preview?.matches) {
  transformed.teams = generateTeams(transformed.preview.matches);
}

publish(
    transformed,
    config.output.cup
);

console.log("Update complete.");
}

main();