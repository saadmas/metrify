document.addEventListener("DOMContentLoaded", main);
let name;

function main() {
    parseName();
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
            deactivateTimeFilters(["medium_term", "short_term"]);
            break;
        case "medium_term":
            deactivateTimeFilters(["long_term", "short_term"]);
            break;
        case "short_term":
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
        const artistRow = createElement("tr", { class: "data-row", id: artist.spotifyID });
        const artistRank = createElement("td", { class: "artist-rank", scope:"row" });
        const artistName = createElement("td", undefined, artist.name);
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
