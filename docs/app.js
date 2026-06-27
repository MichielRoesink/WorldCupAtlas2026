const mapContainer = document.querySelector(".map-placeholder");
const countryPanel = document.getElementById("country-panel");
const inRaceCount = document.getElementById("in-race-count");
const outCount = document.getElementById("out-count");

const statusColors = {
  host: "#15803d",
  qualified: "#15803d",
  in_race: "#15803d",
  out: "#dc2626",
  not_participating: "#e5e7eb",
  unknown: "#e5e7eb"
};

async function loadData() {
  const [world, countries, tournament] = await Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  d3.json("data/countries.json"),
  d3.json("data/tournaments/world-cup-2026.json")
]);

return { world, countries, tournament };
}

function drawMap(world, tournament) {
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

  const countries = topojson.feature(world, world.objects.countries);

  svg.selectAll("path")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "country")
     .attr("fill", d => {
      const data = tournament[d.id];
      const status = data ? data.status : "unknown";
      return statusColors[status] || statusColors.unknown;
    })
    .on("click", (event, d) => {
      const country = tournament[d.id];

      if (!country) {
        countryPanel.innerHTML = `
          <h2>Unknown country</h2>
          <p>No data available yet.</p>
        `;
        return;
      }

      countryPanel.innerHTML = `
    <h2>${country.flag} ${country.name}</h2>
    <p><strong>Status</strong><br>${country.status}</p>
    <p><strong>Confederation</strong><br>${country.confederation}</p>
    <p>${country.note}</p>
`;
    });
}
loadData().then(({ world, countries, tournament }) => {

    const tournamentCountries = Object.values(tournament);

    const inRace = tournamentCountries.filter(country =>
        country.status === "host" ||
        country.status === "in_race" ||
        country.status === "qualified"
    ).length;

    const out = tournamentCountries.filter(country =>
        country.status === "out"
    ).length;

    inRaceCount.textContent = inRace;
    outCount.textContent = out;

    drawMap(world, tournament);

});