function transform(rawData) {

  const matches = rawData.matches.map(game => ({

    id: String(game.fixture.id),

    round: game.league.round,

    date: game.fixture.date,

    home: game.teams.home.code,

    away: game.teams.away.code,

    homeScore: game.goals.home,

    awayScore: game.goals.away,

    status:
      game.fixture.status.short === "FT"
        ? "finished"
        : "scheduled"

  }));

  return {

    tournament: null,

    teams: null,

    matches,

    results: null

  };

}

module.exports = {
  transform
};