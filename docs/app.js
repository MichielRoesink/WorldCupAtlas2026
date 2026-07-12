const liveNowContainer = document.getElementById("live-now");
const CURRENT_CUP = "worldcup-2026";
let currentStage = "r16";
let showFcgLayer = false;
const fcgCapitalCoordinates = {
  AUS: [149.13, -35.28],   // Canberra
  CPV: [-23.51, 14.93],    // Praia
  CUW: [-68.93, 12.11],    // Willemstad
  JPN: [139.69, 35.68],    // Tokyo
  NED: [4.90, 52.37],      // Amsterdam
  NOR: [10.75, 59.91],     // Oslo
  SWE: [18.07, 59.33],     // Stockholm
  USA: [-77.04, 38.91]     // Washington, D.C.
};
let appState = {};
const DEV_MODE = false;
const DEV_MATCH_ID = 84;
const DATA_PATH = `data/cups/${CURRENT_CUP}`;
const todayMatchesContainer = document.getElementById("today-matches");
const currentCupName = document.getElementById("current-cup-name");
const bracketContainer = document.getElementById("knockout-bracket");
const mapContainer = document.querySelector(".map-placeholder");
const countryPanel = document.getElementById("country-panel");
const inRaceCount = document.getElementById("in-race-count");
const outCount = document.getElementById("out-count");
const playingCount = document.getElementById("playing-count");
const teamCount = document.getElementById("team-count");
const matchCount = document.getElementById("match-count");
const tooltip = document.getElementById("tooltip");

const statusColors = {
  in_race: "#15803d",
  playing: "#facc15",
  upcoming: "#f59e0b",
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
  const [world, countries, teams, matches, preview, results, tournamentInfo, mapOverrides, fcgConnections] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.json("data/countries.json"),
    d3.json(`${DATA_PATH}/teams.json`),
    d3.json(`${DATA_PATH}/matches.json`),
    d3.json(`${DATA_PATH}/preview.json`),
    d3.json(`${DATA_PATH}/results/results.json`),
    d3.json(`${DATA_PATH}/tournament.json`),
    d3.json("data/map-overrides.json"),
    d3.json("data/fcg-connections.json")
  ]);

  return {
  world,
  countries,
  teams,
  matches,
  preview,
  results,
  tournamentInfo,
  mapOverrides,
  fcgConnections
};
}

function buildCountryCodeIndex(countries, mapOverrides = []) {
  const index = {};

  Object.entries(countries).forEach(([mapId, country]) => {
    if (country.code) {
      index[country.code] = mapId;
    }
  });

  // Voeg override-landen toe die geen polygon hebben
  mapOverrides.forEach(override => {
    if (!index[override.code]) {
      index[override.code] = override.code;
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

  const teams = Object.values(tournament);

  inRaceCount.textContent = teams.filter(team =>
  team.status === "in_race" ||
  team.status === "playing" ||
  team.status === "upcoming"
).length;
  outCount.textContent = teams.filter(team => team.status === "out").length;
  playingCount.textContent = teams.filter(team => team.status === "playing").length;
}

function formatLocalClock() {
  return new Date().toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function startLiveBall(ball) {
  clearInterval(window.liveBallTimer);

  let rotation = 0;

  window.liveBallTimer = setInterval(() => {
    const track = ball.closest(".live-ball-track");
    if (!track) return;

    const banner = track.closest(".live-banner");
    if (!banner) return;

    const trackRect = track.getBoundingClientRect();
    const bannerRect = banner.getBoundingClientRect();

    const x = trackRect.left - bannerRect.left;
    const y = trackRect.top - bannerRect.top;

    const onBottom = y > bannerRect.height / 2;

if (onBottom) {
  rotation -= 18;   // onder: linksom
} else {
  rotation += 18;   // boven, rechts én links: rechtsom
}

    ball.style.transform = `rotate(${rotation}deg)`;
  }, 50);
}

function isTodayMatch(match) {
  const [datePart] = match.date.split(" ");
  const [month, day, year] = datePart.split("/").map(Number);

  const matchDate = new Date(year, month - 1, day);
  const today = new Date();

  return (
    matchDate.getFullYear() === today.getFullYear() &&
    matchDate.getMonth() === today.getMonth() &&
    matchDate.getDate() === today.getDate()
  );
}

function formatDutchTime(dateString) {
  const [datePart, timePart] = dateString.split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);

  const dutchHours = (hours + 6) % 24;

  return `${String(dutchHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function renderNextMatch(match, countries) {
  const card = document.getElementById("next-match-card");
  if (!card) return;

  if (!match) {
    card.innerHTML = "";
    return;
  }

  const home = getCountryByCode(match.home, countries);
  const away = getCountryByCode(match.away, countries);

  card.innerHTML = `
    <div>
      <div class="next-match-label">Next match</div>
      <div class="next-match-teams">
        ${home?.flag || ""} ${home?.name || match.home}
        <span>vs</span>
        ${away?.flag || ""} ${away?.name || match.away}
      </div>
    </div>

        <div class="next-match-datetime">
      <strong>${match.date.split(" ")[0]}</strong>
      <div class="next-match-time">
        ${match.date.split(" ")[1]} US / ${formatDutchTime(match.date)} NL
      </div>
    </div>
  `;
}

function renderLiveNow(matches, countries) {
 const liveMatch = matches.find(
  match => match.status === "playing"
);

  if (!liveMatch) {
    liveNowContainer.innerHTML = "";
    return;
  }

  const home = getCountryByCode(liveMatch.home, countries);
  const away = getCountryByCode(liveMatch.away, countries);
  const isLive = true;
const matchLabel = "● LIVE";

  liveNowContainer.innerHTML = `
  <div class="live-banner">
    <div class="live-topline">
  <span class="live-badge">${matchLabel}</span>
  <span class="live-round">${liveMatch.round.toUpperCase()}</span>
  <span class="live-clock" id="live-clock">${formatLocalClock()}</span>
</div>

<div class="live-matchup compact">
  <div class="live-team live-team-home">
    <strong>${home?.flag || ""} ${home?.name || liveMatch.home}</strong>
  </div>

  <div class="live-score">
  ${isLive ? `${liveMatch.homeScore} – ${liveMatch.awayScore}` : formatDate(liveMatch.date)}
</div>

  <div class="live-team live-team-away">
    <strong>${away?.name || liveMatch.away} ${away?.flag || ""}</strong>
  </div>
</div>

    <div class="live-ball-track" style="${isLive ? "" : "display:none"}">
      <img
        class="live-ball"
        src="images/soccer-ball.svg"
        alt=""
        draggable="false"
      />
    </div>
  </div>
`;
  const clock = document.getElementById("live-clock");

if (clock) {
  clearInterval(window.liveClockTimer);

  window.liveClockTimer = setInterval(() => {
    clock.textContent = formatLocalClock();
  }, 1000);
}

function formatTime(dateString) {
  const [, timePart] = dateString.split(" ");
  return timePart || "";
}

const ball = document.querySelector(".live-ball");

if (ball && isLive) {
  startLiveBall(ball);
} else {
  clearInterval(window.liveBallTimer);
}

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

    <div class="country-title">
      <h2>${country.name}</h2>

      <div class="country-code">
        ${country.code}
      </div>

      <div class="country-status status-${tournamentData?.status || "not_participating"}">
        ${
          tournamentData?.status === "playing"
            ? "🟡 LIVE NOW"
            : tournamentData?.status === "in_race"
              ? "🟢 Still competing"
              : tournamentData?.status === "out"
                ? "🔴 Eliminated"
                : "⚪ Not participating"
        }
      </div>
    </div>
  </div>

  <div class="summary-strip">

    <div class="summary-card">
      <div class="summary-number">${stats.played}</div>
      <div class="summary-label">Matches</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${stats.wins}</div>
      <div class="summary-label">Wins</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${stats.goalsFor}</div>
      <div class="summary-label">Goals</div>
    </div>

  </div>

  <hr>

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

function drawMap(world, countries, tournament, matches, results, mapOverrides) {
  mapContainer.innerHTML = "";

  const width = mapContainer.clientWidth;
  const height = mapContainer.clientHeight;

  const svg = d3.select(mapContainer)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "real-world-map");

  svg.append("defs").html(`
    <radialGradient id="oceanGradient" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#f8fbff"/>
      <stop offset="55%" stop-color="#e8f2ff"/>
      <stop offset="100%" stop-color="#cfe3f7"/>
    </radialGradient>

    <filter id="softLandShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
  `);

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", 18)
    .attr("fill", "url(#oceanGradient)");

  const mapCountries = topojson.feature(world, world.objects.countries);

  const projection = d3.geoNaturalEarth1()
    .fitExtent([[24, 24], [width - 24, height - 24]], mapCountries);

  const path = d3.geoPath().projection(projection);
  const codeToMapId = buildCountryCodeIndex(countries, mapOverrides);

  function countryCenterByCode(code) {
    const mapId = codeToMapId[code];
    if (!mapId) return null;

    const feature = mapCountries.features.find(d => String(d.id) === String(mapId));
    if (!feature) return null;

    return path.centroid(feature);
  }

  svg.selectAll("path")
    .data(mapCountries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", d => {
      const status = tournament[d.id]?.status || "not_participating";
      return `country status-${status}`;
    })
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

  svg.selectAll(".island-marker")
  .data(mapOverrides)
  .enter()
  .append("circle")
  .attr("class", "island-marker")
  .attr("cx", d => projection([d.lon, d.lat])[0])
  .attr("cy", d => projection([d.lon, d.lat])[1])
  .attr("r", 5)
  .style("fill", d => {
    const mapId = codeToMapId[d.code];
    const team = mapId ? tournament[mapId] : null;
    const status = team ? team.status : "not_participating";
    return statusColors[status] || statusColors.unknown;
  })
  .style("stroke", "#fff")
  .style("stroke-width", 2)
  .style("cursor", "pointer")
  .on("mousemove", (event, d) => {
    const mapId = codeToMapId[d.code];
    const country = countries[mapId];

    if (!country) return;

    const tournamentData = tournament[mapId];

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
    const mapId = codeToMapId[d.code];
    const country = countries[mapId];

    if (!country) return;

    renderCountryPanel(
      country,
      mapId,
      tournament[mapId],
      matches,
      results,
      countries
    );
  });

  if (showFcgLayer && appState.fcgConnections) {
  const fcgMarkerData = Object.entries(appState.fcgConnections)
    .map(([code, players]) => ({
      code,
      players,
      coordinates: fcgCapitalCoordinates[code]
    }))
    .filter(item => item.coordinates);

  const fcgMarkers = svg.selectAll(".fcg-marker")
    .data(fcgMarkerData)
    .enter()
    .append("g")
    .attr("class", "fcg-marker")
    .attr("transform", d => {
      const [x, y] = projection(d.coordinates);
      return `translate(${x}, ${y})`;
    })
    .style("cursor", "pointer");

  fcgMarkers.append("circle")
    .attr("r", 8)
    .attr("fill", "#168542")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 2);

  fcgMarkers.append("circle")
    .attr("r", 3)
    .attr("fill", "#ffffff");

  fcgMarkers
    .on("mousemove", (event, d) => {
      const country = Object.values(countries)
        .find(item => item.code === d.code);

      tooltip.style.display = "block";
      tooltip.style.left = `${event.pageX + 15}px`;
      tooltip.style.top = `${event.pageY + 15}px`;

      tooltip.innerHTML = `
        <strong>FC Groningen connection</strong><br>
        ${country?.flag || "🌍"} ${country?.name || d.code}<br>
        ${d.players.map(player => player.name).join("<br>")}
      `;
    })
    .on("mouseleave", () => {
      tooltip.style.display = "none";
    });
}

  const liveMatch = matches.find(match => match.status === "playing");

  if (liveMatch) {
    const start = countryCenterByCode(liveMatch.home);
    const end = countryCenterByCode(liveMatch.away);

    if (start && end) {
      const pathId = `live-focus-path-${liveMatch.id}`;

      svg.append("path")
        .attr("id", pathId)
        .attr("class", "next-match-path")
        .attr(
          "d",
        `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`
        );

      svg.append("text")
        .attr("class", "next-match-ball")
        .append("textPath")
        .attr("href", `#${pathId}`)
        .attr("startOffset", "0%")
        .text("⚽")
        .append("animate")
        .attr("attributeName", "startOffset")
        .attr("values", "0%;100%")
        .attr("dur", "6s")
        .attr("repeatCount", "indefinite");
    }
  }
}

function getVisibleMatches(matches, stage) {
  if (stage === "groups") {
    return matches.filter(m => String(m.round).toLowerCase().includes("group"));
  }

  if (stage === "r32") {
    return matches.filter(m => m.round === "r32");
  }

  if (stage === "r16") {
    return matches.filter(m => m.round === "r16");
  }

  if (stage === "qf") {
    return matches.filter(m => m.round === "qf");
  }

  if (stage === "sf") {
    return matches.filter(m => m.round === "sf");
  }

  if (stage === "final") {
    return matches.filter(m =>
      m.round === "final" || m.round === "third"
    );
  }

  return matches;
}

function detectCurrentStage(matches) {
  const stages = ["groups", "r32", "r16", "qf", "sf", "final"];

  for (const stage of stages) {
    const stageMatches = getVisibleMatches(matches, stage);

    if (
      stageMatches.some(match =>
        ["playing", "scheduled", "pending"].includes(match.status)
      )
    ) {
      return stage;
    }
  }

  return "final";
}

function setActiveTimelineStage(stage) {
  document.querySelectorAll(".timeline-stage").forEach(button => {
    button.classList.toggle("active", button.dataset.stage === stage);
  });
}
function stageRank(stage) {
  return {
    groups: 1,
    r32: 2,
    r16: 3,
    qf: 4,
    sf: 5,
    final: 6
  }[stage] || 0;
}

function getStageParticipantCodes(matches, stage) {
  if (stage === "groups") {
    return null;
  }

  return new Set(
    getVisibleMatches(matches, stage)
      .flatMap(m => [m.home, m.away])
      .filter(Boolean)
  );
}

function renderStage(stage) {
  if (!appState.world) return;

  currentStage = stage;
  setActiveTimelineStage(stage);

  const visibleMatches = getVisibleMatches(appState.matches, stage);
  const visiblePreviewMatches = getVisibleMatches(appState.preview.matches, stage);
  const codeToMapId = buildCountryCodeIndex(appState.countries, appState.mapOverrides);
  const mapTournament = JSON.parse(JSON.stringify(appState.derivedTournament));
  applyResultsToTournament(
  mapTournament,
  appState.preview.matches,
  appState.results,
  codeToMapId
);
  const actualStage = detectCurrentStage(appState.preview.matches);
const selectedStageIsPast = stageRank(stage) < stageRank(actualStage);

if (selectedStageIsPast) {
  const participantCodes = getStageParticipantCodes(
    appState.preview.matches,
    stage
  );

  Object.values(mapTournament).forEach(team => {
    team.status = "out";
  });

  if (stage === "groups") {
    Object.values(mapTournament).forEach(team => {
      team.status = "in_race";
    });
  } else {
    participantCodes.forEach(code => {
      const mapId = codeToMapId[code];
      if (mapId && mapTournament[mapId]) {
        mapTournament[mapId].status = "in_race";
      }
    });
  }
}

  Object.values(mapTournament).forEach(team => {
    if (team.status === "playing" || team.status === "upcoming") {
      team.status = "in_race";
    }
  });

  const liveMatches = selectedStageIsPast
  ? []
  : visiblePreviewMatches.filter(m => m.status === "playing");

const upcomingMatch = selectedStageIsPast
  ? null
  : visiblePreviewMatches
      .filter(m => m.status === "scheduled" && m.home && m.away)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  liveMatches.forEach(match => {
    const homeId = codeToMapId[match.home];
    const awayId = codeToMapId[match.away];

    if (homeId && mapTournament[homeId]) mapTournament[homeId].status = "playing";
    if (awayId && mapTournament[awayId]) mapTournament[awayId].status = "playing";
  });

  if (upcomingMatch) {
    const homeId = codeToMapId[upcomingMatch.home];
    const awayId = codeToMapId[upcomingMatch.away];

    if (homeId && mapTournament[homeId]) mapTournament[homeId].status = "upcoming";
    if (awayId && mapTournament[awayId]) mapTournament[awayId].status = "upcoming";
  }

  updateCounters(mapTournament, visiblePreviewMatches);

  drawMap(
    appState.world,
    appState.countries,
    mapTournament,
    visiblePreviewMatches,
    appState.results,
    appState.mapOverrides
  );

  renderLiveNow(visiblePreviewMatches, appState.countries);
  renderNextMatch(upcomingMatch, appState.countries);
  renderBracket(visibleMatches, appState.countries);
  renderTodayMatches(visibleMatches, appState.countries);
  console.log("FCG", appState.fcgConnections);
}

function setupTimeline() {
  document.querySelectorAll(".timeline-stage").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".timeline-stage").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");
      currentStage = button.dataset.stage;

      renderStage(currentStage);
    });
  });
}
function setupLayerControls() {
  const toggle = document.getElementById("fcg-layer-toggle");

  if (!toggle) return;

  toggle.checked = showFcgLayer;

  toggle.addEventListener("change", () => {
    showFcgLayer = toggle.checked;

    console.log("FC Groningen layer:", showFcgLayer);

    renderStage(currentStage);
  });
}

loadData().then(({ world, countries, teams, matches, preview, results, tournamentInfo, mapOverrides, fcgConnections }) => {
  if (currentCupName) {currentCupName.textContent = tournamentInfo.name;}
  const codeToMapId = buildCountryCodeIndex(countries, mapOverrides);

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
appState = {
  world,
  countries,
  teams,
  matches,
  preview,
  results,
  tournamentInfo,
  mapOverrides,
  fcgConnections,
  derivedTournament
};

currentStage = detectCurrentStage(preview.matches);

setupTimeline();
setupLayerControls();
renderStage(currentStage);
});