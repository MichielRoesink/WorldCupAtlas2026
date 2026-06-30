const fs = require("fs");
const path = require("path");

function writeJson(folder, filename, data) {
  fs.mkdirSync(folder, { recursive: true });

  fs.writeFileSync(
    path.join(folder, filename),
    JSON.stringify(data, null, 2)
  );

  console.log(`Published ${filename}`);
}

function publish(data, outputFolder) {

  if (data.results) {
    writeJson(outputFolder, "results.json", data.results);
  }

  if (data.matches) {
    writeJson(outputFolder, "matches.json", data.matches);
  }

  if (data.teams) {
    writeJson(outputFolder, "teams.json", data.teams);
  }

  if (data.tournament) {
    writeJson(outputFolder, "tournament.json", data.tournament);
  }
  
  if (data.preview) {
  writeJson(outputFolder, "preview.json", data.preview);
}

}

module.exports = {
  publish
};