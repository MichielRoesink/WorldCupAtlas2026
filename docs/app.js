const CURRENT_CUP = "worldcup-2026";
const DATA_PATH = `data/cups/${CURRENT_CUP}`;
const todayMatchesContainer = document.getElementById("today-matches");
const currentCupName = document.getElementById("current-cup-name");
const bracketContainer = document.getElementById("knockout-bracket");
const mapContainer = document.querySelector(".map-placeholder");
const countryPanel = document.getElementById("country-panel");
const inRaceCount = document.getElementById("in-race-count");
const outCount = document.getElementById("out-count");
const teamCount = document.getElementById("team-count");
const matchCount = document.getElementById("match-count");
const tooltip = document.getElementById("tooltip");

const statusColors = {
  in_race: "#15803d",
  playing: "#facc15",
  out: "#dc2626",
  not_participating: "#e5e7eb",
  unknown: "#e5e7eb"
};

function prettyStatus(status) {
  if (!status) return "Not participating";

  return status
    .replace("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}
function renderTodayMatches(matches, countries){

    const upcoming = matches
        .filter(match => match.status === "scheduled")
        .slice(0,3);

    todayMatchesContainer.innerHTML = upcoming.map(match => {

        const home = getCountryByCode(match.home, countries);
        const away = getCountryByCode(match.away, countries);

        return `

            <div class="match-item">

                <strong>
                    ${home?.flag || ""} ${home?.name || match.home}
                    vs
                    ${away?.flag || ""} ${away?.name || match.away}
                </strong>

                <small>
                    ${match.round} · ${formatDate(match.date)}
                </small>

            </div>

        `;

    }).join("");

}
function renderBracket(matches, countries) {
  const rounds = [...new Set(matches.map(match => match.round))];

  bracketContainer.innerHTML = rounds.map(round => {
    const roundMatches = matches.filter(match => match.round === round);

    return `
      <div class="bracket-round">
        <h3>${round}</h3>

        ${roundMatches.map(match => {
          const home = match.home ? getCountryByCode(match.home, countries) : null;
          const away = match.away ? getCountryByCode(match.away, countries) : null;

          return `
            <div class="bracket-match">
              <strong>
                ${home ? `${home.flag || ""} ${home.name}` : "TBD"}
                vs
                ${away ? `${away.flag || ""} ${away.name}` : "TBD"}
              </strong>
              <small>${formatDate(match.date)}</small>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }).join("");
}
async function loadData() {
  const [world, countries, teams, matches, results, tournamentInfo] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.json("data/countries.json"),
    d3.json(`${DATA_PATH}/teams.json`),
    d3.json(`${DATA_PATH}/matches.json`),
    d3.json(`${DATA_PATH}/results/results.json`),
    d3.json(`${DATA_PATH}/tournament.json`)
  ]);

  return {
    world,
    countries,
    teams,
    matches,
    results,
    tournamentInfo
  };
}

function buildCountryCodeIndex(countries) {
  const index = {};

  Object.entries(countries).forEach(([mapId, country]) => {
    if (country.code) {
      index[country.code] = mapId;
    }
  });

  return index;
}

function getCountryByCode(code, countries) {
  return Object.values(countries).find(
    country => country.code === code
  );
}

function findCountryByCode(countries, code) {
  return Object.values(countries).find(country => country.code === code);
}

function deriveTournamentFromMatches(baseTournament) {
  return { ...baseTournament };
}
function applyResultsToTournament(tournament, matches, results, codeToMapId) {

  results.forEach(result => {

    const match = matches.find(m => m.id === result.match);

    if (!match) return;

    const winner = getWinner(match, results);

    if (!winner) return;

    const loser = winner === match.home ? match.away : match.home;

    const winnerId = codeToMapId[winner];
    const loserId = codeToMapId[loser];

    if (winnerId && tournament[winnerId]) {
  tournament[winnerId].status = "in_race";
  tournament[winnerId].note = `Advanced from ${match.round}`;
}

if (loserId && tournament[loserId]) {
  tournament[loserId].status = "out";
  tournament[loserId].note = `Eliminated in ${match.round}`;
}

  });

}

function advanceWinners(matches, results) {
  const matchMap = {};

  matches.forEach(match => {
    matchMap[match.id] = match;
  });

  matches.forEach(match => {
const winner = getWinner(match, results);

if (
  match.winnerGoesTo &&
  winner
) {

  const nextMatch = matchMap[match.winnerGoesTo];

  if (!nextMatch) return;

  if (!nextMatch.home) {
    nextMatch.home = winner;
  } else if (!nextMatch.away) {
    nextMatch.away = winner;
  }

}
  });
}

function updateCounters(tournament, matches) {
 teamCount.textContent = Object.keys(tournament).length;
matchCount.textContent = matches.length;
  const teams = Object.values(tournament);

  inRaceCount.textContent = teams.filter(team => team.status === "in_race").length;
  outCount.textContent = teams.filter(team => team.status === "out").length;
}

function findNextMatch(countryCode, matches) {
  return matches.find(match =>
    (match.status === "scheduled" || match.status === "pending") &&
    (match.home === countryCode || match.away === countryCode)
  );
}

function findLastMatch(countryCode, matches) {
  return [...matches].reverse().find(match =>
    match.status === "finished" &&
    (match.home === countryCode || match.away === countryCode)
  );
}

function getResult(matchId, results) {
  return results.find(result => result.match === matchId);
}

function getWinner(match, results) {

  const result = getResult(match.id, results);

  if (!result) return null;

  if (result.homeScore > result.awayScore) {
    return match.home;
  }

  if (result.awayScore > result.homeScore) {
    return match.away;
  }

  return null;
}
function getMatchesPlayed(countryCode, results, matches){

    return results.filter(result=>{

        const match=matches.find(m=>m.id===result.match);

        if(!match) return false;

        return match.home===countryCode || match.away===countryCode;

    }).length;

}

function getCountryStats(countryCode, matches, results) {

  const stats = {
    played: 0,
    wins: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0
  };

  results.forEach(result => {

    const match = matches.find(m => m.id === result.match);

    if (!match) return;

    const isHome = match.home === countryCode;
    const isAway = match.away === countryCode;

    if (!isHome && !isAway) return;

    stats.played++;

    const goalsFor = isHome ? result.homeScore : result.awayScore;
    const goalsAgainst = isHome ? result.awayScore : result.homeScore;

    stats.goalsFor += goalsFor;
    stats.goalsAgainst += goalsAgainst;

    if (goalsFor > goalsAgainst) {
      stats.wins++;
    } else if (goalsAgainst > goalsFor) {
      stats.losses++;
    }

  });
stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  return stats;
}
function formatMatchTeams(match, country, countries) {
  const opponentCode = match.home === country.code ? match.away : match.home;
  const opponent = findCountryByCode(countries, opponentCode);

  return `${country.flag || ""} ${country.name} vs ${opponent?.flag || ""} ${opponent?.name || opponentCode}`;
}

function formatResult(match) {
  return `${match.home} ${match.homeScore ?? ""} - ${match.awayScore ?? ""} ${match.away}`;
}

function renderCountryPanel(country, mapId, tournamentData, matches, results, countries) {
  const nextMatch = findNextMatch(country.code, matches);
  const stats = getCountryStats(country.code, matches, results);
  const lastMatch = findLastMatch(country.code, matches);
  const journey = tournamentData?.status === "eliminated"
  ? `
    <div class="journey-step complete">✅ Qualified</div>
    <div class="journey-step complete">✅ Round of 32</div>
    <div class="journey-step eliminated">❌ Eliminated</div>
  `
  : `
    <div class="journey-step complete">✅ Qualified</div>
    <div class="journey-step active">⏳ Still in the race</div>
    <div class="journey-step">⬜ Round of 16</div>
    <div class="journey-step">⬜ Quarterfinal</div>
    <div class="journey-step">⬜ Semifinal</div>
    <div class="journey-step">⬜ Final</div>
    <div class="journey-step">🏆 Champion</div>
  `;

  countryPanel.innerHTML = `
    <div class="country-header">
      <div class="flag">${country.flag || "🌍"}</div>
      <div>
        <h2>${country.name}</h2>
        <div class="country-code">${country.code || "—"}</div>
      </div>
    </div>

    <hr>
<div class="summary-card">
    <div class="summary-number">${stats.played}</div>
<div class="summary-label">Matches played</div>
</div>
    <div class="info-row">
      <strong>Status</strong>
<span>${tournamentData?.status === "in_race" ? "🟢 Still in the race" : tournamentData?.status === "out" ? "🔴 Eliminated" : "⚪ Not participating"}</span>
    </div>

    <div class="match-card">
      <small>${nextMatch ? "⚽ NEXT MATCH" : lastMatch ? "🏁 LAST MATCH" : "MATCH"}</small>

      <strong>
        ${
          nextMatch
            ? formatMatchTeams(nextMatch, country, countries)
            : lastMatch
              ? formatResult(lastMatch)
              : "—"
        }
      </strong>

      <div class="match-meta">
    🗓 ${nextMatch ? formatDate(nextMatch.date) : lastMatch ? formatDate(lastMatch.date) : "—"}
    <br>
    🏆 ${nextMatch ? nextMatch.round : lastMatch ? lastMatch.round : ""}
</div>

    <div class="info-row">
      <strong>Match status</strong>
      <span>${nextMatch ? prettyStatus(nextMatch.status) : lastMatch ? "Finished" : "—"}</span>
    </div>
<hr>

<h3>Journey</h3>

<div class="journey">
  ${journey}
</div>
<hr>

<h3>Stats</h3>

<div class="stats-grid">
  <div><strong>${stats.played}</strong><span>Matches</span></div>
  <div><strong>${stats.wins}</strong><span>Wins</span></div>
  <div><strong>${stats.losses}</strong><span>Losses</span></div>
  <div><strong>${stats.goalsFor}</strong><span>Goals for</span></div>
  <div><strong>${stats.goalsAgainst}</strong><span>Goals against</span></div>
  <div><strong>${stats.goalDifference > 0 ? "+" : ""}${stats.goalDifference}</strong><span>Goal diff</span></div>
</div>
    <div class="info-row">
      <strong>Confederation</strong>
      <span>${country.confederation || "Unknown"}</span>
    </div>
  `;
}

function drawMap(world, countries, tournament, matches, results) {
  mapContainer.innerHTML = "";

  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;

  const svg = d3.select(mapContainer)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "real-world-map");

  const projection = d3.geoNaturalEarth1()
    .scale(width / 6.2)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);
  const mapCountries = topojson.feature(world, world.objects.countries);

  svg.selectAll("path")
    .data(mapCountries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "country")
    .style("fill", d => {
      const tournamentData = tournament[d.id];
      const status = tournamentData ? tournamentData.status : "not_participating";
      return statusColors[status] || statusColors.unknown;
    })
    .on("mousemove", (event, d) => {
      const country = countries[d.id];
      const tournamentData = tournament[d.id];

      if (!country) return;

      tooltip.style.display = "block";
      tooltip.style.left = `${event.pageX + 15}px`;
      tooltip.style.top = `${event.pageY + 15}px`;

      tooltip.innerHTML = `
        ${country.flag || "🌍"} <strong>${country.name}</strong><br>
        ${prettyStatus(tournamentData?.status)}
      `;
    })
    .on("mouseleave", () => {
      tooltip.style.display = "none";
    })
    .on("click", (event, d) => {
      const country = countries[d.id];
      const tournamentData = tournament[d.id];

      if (!country) {
        countryPanel.innerHTML = `
          <h2>Unknown country</h2>
          <p>No country data available yet.</p>
          <p><strong>Map ID:</strong> ${d.id}</p>
        `;
        return;
      }

      renderCountryPanel(country, d.id, tournamentData, matches, results, countries);
    });
}

loadData().then(({ world, countries, teams, matches, results, tournamentInfo }) => {
  currentCupName.textContent = tournamentInfo.name;
  const codeToMapId = buildCountryCodeIndex(countries);

  const tournament = {};

  teams.forEach(team => {
  const mapId = codeToMapId[team.code];

  if (mapId) {
    tournament[mapId] = {
      status: team.status || "in_race",
      note: team.note || ""
    };
  }
});
  advanceWinners(matches, results);
 const derivedTournament =
    deriveTournamentFromMatches(
        tournament,
        matches,
        codeToMapId
    );

applyResultsToTournament(
    derivedTournament,
    matches,
    results,
    codeToMapId
);

updateCounters(derivedTournament, matches);
  drawMap(world, countries, derivedTournament, matches, results);
  renderTodayMatches(matches, countries);
  renderBracket(matches, countries);
});