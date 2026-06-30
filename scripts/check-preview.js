const preview = require("../docs/data/cups/worldcup-2026/preview.json");

const unknown = [...new Set(
  preview.matches
    .flatMap(match => [match.home, match.away])
    .filter(team => team && team.length !== 3)
)];

const missing = preview.matches.filter(match => !match.home || !match.away);

console.log("Unknown / unmapped teams:");
console.log(unknown);

console.log("Matches with missing teams:");
console.log(missing.map(match => ({
  id: match.id,
  round: match.round,
  home: match.home,
  away: match.away
})));