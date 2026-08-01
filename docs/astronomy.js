window.Astronomy = (() => {
  const RAD = Math.PI / 180;
  const DEG = 180 / Math.PI;

  function toRadians(degrees) {
    return degrees * RAD;
  }

  function toDegrees(radians) {
    return radians * DEG;
  }

  function getJulianDate(date = new Date()) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function getJulianCentury(date = new Date()) {
    return (getJulianDate(date) - 2451545.0) / 36525;
  }

  function normalizeDegrees(degrees) {
    return ((degrees % 360) + 360) % 360;
  }

  function getSolarCoordinates(date = new Date()) {
    const julianDate = getJulianDate(date);
    const daysSinceJ2000 = julianDate - 2451545.0;

    const meanLongitude = normalizeDegrees(
      280.460 + 0.9856474 * daysSinceJ2000
    );

    const meanAnomaly = normalizeDegrees(
      357.528 + 0.9856003 * daysSinceJ2000
    );

    const eclipticLongitude = normalizeDegrees(
      meanLongitude +
      1.915 * Math.sin(toRadians(meanAnomaly)) +
      0.020 * Math.sin(toRadians(2 * meanAnomaly))
    );

    const obliquity =
      23.439 - 0.0000004 * daysSinceJ2000;

    const rightAscension = toDegrees(
      Math.atan2(
        Math.cos(toRadians(obliquity)) *
          Math.sin(toRadians(eclipticLongitude)),
        Math.cos(toRadians(eclipticLongitude))
      )
    );

    const declination = toDegrees(
      Math.asin(
        Math.sin(toRadians(obliquity)) *
          Math.sin(toRadians(eclipticLongitude))
      )
    );

    const greenwichMeanSiderealTime = normalizeDegrees(
      280.46061837 +
      360.98564736629 * daysSinceJ2000
    );

    let longitude = normalizeDegrees(
      rightAscension - greenwichMeanSiderealTime
    );

    if (longitude > 180) {
      longitude -= 360;
    }

    return {
      longitude,
      latitude: declination
    };
  }

function getTerminatorCoordinates(date = new Date(), stepDegrees = 2) {
  const solarPosition = getSolarCoordinates(date);

  const solarLongitude = toRadians(solarPosition.longitude);
  const solarLatitude = toRadians(solarPosition.latitude);

  // Eenheidsvector in de richting van de zon.
  const sunVector = [
    Math.cos(solarLatitude) * Math.cos(solarLongitude),
    Math.cos(solarLatitude) * Math.sin(solarLongitude),
    Math.sin(solarLatitude)
  ];

  // Eerste vector loodrecht op de zonrichting.
  let perpendicularA = [
    sunVector[1],
    -sunVector[0],
    0
  ];

  const lengthA = Math.hypot(...perpendicularA);

  if (lengthA < 0.000001) {
    perpendicularA = [1, 0, 0];
  } else {
    perpendicularA = perpendicularA.map(value => value / lengthA);
  }

  // Tweede loodrechte vector.
  const perpendicularB = [
    sunVector[1] * perpendicularA[2] -
      sunVector[2] * perpendicularA[1],

    sunVector[2] * perpendicularA[0] -
      sunVector[0] * perpendicularA[2],

    sunVector[0] * perpendicularA[1] -
      sunVector[1] * perpendicularA[0]
  ];

  const coordinates = [];

  for (let angle = 0; angle <= 360; angle += stepDegrees) {
    const radians = toRadians(angle);

    const x =
      perpendicularA[0] * Math.cos(radians) +
      perpendicularB[0] * Math.sin(radians);

    const y =
      perpendicularA[1] * Math.cos(radians) +
      perpendicularB[1] * Math.sin(radians);

    const z =
      perpendicularA[2] * Math.cos(radians) +
      perpendicularB[2] * Math.sin(radians);

    coordinates.push([
      toDegrees(Math.atan2(y, x)),
      toDegrees(Math.asin(z))
    ]);
  }

  return coordinates;
}

  return {
    toRadians,
    toDegrees,
    getJulianDate,
    getJulianCentury,
    getSolarCoordinates,
    getTerminatorCoordinates
  };
})();