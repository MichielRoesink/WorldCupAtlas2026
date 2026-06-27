const mapContainer = document.querySelector(".map-placeholder");
const countryPanel = document.getElementById("country-panel");

const statusColors = {
  host: "#2e7d32",
  qualified: "#2e7d32",
  alive: "#facc15",
  eliminated: "#d1d5db",
  unknown: "#e5e7eb"
};

async function loadData() {
  const [world, countryStatus] = await Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.json("data/countries.json")
  ]);

  return { world, countryStatus };
}

function drawMap(world, countryStatus) {
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
      const data = countryStatus[d.id];
      const status = data ? data.status : "unknown";
      return statusColors[status] || statusColors.unknown;
    })
    .on("click", (event, d) => {
      const country = countryStatus[d.id];

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

loadData().then(({ world, countryStatus }) => {
  drawMap(world, countryStatus);
});