const liveNowContainer = document.getElementById("live-now");
const CURRENT_CUP = "worldcup-2026";
let currentStage = "groups";
const clubLayers = {
  fcg: false,
  ajax: false
};
const countryCapitalCoordinates = window.capitals;
const capitalCodeAliases = {
  NED: "NLD",
  CRO: "HRV",
  POR: "PRT",
  ENG: "GBR"
};

function getCapitalInfoByCode(code) {
  const capitalCode = capitalCodeAliases[code] || code;

  return countryCapitalCoordinates[capitalCode] || null;
}
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
  winner: "#d4af37",
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

function formatPopulation(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("nl-NL").format(value);
}

function renderTodayMatches(matches, countries) {
  if (!todayMatchesContainer) return;
  const upcoming = matches
    .filter(match => match.status === "scheduled")
    .slice(0, 3);

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
  if (!bracketContainer) return;
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
  const [
    world,
    countries,
    teams,
    matches,
    preview,
    tournamentInfo,
    mapOverrides,
    clubLayerData,
    ajaxLayerData,
    worldCupSchedule
  ] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.json("data/countries.json"),
    d3.json(`${DATA_PATH}/teams.json`),
    d3.json(`${DATA_PATH}/matches.json`),
    d3.json(`${DATA_PATH}/preview.json`),
    d3.json(`${DATA_PATH}/tournament.json`),
    d3.json("data/map-overrides.json"),
    loadClubLayer("fc-groningen"),
    loadClubLayer("afc-ajax"),
    d3.json("https://www.thestatsapi.com/world-cup/data/fixtures.json")
  ]);

  return {
    world,
    countries,
    teams,

    // Alleen voor kaart, status en toernooilogica.
    matches,

    // Alleen voor gespeelde wedstrijden in het landenpaneel.
    preview,

    // Behoud de bestaande interface, maar meng previewresultaten
    // niet meer met de kaartdata.
    results: [],

    tournamentInfo,
    mapOverrides,
    clubLayerData,
    ajaxLayerData,
    worldCupSchedule
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

function applyResultsToTournament(
  tournament,
  matches,
  results,
  codeToMapId
) {
  results.forEach(result => {
    const match = matches.find(m => m.id === result.match);
    if (!match) return;

    const winner = getWinner(match, results);
    if (!winner) return;

    const loser =
      winner === match.home
        ? match.away
        : match.home;

    const winnerId = codeToMapId[winner];
    const loserId = codeToMapId[loser];

    const roundName = String(match.round || "")
      .trim()
      .toLowerCase();

    const isFinal = roundName === "final";

    if (winnerId && tournament[winnerId]) {
      tournament[winnerId].status =
        isFinal ? "winner" : "in_race";

      tournament[winnerId].note =
        isFinal
          ? "World champion"
          : `Advanced from ${match.round}`;
    }

    if (loserId && tournament[loserId]) {
      tournament[loserId].status = "out";
      tournament[loserId].note =
        `Eliminated in ${match.round}`;
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

  outCount.textContent = teams.filter(team =>
    team.status === "out"
  ).length;
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

const hostCityTimeZones = {
  "atlanta": "America/New_York",
  "boston": "America/New_York",
  "dallas": "America/Chicago",
  "guadalajara": "America/Mexico_City",
  "houston": "America/Chicago",
  "kansas-city": "America/Chicago",
  "los-angeles": "America/Los_Angeles",
  "miami": "America/New_York",
  "mexico-city": "America/Mexico_City",
  "monterrey": "America/Monterrey",
  "new-york": "America/New_York",
  "philadelphia": "America/New_York",
  "san-francisco": "America/Los_Angeles",
  "seattle": "America/Los_Angeles",
  "toronto": "America/Toronto",
  "vancouver": "America/Vancouver"
};

function formatTimeInZone(isoString, timeZone) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}

function formatDutchTime(dateString) {
  const [, timePart] = dateString.split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  const dutchHours = (hours + 6) % 24;

  return `${String(dutchHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function renderNextMatch(match, countries) {
  const card = document.getElementById("next-match-card");
  if (!card) return;

  if (!match) {
    card.innerHTML = "";
    card.style.display = "none";
    return;
  }

  card.style.display = "";

  const home = getCountryByCode(match.home, countries);
  const away = getCountryByCode(match.away, countries);

  const dateValue = String(match.date || "");
  const [datePart = "Date TBA", timePart = ""] = dateValue.split(" ");

  const timeHtml = timePart
    ? `${timePart} US / ${formatDutchTime(dateValue)} NL`
    : "Time TBA";

  card.innerHTML = `
  <div class="next-card">

    <div class="next-card-title">
      NEXT MATCH
    </div>

    <div class="next-card-teams">
      <span>${home?.flag || ""}</span>

      <span class="next-card-name">
        ${home?.name || match.home}
      </span>

      <span class="next-card-vs">
        VS
      </span>

      <span>${away?.flag || ""}</span>

      <span class="next-card-name">
        ${away?.name || match.away}
      </span>
    </div>

    <div class="next-card-date">
      ${datePart}
    </div>

    <div class="next-card-time">
      ${timeHtml}
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

    clearInterval(window.liveClockTimer);
    clearInterval(window.liveBallTimer);

    return;
  }

  const home = getCountryByCode(liveMatch.home, countries);
  const away = getCountryByCode(liveMatch.away, countries);

  liveNowContainer.innerHTML = `
    <div class="live-banner">
      <div class="live-match-main">
        <div class="live-topline">
          <span class="live-badge">● LIVE</span>
          <span class="live-round">
            ${(liveMatch.round || "").toUpperCase()}
          </span>
        </div>

        <div class="live-match-teams">
          <span class="live-team-name">
            ${home?.flag || ""} ${home?.name || liveMatch.home}
          </span>

          <span class="live-score">
            ${liveMatch.homeScore ?? 0} – ${liveMatch.awayScore ?? 0}
          </span>

          <span class="live-team-name">
            ${away?.flag || ""} ${away?.name || liveMatch.away}
          </span>
        </div>
      </div>

      <div class="live-match-datetime">
        <strong id="live-clock">${formatLocalClock()}</strong>
      </div>

      <div class="live-ball-track">
        <img
          class="live-ball"
          src="images/soccer-ball.svg"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      </div>
    </div>
  `;

  const clock = document.getElementById("live-clock");

  clearInterval(window.liveClockTimer);

  if (clock) {
    window.liveClockTimer = setInterval(() => {
      clock.textContent = formatLocalClock();
    }, 1000);
  }

  const ball = liveNowContainer.querySelector(".live-ball");

  clearInterval(window.liveBallTimer);

  if (ball) {
    startLiveBall(ball);
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
function getMatchesPlayed(countryCode, results, matches) {

  return results.filter(result => {

    const match = matches.find(m => m.id === result.match);

    if (!match) return false;

    return match.home === countryCode || match.away === countryCode;

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

function renderCountryPanel(
  country,
  mapId,
  tournamentData,
  matches,
  preview,
  countries
) {

  const teamCode = country.code;
  const clubCodeAliases = {
    NLD: ["NLD", "NED"]
  };

  const possibleClubCodes =
    clubCodeAliases[teamCode] || [teamCode];

  function findClubPlayers(layerData) {
    if (!layerData?.connections) return [];

    for (const code of possibleClubCodes) {
      const players = layerData.connections[code];

      if (Array.isArray(players)) {
        return players;
      }
    }

    return [];
  }

  const fcgPlayers = clubLayers.fcg
    ? findClubPlayers(appState.clubLayerData)
    : [];

  const ajaxPlayers = clubLayers.ajax
    ? findClubPlayers(appState.ajaxLayerData)
    : [];
    
  console.log("Country panel:", country.name, "country.code:", country.code, "mapId:", mapId);
  
  const previewMatches = Array.isArray(preview?.matches)
    ? preview.matches
    : [];

  const countryMatches = previewMatches.filter(match =>
  match.home === teamCode || match.away === teamCode
);

  const playedMatches = countryMatches
    .filter(match =>
      match.status === "finished" &&
      match.homeScore != null &&
      match.awayScore != null
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const nextMatch = countryMatches
    .filter(match =>
      match.status === "scheduled" &&
      match.home &&
      match.away
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  const status = tournamentData?.status || "not_participating";

  const statusLabel =
  status === "winner"
    ? "🏆 World champion"
    : status === "playing"
      ? "Now playing"
      : status === "in_race" || status === "upcoming"
        ? "Still competing"
        : status === "out"
          ? "Eliminated"
          : "Not participating";

  const statusClass =
  status === "winner"
    ? "is-winner"
    : status === "playing"
      ? "is-playing"
      : status === "in_race" || status === "upcoming"
        ? "is-competing"
        : status === "out"
          ? "is-eliminated"
          : "is-not-participating";

  const participates = status !== "not_participating";

  function getTeam(code) {
    return findCountryByCode(countries, code);
  }

  function renderTeam(code) {
    const team = getTeam(code);

    return `
      <span class="panel-team">
        <span class="panel-team-flag">
          ${team?.flag || ""}
        </span>

        <span class="panel-team-name">
          ${team?.name || code}
        </span>
      </span>
    `;
  }

  function renderResult(match) {
  const hasPenalties =
    match.homePenaltyScore != null &&
    match.awayPenaltyScore != null;

  return `
    <article class="panel-match">
      <div class="panel-match-topline">
        <span class="panel-match-round">
          ${match.round || "Tournament match"}
        </span>

        <span class="panel-match-date">
          ${formatDate(match.date)}
        </span>
      </div>

      <div class="panel-match-result">
        <div class="panel-match-team panel-match-team-home">
          ${renderTeam(match.home)}
        </div>

        <strong class="panel-score">
          ${match.homeScore}–${match.awayScore}
        </strong>

        <div class="panel-match-team panel-match-team-away">
          ${renderTeam(match.away)}
        </div>
      </div>

      ${
        hasPenalties
          ? `
            <div class="panel-penalties">
              Won on penalties:
              ${match.homePenaltyScore}–${match.awayPenaltyScore}
            </div>
          `
          : ""
      }
    </article>
  `;
}

  function renderCountryPanelNextMatch(match) {
    if (!match) return "";

    return `
      <section class="country-panel-section">
        <div class="country-panel-section-title">
          Next match
        </div>

        <article class="panel-next-match">
          <div class="panel-match-meta">
            <span>${match.round || "Tournament match"}</span>
            <span>${formatDate(match.date)}</span>
          </div>

          <div class="panel-next-teams">
            ${renderTeam(match.home)}

            <span class="panel-versus">
              vs
            </span>

            ${renderTeam(match.away)}
          </div>
        </article>
      </section>
    `;
  }

  const capitalInfo = countryCapitalCoordinates[teamCode];
  const localTime =
    capitalInfo?.timeZone
      ? getLocalTime(capitalInfo.timeZone)
      : "—";
  const daylight =
    capitalInfo?.timeZone
      ? getDaylight(capitalInfo.timeZone)
      : "—";

  countryPanel.innerHTML = `
    <button
      class="country-panel-close"
      type="button"
      aria-label="Close country information">
      ×
    </button>

    <header class="country-panel-header">

  <div class="country-panel-title-row">
    <div class="country-panel-flag">
      ${country.flag || "🌍"}
    </div>

    <h2>${country.name}</h2>
  </div>

  <div class="country-panel-confederation">
    ${country.confederation || "—"}
  </div>

  <div class="country-panel-status ${statusClass}">
    <span class="country-status-dot"></span>
    ${statusLabel}
  </div>

</header>

    <div class="country-panel-meta">
  ${
    capitalInfo
      ? `
      <div class="country-panel-row">
        <span class="country-panel-label">Capital</span>
        <span class="country-panel-value">${capitalInfo.capital}</span>
      </div>
      `
      : ""
  }

  <div class="country-panel-row">
    <span class="country-panel-label">Population</span>
    <span class="country-panel-value">
      ${formatPopulation(country.population)}
    </span>
  </div>

  <div class="country-panel-row">
    <span class="country-panel-label">FIFA Ranking</span>
    <span class="country-panel-value">
      ${country.fifaRanking ?? country.ranking ?? "—"}
    </span>
  </div>

  ${
    capitalInfo
      ? `
      <div class="country-panel-row">
        <span class="country-panel-label">Local time</span>
        <span class="country-panel-value">${localTime}</span>
      </div>

      <div class="country-panel-row">
        <span class="country-panel-label">Daylight</span>
        <span class="country-panel-value">
          ${daylight}
        </span>
      </div>
      `
      : ""
  }

</div>

    ${
  fcgPlayers.length > 0 || ajaxPlayers.length > 0
    ? `
      <section class="country-panel-section club-connections">
        <div class="country-panel-section-title">
          Club connections
        </div>

        ${
          fcgPlayers.length > 0
            ? `
              <div class="club-connection-group">
                <strong>FC Groningen</strong>

                ${fcgPlayers.map(player => `
                  <div class="club-connection-player">
                    ${player.name}
                  </div>
                `).join("")}
              </div>
            `
            : ""
        }

        ${
          ajaxPlayers.length > 0
            ? `
              <div class="club-connection-group">
                <strong>AFC Ajax</strong>

                ${ajaxPlayers.map(player => `
                  <div class="club-connection-player">
                    ${player.name}
                  </div>
                `).join("")}
              </div>
            `
            : ""
        }
      </section>
    `
    : ""
}

    ${
  nextMatch
  ? renderCountryPanelNextMatch(nextMatch)
    : !participates
      ? `
        <section class="country-panel-section">
          <div class="country-panel-empty">
            This country is not participating in the tournament.
          </div>
        </section>
      `
      : ""
}

    ${
      playedMatches.length > 0
        ? `
          <section class="country-panel-section previous-matches">
            <div class="country-panel-section-title">
              Previous matches
            </div>

            <div class="country-panel-match-list">
              ${playedMatches.map(renderResult).join("")}
            </div>
          </section>
        `
        : participates
          ? `
            <section class="country-panel-section previous-matches">
              <div class="country-panel-section-title">
                Previous matches
              </div>

              <div class="country-panel-empty">
                No results yet.
              </div>
            </section>
          `
          : ""
    }
  `;

  countryPanel
    .querySelector(".country-panel-close")
    ?.addEventListener("click", closeCountryPanel);

countryPanel.classList.remove(
  "is-winner",
  "is-playing",
  "is-competing",
  "is-eliminated",
  "is-not-participating"
);

countryPanel.classList.add(statusClass);
countryPanel.classList.add("is-open");
countryPanel.setAttribute("aria-hidden", "false");
}

function closeCountryPanel() {
  countryPanel.classList.remove("is-open");
  countryPanel.setAttribute("aria-hidden", "true");
}

function getLocalTime(timeZone) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(new Date());
}

function getDaylight(timeZone) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone
    }).format(new Date())
  );

  return hour >= 6 && hour < 18 ? "☀️ Day" : "🌙 Night";
}

function drawMap(world, countries, tournament, matches, results, mapOverrides, preview) {
  mapContainer.innerHTML = "";
  tooltip.style.display = "none";

  const mapBounds = mapContainer.getBoundingClientRect();

  const width = Math.max(
    1,
    Math.round(mapBounds.width)
  );

  const height = Math.max(
    1,
    Math.round(mapBounds.height)
  );

  const svg = d3.select(mapContainer)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "real-world-map");

  svg.append("defs").html(`
    <radialGradient id="oceanGradient" cx="50%" cy="45%" r="75%">
  <animate
    attributeName="cx"
    values="48%;52%;48%"
    dur="36s"
    repeatCount="indefinite" />
  <animate
    attributeName="cy"
    values="44%;46%;44%"
    dur="42s"
    repeatCount="indefinite" />
      <stop offset="0%" stop-color="#d7e7f3"/>
      <stop offset="58%" stop-color="#b9d2e8"/>
      <stop offset="100%" stop-color="#8fb8d7"/>
    </radialGradient>

    <filter id="softLandShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>

    <filter id="winnerGlow" x="-50%" y="-50%" width="200%" height="200%">
  <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#d4af37" flood-opacity="0.55" />
    </filter>
  `);

  svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("rx", 18)
  .attr("fill", "url(#oceanGradient)")
  .on("mousemove", () => {
    tooltip.style.display = "none";
  });
  
  const zoomLayer = svg.append("g")
  .attr("class", "map-zoom-layer");

  const mapCountries = topojson.feature(world, world.objects.countries);

  const projection = d3.geoNaturalEarth1()
    .fitExtent([[24, 24], [width - 24, height - 24]], mapCountries);

  const path = d3.geoPath().projection(projection);

  DayNightLayer.render({
    zoomLayer,
    path
  });

  const codeToMapId = buildCountryCodeIndex(
  countries,
  mapOverrides
);

function countryCenterByCode(code) {
  const mapId = codeToMapId[code];

  if (!mapId) return null;

  const feature = mapCountries.features.find(
    countryFeature =>
      String(countryFeature.id) === String(mapId)
  );

  if (!feature) return null;

  return path.centroid(feature);
}

zoomLayer
  .selectAll("path.country")
  .data(mapCountries.features)
  .enter()
  .append("path")
  .attr("d", path)
  .attr("class", d => {
    const status =
      tournament[d.id]?.status ||
      "not_participating";

    return `country status-${status}`;
  })
  .style("fill", d => {
    if (
      document.body.classList.contains(
        "launch-screen"
      )
    ) {
      return "#ffffff";
    }

    const tournamentData = tournament[d.id];

    const status = tournamentData
      ? tournamentData.status
      : "not_participating";

    return (
      statusColors[status] ||
      statusColors.unknown
    );
  })
  .style("filter", d => {
    const status =
      tournament[d.id]?.status ||
      "not_participating";

    return status === "winner"
      ? "url(#winnerGlow)"
      : "url(#softLandShadow)";
  })
  .on("mousemove", (event, d) => {
    const country = countries[d.id];
    const tournamentData = tournament[d.id];

    if (!country) return;

    tooltip.style.display = "block";
    tooltip.style.left =
      `${event.pageX + 15}px`;
    tooltip.style.top =
      `${event.pageY + 15}px`;

    tooltip.innerHTML = `
      ${country.flag || "🌍"}
      <strong>${country.name}</strong><br>

      <span class="tooltip-status ${
        tournamentData?.status ||
        "not_participating"
      }">
        ● ${prettyStatus(
          tournamentData?.status
        )}
      </span>
    `;
  })
  .on("mouseleave", () => {
    tooltip.style.display = "none";
  })
  .on("click", (event, d) => {
    const country = countries[d.id];
    const tournamentData = tournament[d.id];

    if (!country) return;

    zoomLayer
      .selectAll("path.country")
      .classed("selected-country", false);

    d3.select(event.currentTarget)
      .classed(
        "country-selected-pulse",
        false
      );

    requestAnimationFrame(() => {
      d3.select(event.currentTarget)
        .classed(
          "country-selected-pulse",
          true
        );
    });

    setTimeout(() => {
      d3.select(event.currentTarget)
        .classed(
          "country-selected-pulse",
          false
        );
    }, 700);

    renderCountryPanel(
      country,
      d.id,
      tournamentData,
      matches,
      preview,
      countries
    );
  });

  zoomLayer.selectAll(".island-marker")
    .data(mapOverrides)
    .enter()
    .append("circle")
    .attr("class", "island-marker")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", 2)
    .style("fill", d => {
        if (document.body.classList.contains("launch-screen")) {
          return "#ffffff";
        }

        const mapId = codeToMapId[d.code];
        const team = mapId ? tournament[mapId] : null;
        const status = team ? team.status : "not_participating";

        return statusColors[status] || statusColors.unknown;
      })
    .style("stroke", "none")
    .style("stroke-width", 1.5)
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
        <span class="tooltip-status ${tournamentData?.status || "not_participating"}">
          ● ${prettyStatus(tournamentData?.status)}
        </span>
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
        preview,
        countries
      );
    });

  if (clubLayers.fcg && appState.clubLayerData) {
    const fcgMarkerData = Object.entries(appState.clubLayerData.connections)
      .map(([code, players]) => {
    const capital = getCapitalInfoByCode(code);
        if (!capital) return null;

        return {
          code,
          players,
          coordinates: [capital.lon, capital.lat]
        };
      })
      .filter(Boolean)
      .filter(item => item.coordinates);

    const fcgMarkers = zoomLayer.selectAll(".fcg-marker")
      .data(fcgMarkerData)
      .enter()
      .append("g")
      .attr("class", "fcg-marker")
      .attr("transform", d => {
        const [x, y] = projection(d.coordinates);
        return `translate(${x}, ${y})`;
      })
      .style("cursor", "pointer");

    fcgMarkers.append("image")
  .attr("href", CLUBS.fcg.logo)
  .attr("x", -11)
  .attr("y", -11)
  .attr("width", 22)
  .attr("height", 22)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("filter", "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.25))");

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
  if (clubLayers.ajax && appState.ajaxLayerData) {
    const ajaxMarkerData = Object.entries(appState.ajaxLayerData.connections)
      .map(([code, players]) => {
    const capital = getCapitalInfoByCode(code);
        if (!capital) return null;

        return {
          code,
          players,
          coordinates: [capital.lon, capital.lat]
        };
      })
      .filter(Boolean)
      .filter(item => item.coordinates);

    const ajaxMarkers = zoomLayer.selectAll(".ajax-marker")
      .data(ajaxMarkerData)
      .enter()
      .append("g")
      .attr("class", "ajax-marker")
      .attr("transform", d => {
        const [x, y] = projection(d.coordinates);
        return `translate(${x}, ${y})`;
      })
      .style("cursor", "pointer");

    ajaxMarkers.append("image")
  .attr("href", CLUBS.ajax.logo)
  .attr("x", -11)
  .attr("y", -11)
  .attr("width", 22)
  .attr("height", 22)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .style("filter", "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.25))");

    ajaxMarkers
      .on("mousemove", (event, d) => {
        const country = Object.values(countries)
          .find(item => item.code === d.code);

        tooltip.style.display = "block";
        tooltip.style.left = `${event.pageX + 15}px`;
        tooltip.style.top = `${event.pageY + 15}px`;
        tooltip.innerHTML = `
        <strong>AFC Ajax connection</strong><br>
        ${country?.flag || "🌍"} ${country?.name || d.code}<br>
        ${d.players.map(player => player.name).join("<br>")}
      `;
      })
      .on("mouseleave", () => {
        tooltip.style.display = "none";
      });
  }

  console.log("matches:", matches);
  console.log("statuses:", [...new Set(matches.map(m => m.status))]);
  const liveMatch = matches.find(match => match.status === "playing");
  console.log("liveMatch:", liveMatch);

  if (liveMatch) {
    const start = countryCenterByCode(liveMatch.home);
    const end = countryCenterByCode(liveMatch.away);

    if (start && end) {
      const pathId = `live-focus-path-${liveMatch.id}`;

      zoomLayer.append("path")
        .attr("id", pathId)
        .attr("class", "next-match-path")
        .attr(
          "d",
          `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`
        );

      zoomLayer.append("text")
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
    return matches.filter(m =>
      String(m.round).toLowerCase().includes("group")
    );
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

  if (stage === "winner") {
    return [];
  }

  return matches;
}

function detectCurrentStage(matches) {
  const stages = ["groups", "r32", "r16", "qf", "sf", "final", "winner"];

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
  closeCountryPanel();
  tooltip.style.display = "none";

  setActiveTimelineStage(stage);

  const visibleMatches = getVisibleMatches(
  appState.matches,
  stage
);

  const visiblePreviewMatches = getVisibleMatches(
  appState.preview.matches,
  stage
  );

  const codeToMapId = buildCountryCodeIndex(
    appState.countries,
    appState.mapOverrides
  );

  const mapTournament = JSON.parse(
    JSON.stringify(appState.derivedTournament)
  );

  applyResultsToTournament(
    mapTournament,
    appState.preview.matches,
    appState.results,
    codeToMapId
  );

  const actualStage = detectCurrentStage(appState.preview.matches);
  const selectedStageIsPast =
    stageRank(stage) < stageRank(actualStage);

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
    if (
      team.status === "playing" ||
      team.status === "upcoming"
    ) {
      team.status = "in_race";
    }
  });

  if (stage === "final") {
  const finalMatch = appState.preview.matches.find(
    match => match.round === "final"
  );

  if (finalMatch) {
    [finalMatch.home, finalMatch.away].forEach(code => {
      const mapId = codeToMapId[code];

      if (mapId && mapTournament[mapId]) {
        mapTournament[mapId].status = "in_race";
      }
    });
  }
}

if (stage === "winner") {
  const finalMatch = appState.preview.matches.find(
    match => match.round === "final"
  );

  if (finalMatch) {
    const winnerCode =
      finalMatch.homeScore > finalMatch.awayScore
        ? finalMatch.home
        : finalMatch.away;

    const winnerMapId = codeToMapId[winnerCode];

    if (winnerMapId && mapTournament[winnerMapId]) {
      mapTournament[winnerMapId].status = "winner";
    }
  }
}

  const liveMatches = selectedStageIsPast
    ? []
    : visiblePreviewMatches.filter(
      match => match.status === "playing"
    );

  const upcomingMatch = selectedStageIsPast
  ? null
  : visiblePreviewMatches
      .filter(m =>
        m.status === "scheduled" &&
        m.home &&
        m.away
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  liveMatches.forEach(match => {
    const homeId = codeToMapId[match.home];
    const awayId = codeToMapId[match.away];

    if (homeId && mapTournament[homeId]) {
      mapTournament[homeId].status = "playing";
    }

    if (awayId && mapTournament[awayId]) {
      mapTournament[awayId].status = "playing";
    }
  });

  if (upcomingMatch) {
    const homeId = codeToMapId[upcomingMatch.home];
    const awayId = codeToMapId[upcomingMatch.away];

    if (homeId && mapTournament[homeId]) {
      mapTournament[homeId].status = "upcoming";
    }

    if (awayId && mapTournament[awayId]) {
      mapTournament[awayId].status = "upcoming";
    }
  }

  updateCounters(
    mapTournament,
    visiblePreviewMatches
  );

  drawMap(
    appState.world,
    appState.countries,
    mapTournament,
    appState.matches,
    appState.results,
    appState.mapOverrides,
    appState.preview
  );

  renderLiveNow(
    visiblePreviewMatches,
    appState.countries
  );

  console.log("visibleMatches", visibleMatches);
  console.log("upcomingMatch", upcomingMatch);

  renderNextMatch(
    upcomingMatch,
    appState.countries
  );

  renderBracket(
    visibleMatches,
    appState.countries
  );

  renderTodayMatches(
    visibleMatches,
    appState.countries
  );
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
  const fcgToggle = document.getElementById("fcg-layer-toggle");
  const ajaxToggle = document.getElementById("ajax-layer-toggle");

  if (fcgToggle) {
    fcgToggle.checked = clubLayers.fcg;

    fcgToggle.addEventListener("change", () => {
      clubLayers.fcg = fcgToggle.checked;
      console.log("FC Groningen layer:", clubLayers.fcg);
      renderStage(currentStage);
    });
  }

  if (ajaxToggle) {
    ajaxToggle.checked = clubLayers.ajax;

    ajaxToggle.addEventListener("change", () => {
      clubLayers.ajax = ajaxToggle.checked;
      console.log("AFC Ajax layer:", clubLayers.ajax);
      renderStage(currentStage);
    });
  }
}

function updateNetherlandsClock() {
  const now = new Date();

  const time = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);

  const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric"
  });

let date = dateFormatter.format(now);
date = date.charAt(0).toUpperCase() + date.slice(1);

  const timeElement = document.getElementById("nl-clock-time");
  const dateElement = document.getElementById("nl-clock-date");

  if (timeElement) {
    timeElement.textContent = time;
  }

  if (dateElement) {
    dateElement.textContent = date;
  }
}

updateNetherlandsClock();
setInterval(updateNetherlandsClock, 1000);

async function loadClubLayer(club) {
  return d3.json(`data/club-layers/worldcup-2026/${club}.json`);
}

loadData().then(({ world, countries, teams, matches, preview, results, tournamentInfo, mapOverrides, clubLayerData, ajaxLayerData, worldCupSchedule }) => {
  if (currentCupName) { currentCupName.textContent = tournamentInfo.name; }
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
    clubLayerData,
    ajaxLayerData,
    scheduleFixtures: worldCupSchedule.fixtures,
    derivedTournament
  };

  currentStage = detectCurrentStage(preview.matches);

  setupTimeline();
  setupLayerControls();
  setupClubPanelToggle();
  renderStage(currentStage);
});

const CLUBS = {
  fcg: {
    name: "FC Groningen",
    logo: "assets/clubs/fc-groningen.svg"
  },

  ajax: {
    name: "AFC Ajax",
    logo: "assets/clubs/ajax.svg"
  }
};

function setupClubPanelToggle() {
  const panelToggle = document.getElementById("club-layers-panel-toggle");
  const clubPanel = document.querySelector(".map-club-control");

  if (!panelToggle || !clubPanel) return;

  function updateClubPanelVisibility() {
    clubPanel.hidden = !panelToggle.checked;
  }

  const launchScreen =
  document.getElementById("atlas-launch-screen");

const launchButton =
  document.getElementById("launch-enter");

if (launchScreen && launchButton) {
launchButton.addEventListener("click", async () => {
  const selectedTournament = launchButton.dataset.tournament;

  if (!selectedTournament) {
    return;
  }

  /*
   * Een browser staat orientation-lock meestal alleen toe
   * wanneer de pagina eerst fullscreen is geworden.
   */
  try {
  const isMobile =
  window.matchMedia("(max-width: 900px)").matches &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  if (isMobile) {
  const fullscreenTarget = document.documentElement;

    if (!document.fullscreenElement && fullscreenTarget.requestFullscreen) {
      await fullscreenTarget.requestFullscreen();
    }

    if (screen.orientation?.lock) {
      await screen.orientation.lock("landscape");
    }
  }
  } catch (error) {
    console.warn(
      "Fullscreen of automatische landscape-stand werd niet toegestaan:",
      error
    );
  }

  launchScreen.classList.add("is-closing");

  setTimeout(() => {
    document.body.classList.remove("launch-screen");
    launchScreen.hidden = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        renderStage("groups");
        window.dispatchEvent(new Event("resize"));
      });
    });
  }, 700);
});
}

  // Bedieningspaneel standaard verborgen
  panelToggle.checked = false;
  updateClubPanelVisibility();

  panelToggle.addEventListener("change", updateClubPanelVisibility);
}

let viewportRedrawTimer = null;

function redrawAtlasForViewport() {
  clearTimeout(viewportRedrawTimer);

  viewportRedrawTimer = setTimeout(() => {
    if (document.body.classList.contains("launch-screen")) {
      return;
    }

    if (typeof renderStage === "function") {
      void renderStage(currentStage);
    }
  }, 300);
}

window.addEventListener(
  "resize",
  redrawAtlasForViewport
);

window.addEventListener(
  "orientationchange",
  () => {
    setTimeout(redrawAtlasForViewport, 400);
  }
);

if (window.visualViewport) {
  window.visualViewport.addEventListener(
    "resize",
    redrawAtlasForViewport
  );
}

function setupMobileMapGestures() {
  const mapContainer = document.querySelector(".map-placeholder");

  if (!mapContainer || mapContainer.dataset.mobileGesturesReady === "true") {
    return;
  }

  mapContainer.dataset.mobileGesturesReady = "true";

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  const pointers = new Map();

  let startDistance = 0;
  let startScale = 1;

  let startCenterX = 0;
  let startCenterY = 0;

  let startTranslateX = 0;
  let startTranslateY = 0;

  let previousX = 0;
  let previousY = 0;

  function mobileLandscapeActive() {
    return window.matchMedia(
      "(max-width: 900px) and (orientation: landscape) and (pointer: coarse)"
    ).matches;
  }

  function getMapSvg() {
    return mapContainer.querySelector(
      "svg.real-world-map, svg"
    );
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function constrainPosition() {
    const maximumX =
      ((scale - 1) * mapContainer.clientWidth) / 2;

    const maximumY =
      ((scale - 1) * mapContainer.clientHeight) / 2;

    translateX = clamp(
      translateX,
      -maximumX,
      maximumX
    );

    translateY = clamp(
      translateY,
      -maximumY,
      maximumY
    );
  }

  function applyTransform() {
    const svg = getMapSvg();

    if (!svg) {
      return;
    }

    constrainPosition();

    svg.style.transformOrigin = "center center";
    svg.style.willChange = "transform";

    svg.style.transform =
      `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  function getTwoPointers() {
    return Array.from(pointers.values()).slice(0, 2);
  }

  function getDistance(first, second) {
    return Math.hypot(
      second.x - first.x,
      second.y - first.y
    );
  }

  function getCenter(first, second) {
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2
    };
  }

  mapContainer.addEventListener("pointerdown", event => {
    if (!mobileLandscapeActive()) {
      return;
    }

    mapContainer.setPointerCapture(event.pointerId);

    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (pointers.size === 1) {
      previousX = event.clientX;
      previousY = event.clientY;
    }

    if (pointers.size === 2) {
      const [first, second] = getTwoPointers();
      const center = getCenter(first, second);

      startDistance = getDistance(first, second);
      startScale = scale;

      startCenterX = center.x;
      startCenterY = center.y;

      startTranslateX = translateX;
      startTranslateY = translateY;
    }
  });

  mapContainer.addEventListener("pointermove", event => {
    if (
      !mobileLandscapeActive() ||
      !pointers.has(event.pointerId)
    ) {
      return;
    }

    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });

    if (pointers.size === 1) {
      const deltaX = event.clientX - previousX;
      const deltaY = event.clientY - previousY;

      translateX += deltaX;
      translateY += deltaY;

      previousX = event.clientX;
      previousY = event.clientY;
    }

    if (pointers.size >= 2) {
      const [first, second] = getTwoPointers();
      const center = getCenter(first, second);

      const currentDistance =
        getDistance(first, second);

      scale = clamp(
        startScale * (currentDistance / startDistance),
        1,
        4
      );

      translateX =
        startTranslateX +
        (center.x - startCenterX);

      translateY =
        startTranslateY +
        (center.y - startCenterY);
    }

    applyTransform();
    event.preventDefault();
  });

  function removePointer(event) {
    pointers.delete(event.pointerId);

    if (pointers.size === 1) {
      const remainingPointer =
        Array.from(pointers.values())[0];

      previousX = remainingPointer.x;
      previousY = remainingPointer.y;
    }
  }

  mapContainer.addEventListener(
    "pointerup",
    removePointer
  );

  mapContainer.addEventListener(
    "pointercancel",
    removePointer
  );

  /* Dubbel tikken zet de kaart terug naar normaal */
  mapContainer.addEventListener("dblclick", event => {
    if (!mobileLandscapeActive()) {
      return;
    }

    scale = 1;
    translateX = 0;
    translateY = 0;

    applyTransform();
    event.preventDefault();
  });

  /*
   * Als D3 de SVG opnieuw tekent,
   * blijft de ingestelde zoom behouden.
   */
  const mapObserver = new MutationObserver(() => {
    requestAnimationFrame(applyTransform);
  });

  mapObserver.observe(mapContainer, {
    childList: true,
    subtree: true
  });
}

setupMobileMapGestures();