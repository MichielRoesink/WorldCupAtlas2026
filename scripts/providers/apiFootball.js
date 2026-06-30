const axios = require("axios");

async function fetchWorldCupData() {
  console.log("Fetching fixtures from API-Football...");

  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("Missing API_FOOTBALL_KEY in .env");
  }

  const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
    headers: {
      "x-apisports-key": apiKey
    },
    params: {
      league: 1,
      season: 2026
    }
  });

  console.log("API errors:", response.data.errors);
  console.log("API results:", response.data.results);

  return {
    source: "api-football",
    fetchedAt: new Date().toISOString(),
    matches: response.data.response,
    standings: [],
    debug: {
      errors: response.data.errors,
      results: response.data.results
    }
  };
}

module.exports = {
  fetchWorldCupData
};