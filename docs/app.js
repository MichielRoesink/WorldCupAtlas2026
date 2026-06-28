const CURRENT_CUP = "worldcup-2026";
const DATA_PATH = `data/cups/${CURRENT_CUP}`;

const currentCupName = document.getElementById("current-cup-name");

const mapContainer = document.querySelector(".map-placeholder");
const countryPanel = document.getElementById("country-panel");
const inRaceCount = document.getElementById("in-race-count");
const outCount = document.getElementById("out-count");
const tooltip = document.getElementById("tooltip");

const statusColors = {
  in_race: "#15803d",
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

function findCountryByCode(countries, code) {
  return Object.values(countries).find(country => country.code === code);
}

function deriveTournamentFromMatches(baseTournament, matches, codeToMapId) {
  const derived = { ...baseTournament };

  matches.forEach(match => {
    const homeId = codeToMapId[match.home];
    const awayId = codeToMapId[match.away];

    if (homeId && !derived[homeId]) {
      derived[homeId] = { status: "in_race", note: match.round };
    }

    if (awayId && !derived[awayId]) {
      derived[awayId] = { status: "in_race", note: match.round };
    }

    if (match.status === "finished" && match.winner) {
      const loserCode = match.winner === match.home ? match.away : match.home;
      const winnerId = codeToMapId[match.winner];
      const loserId = codeToMapId[loserCode];

      if (winnerId) {
        derived[winnerId] = {
          status: "in_race",
          note: `Advanced from ${match.round}`
        };
      }

      if (loserId) {
        derived[loserId] = {
          status: "out",
          note: `Eliminated in ${match.round}`
        };
      }
    }
  });

  return derived;
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

    if (winnerId) {
      tournament[winnerId] = {
        status: "in_race",
        note: `Advanced from ${match.round}`
      };
    }

    if (loserId) {
      tournament[loserId] = {
        status: "out",
        note: `Eliminated in ${match.round}`
      };
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

function updateCounters(tournament) {
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
function formatMatchTeams(match, country, countries) {
  const opponentCode = match.home === country.code ? match.away : match.home;
  const opponent = findCountryByCode(countries, opponentCode);

  return `${country.flag || ""} ${country.name} vs ${opponent?.flag || ""} ${opponent?.name || opponentCode}`;
}

function formatResult(match) {
  return `${match.home} ${match.homeScore ?? ""} - ${match.awayScore ?? ""} ${match.away}`;
}

function renderCountryPanel(country, mapId, tournamentData, matches, countries) {
  const nextMatch = findNextMatch(country.code, matches);
  const lastMatch = findLastMatch(country.code, matches);

  countryPanel.innerHTML = `
    <div class="country-header">
      <div class="flag">${country.flag || "🌍"}</div>
      <div>
        <h2>${country.name}</h2>
        <div class="country-code">${country.code || "—"}</div>
      </div>
    </div>

    <hr>

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

    <div class="info-row">
      <strong>Confederation</strong>
      <span>${country.confederation || "Unknown"}</span>
    </div>
  `;
}

function drawMap(world, countries, tournament, matches) {
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

      renderCountryPanel(country, d.id, tournamentData, matches, countries);
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
        status: team.status,
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

updateCounters(derivedTournament);
  drawMap(world, countries, derivedTournament, matches);
});