function parseCupDate(dateText) {
  const [datePart, timePart] = dateText.split(" ");
  const [month, day, year] = datePart.split("/");
  return new Date(`${year}-${month}-${day}T${timePart}:00-04:00`);
}

function isActuallyPlaying(game) {
  return game.time_elapsed === "live";
}

function teamCodeFromName(name) {
  const codes = {
    "Australia": "AUS",
    "Turkey": "TUR",
    "Qatar": "QAT",
    "Switzerland": "CHE",
    "Netherlands": "NLD",
    "Morocco": "MAR",
    "Canada": "CAN",
    "South Africa": "ZAF",
    "United States": "USA",
    "Germany": "DEU",
    "Ivory Coast": "CIV",
    "Sweden": "SWE",
    "France": "FRA",
    "Iraq": "IRQ",
    "Norway": "NOR",
    "Senegal": "SEN",
    "Japan": "JPN",
    "Tunisia": "TUN",
    "Democratic Republic of the Congo": "COD",
    "Argentina": "ARG",
    "Cape Verde": "CPV",
    "Egypt": "EGY",
    "South Korea": "KOR",
    "Paraguay": "PRY",
    "Belgium": "BEL",
    "Iran": "IRN",
    "Colombia": "COL",
    "Ghana": "GHA",
    "Ecuador": "ECU",
    "Curaçao": "CUW",
    "Austria": "AUT",
    "Brazil": "BRA",
    "Bosnia and Herzegovina": "BIH",
    "Uruguay": "URY",
    "New Zealand": "NZL",
    "Haiti": "HTI",
    "Scotland": "SCO",
    "England": "GBR",
    "Croatia": "HRV",
    "Spain": "ESP",
    "Saudi Arabia": "SAU",
    "Jordan": "JOR",
    "Algeria": "DZA",
    "Portugal": "PRT",
    "Uzbekistan": "UZB",
    "Panama": "PAN",
    "Czech Republic": "CZE",
    "Mexico": "MEX"
  };

  return codes[name] || name;
}

function transform(rawData) {
  const games = rawData.matches.games || [];

  const matches = games.map(game => ({
    id: Number(game.id),
    round: game.type === "group" ? `Group ${game.group}` : game.type,
    date: game.local_date,
    home: game.home_team_name_en
  ? teamCodeFromName(game.home_team_name_en)
  : null,

away: game.away_team_name_en
  ? teamCodeFromName(game.away_team_name_en)
  : null,
    homeScore: game.home_score === "null" ? null : Number(game.home_score),
    awayScore: game.away_score === "null" ? null : Number(game.away_score),

homePenaltyScore: game.home_penalty_score
  ? Number(game.home_penalty_score)
  : null,

awayPenaltyScore: game.away_penalty_score
  ? Number(game.away_penalty_score)
  : null,

status:
  game.finished === "TRUE"
    ? "finished"
    : isActuallyPlaying(game)
      ? "playing"
      : "scheduled"
  }));

  return {
  tournament: null,
  teams: null,
  matches: null,
  results: null,
  preview: {
    matches
  }
};
}

module.exports = {
  transform
};