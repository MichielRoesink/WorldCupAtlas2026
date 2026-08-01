window.DayNightLayer = (() => {
  function render({ zoomLayer, path, date = new Date() }) {
    if (!window.Astronomy) {
      console.warn("DayNightLayer: Astronomy is niet geladen.");
      return;
    }

    zoomLayer.selectAll(".day-night-layer").remove();

    const coordinates =
      window.Astronomy.getTerminatorCoordinates(date, 1);

    const terminatorLine = {
      type: "LineString",
      coordinates
    };

    const layer = zoomLayer
      .append("g")
      .attr("class", "day-night-layer")
      .attr("pointer-events", "none");

    layer
      .append("path")
      .datum(terminatorLine)
      .attr("class", "day-night-terminator")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "rgba(255, 255, 255, 0.9)")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");
  }

  return {
    render
  };
})();