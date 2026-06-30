const fifa = require("./fifa");
const apiFootball = require("./apiFootball");

function getProvider(name) {

    switch(name){

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