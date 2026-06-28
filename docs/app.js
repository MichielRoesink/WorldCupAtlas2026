const mapContainer = document.querySelector(".map-placeholder");
const countryPanel = document.getElementById("country-panel");
const inRaceCount = document.getElementById("in-race-count");
const outCount = document.getElementById("out-count");
const tooltip = document.getElementById("tooltip");

const statusColors = {
  host: "#15803d",
  qualified: "#15803d",
  in_race: "#15803d",
  out: "#dc2626",
  not_participating: "#e5e7eb",
  unknown: "#e5e7eb"
};

function prettyStatus(status) {
  if (!status) return "Not participating";
  return status.replace("_", " ");
}

async function loadData() {
  const [world, countries, tournament] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.json("data/countries.json"),
    d3.json("data/tournaments/world-cup-2026.json")
  ]);

  return { world, countries, tournament };
}

function updateCounters(tournament) {
  const teams = Object.values(tournament);

  inRaceCount.textContent = teams.filter(team =>
    team.status === "host" ||
    team.status === "qualified" ||
    team.status === "in_race"
  ).length;

  outCount.textContent = teams.filter(team => team.status === "out").length;
}

function drawMap(world, countries, tournament) {
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
        `;
        return;
      }

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
          <strong>Confederation</strong>
          <span>${country.confederation || "Unknown"}</span>
        </div>

        <div class="info-row">
          <strong>World Cup 2026</strong>
          <span>${tournamentData ? tournamentData.note : "No active campaign"}</span>
        </div>
      `;
    });
}

loadData().then(({ world, countries, tournament }) => {
  updateCounters(tournament);
  drawMap(world, countries, tournament);
});