document.addEventListener("DOMContentLoaded", main);
let name;

function main() {
    parseName();
    createHeading("(All Time)");
    addRankNumbersToTable();
    addEventListenersToTimeQueryButtons();
}

function addRankNumbersToTable() {
    const artistRanks = document.querySelectorAll(".artist-rank");
    for (let i = 0; i < artistRanks.length; i++) {
        artistRanks[i].innerText = i + 1;
    }
}

function addEventListenersToTimeQueryButtons() {
    document.querySelector("#long_term").addEventListener("click", timeQuery);
    document.querySelector("#medium_term").addEventListener("click", timeQuery);
    document.querySelector("#short_term").addEventListener("click", timeQuery);
}

async function timeQuery() {
    this.classList.add("active-time");
    //*   https://metrify-me.herokuapp.com
    const rawRes = await fetch(`http://localhost:3000/get-metric?target=artists&timeRange=${this.id}`, { method: 'GET' });
    const res = await rawRes.json();   

    switch (this.id) {
        case "long_term":
            createHeading("(All Time)");
            deactivateTimeFilters(["medium_term", "short_term"]);
            break;
        case "medium_term":
            createHeading("(Last 6 Months)");
            deactivateTimeFilters(["long_term", "short_term"]);
            break;
        case "short_term":
            createHeading("(Last Month)");
            deactivateTimeFilters(["medium_term", "long_term"]);
            break;
    }

    recreateTable(res);
}

function deactivateTimeFilters(timeFilters) {
    for (const timeFilter of timeFilters) {
        document.querySelector(`#${timeFilter}`)
        .classList.remove("active", "active-time")
    }
}

function createElement(elementName, attrs, text) {
    const elem = document.createElement(elementName);

    for (const key in attrs) {
        elem.setAttribute(key, attrs[key]);
    }

    if (text) {
        elem.innerText = text;
    }

    return elem;
}

function parseName() {
    const headingText = document.querySelector("h3").textContent;
    name = headingText.split(" Top Spotify")[0];
}

function createHeading(timeFilterText) {
    const prevHeading = document.querySelector("h3");
    const prevHeadingParent = prevHeading.parentNode;
    prevHeadingParent.removeChild(prevHeading);

    const headingText = `${name} Top Spotify Artists ${timeFilterText}`
    const newHeading = createElement("h3", { class: "page-heading metric-heading" }, headingText);
    prevHeadingParent.insertBefore(newHeading, document.querySelector("#top-artists-row"));
}

function removeTable() {
    const table = document.querySelector("table");
    const tableParent = table.parentNode;
    tableParent.removeChild(table);
}

function createTable(tableData) {
    const table = createElement("table", { class: "table table-striped" });    
    const thead = createElement("thead");
    const tr = createElement("tr");
    const thRank = createElement("th", { scope: "col", class: 'rank-col-artist' }, "Rank");
    const thName = createElement("th", { scope: "col" }, "Name");
    tr.appendChild(thRank);
    tr.appendChild(thName);
    thead.appendChild(tr);
    table.appendChild(thead);

    const tableBody = createElement("tbody");
    for (const artist of tableData) {
        const artistRow = createElement("tr");
        const artistRank = createElement("td", { class: "artist-rank", scope:"row" });
        const artistName = createElement("td", { id: artist.spotifyID }, artist.name);
        artistRow.appendChild(artistRank);
        artistRow.appendChild(artistName);
        tableBody.appendChild(artistRow);
    }

    table.appendChild(tableBody);
    document.querySelector("#table-container").appendChild(table);
    addRankNumbersToTable();
}

function recreateTable(tableData) {
    removeTable();
    createTable(tableData);
}
