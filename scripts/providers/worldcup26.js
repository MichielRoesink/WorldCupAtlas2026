const axios = require("axios");

const WORLDCUP_API_URL = "https://worldcup26.ir/get/games";

async function fetchWorldCupData() {
  console.log("Fetching data from WorldCup26 provider...");

  try {
    const response = await axios.get(WORLDCUP_API_URL, {
      timeout: 15000
    });

    return {
      source: "worldcup26",
      fetchedAt: new Date().toISOString(),
      matches: Array.isArray(response.data)
        ? response.data
        : response.data?.matches || [],
      standings: []
    };
  } catch (error) {
    const status = error.response?.status;

    console.error(
      `WorldCup26 provider failed${status ? ` with status ${status}` : ""}.`
    );

    /*
      De externe API is tijdelijk/onbepaald niet beschikbaar.
      Geef lege data terug zodat de GitHub Action niet crasht.
    */
    return {
      source: "worldcup26-unavailable",
      fetchedAt: new Date().toISOString(),
      matches: [],
      standings: [],
      warning: `Provider unavailable${status ? `: HTTP ${status}` : ""}`
    };
  }
}

module.exports = {
  fetchWorldCupData
};