async function get(url) {

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    return response.json();

}

module.exports = {
    get
};