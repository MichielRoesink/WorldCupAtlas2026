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
  return status.replace("_", " ");
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
  const [world, countries, tournament, matches] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.json("data/countries.json"),
    d3.json("data/tournaments/world-cup-2026.json"),
    d3.json("data/matches-2026.json")
  ]);

  return { world, countries, tournament, matches };
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

function deriveTournamentFromMatches(baseTournament, matches, codeToMapId) {
  const derived = { ...baseTournament };

  matches.forEach(match => {
    const homeId = codeToMapId[match.home];
    const awayId = codeToMapId[match.away];

    if (homeId && !derived[homeId]) {
      derived[homeId] = { status: "in_race", note: `${match.round}` };
    }

    if (awayId && !derived[awayId]) {
      derived[awayId] = { status: "in_race", note: `${match.round}` };
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

function updateCounters(tournament) {
  const teams = Object.values(tournament);

  inRaceCount.textContent = teams.filter(team =>
    team.status === "in_race"
  ).length;

  outCount.textContent = teams.filter(team =>
    team.status === "out"
  ).length;
}

function findNextMatch(countryCode, matches) {
  return matches.find(match =>
    match.status === "scheduled" &&
    (match.home === countryCode || match.away === countryCode)
  );
}

function findLastMatch(countryCode, matches) {
  return [...matches].reverse().find(match =>
    match.status === "finished" &&
    (match.home === countryCode || match.away === countryCode)
  );
}

function renderCountryPanel(country, mapId, tournamentData, matches) {
  const nextMatch = findNextMatch(country.code, matches);
  const lastMatch = findLastMatch(country.code, matches);

  const opponentCode = nextMatch
    ? (nextMatch.home === country.code ? nextMatch.away : nextMatch.home)
    : null;

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
      <span>${prettyStatus(tournamentData?.status)}</span>
    </div>

    <div class="info-row">
      <strong>Map ID</strong>
      <span>${mapId}</span>
    </div>

    <div class="info-row">
      <strong>Next match</strong>
      <span>${nextMatch ? `${country.code} vs ${opponentCode}` : "—"}</span>
    </div>

    <div class="info-row">
      <strong>Round</strong>
      <span>${nextMatch ? nextMatch.round : "—"}</span>
    </div>

    <div class="info-row">
      <strong>Date</strong>
      <span>${nextMatch ? formatDate(nextMatch.date) : "—"}</span>
    </div>

    <div class="info-row">
      <strong>Last match</strong>
      <span>
  ${lastMatch
    ? `${lastMatch.home} ${lastMatch.homeScore ?? ""} - ${lastMatch.awayScore ?? ""} ${lastMatch.away}`
    : "—"}
</span>
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

      renderCountryPanel(country, d.id, tournamentData, matches);
    });
}

loadData().then(({ world, countries, tournament, matches }) => {
  const codeToMapId = buildCountryCodeIndex(countries);
  const derivedTournament = deriveTournamentFromMatches(tournament, matches, codeToMapId);

  updateCounters(derivedTournament);
  drawMap(world, countries, derivedTournament, matches);
});
