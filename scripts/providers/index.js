const worldcup26 = require("./worldcup26");
const fifa = require("./fifa");
const apiFootball = require("./apiFootball");

function getProvider(name) {

    switch(name){

        case "worldcup26":
            return worldcup26;
        
        case "fifa":
            return fifa;

        case "apiFootball":
            return apiFootball;

        default:
            throw new Error(`Unknown provider: ${name}`);

    }

}

module.exports = {
    getProvider
};