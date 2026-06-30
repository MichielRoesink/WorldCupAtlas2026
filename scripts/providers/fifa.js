async function fetchWorldCupData() {
  console.log("Fetching data from FIFA provider...");

  return {
    source: "fifa",
    fetchedAt: new Date().toISOString(),
    matches: [
      {
        id: 1,
        home: "ZAF",
        away: "CAN",
        status: "live",
        homeScore: 0,
        awayScore: 0
      }
    ],
    standings: []
  };
}

module.exports = {
  fetchWorldCupData
};