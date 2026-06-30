function getWinner(match) {
  if (match.homeScore > match.awayScore) return match.home;
  if (match.awayScore > match.homeScore) return match.away;

  if (
    match.homePenaltyScore !== null &&
    match.awayPenaltyScore !== null
  ) {
    if (match.homePenaltyScore > match.awayPenaltyScore) return match.home;
    if (match.awayPenaltyScore > match.homePenaltyScore) return match.away;
  }

  return null;
}

function generateTeams(matches) {
  const teams = [...new Set(
    matches.flatMap(match => [match.home, match.away]).filter(Boolean)
  )];

  const eliminated = new Set();
  const playing = new Set();

  matches.forEach(match => {
    if (match.status === "playing") {
      if (match.home) playing.add(match.home);
      if (match.away) playing.add(match.away);
    }
  });

  matches
    .filter(match =>
      match.status === "finished" &&
      ["r32", "r16", "qf", "sf", "final", "third"].includes(match.round)
    )
    .forEach(match => {
      const winner = getWinner(match);
      if (!winner) return;

      const loser = winner === match.home ? match.away : match.home;
      if (loser) eliminated.add(loser);
    });

  return teams.map(code => {
    let status = "in_race";

    if (eliminated.has(code)) {
      status = "out";
    }

    if (playing.has(code)) {
      status = "playing";
    }

    return { code, status };
  });
}
module.exports = {
  generateTeams
};