const axios = require("axios");

async function fetchWorldCupData() {
  console.log("Fetching data from WorldCup26 provider...");

  const response = await axios.get("https://worldcup26.ir/get/games");

  return {
    source: "worldcup26",
    fetchedAt: new Date().toISOString(),
    matches: response.data,
    standings: []
  };
}

module.exports = {
  fetchWorldCupData
};