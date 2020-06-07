document.addEventListener("DOMContentLoaded", main);
let name;

function main() {
    parseName(); 
    createHeading("(All Time)");
    addRankNumbersToTable();
    normalizeArtistNames();
    addEventListenersToButtons();
    addHiddenInputForPlaylistTime();
}

function parseName() {
    const headingText = document.querySelector("h4").textContent;
    name = headingText.split(" Top Spotify")[0];
}

function addRankNumbersToTable() {
    const trackRanks = document.querySelectorAll(".track-rank");
    for (let i = 0; i < trackRanks.length; i++) {
        trackRanks[i].innerText = i + 1;
    }
}

function normalizeArtistNames() {
    const trackArtists = document.querySelectorAll(".track-artist");
    for (let i=0; i < trackArtists.length; i++) {
        const artists = trackArtists[i];
        artists.textContent = artists.textContent.split(',').join(', ');
    }
}

function addEventListenersToButtons() {
    document.querySelector("#long_term").addEventListener("click", timeQuery);
    document.querySelector("#medium_term").addEventListener("click", timeQuery);
    document.querySelector("#short_term").addEventListener("click", timeQuery);
    document.querySelector("#create-playlist").addEventListener("click", createSpotifyPlaylist);
}

function addHiddenInputForPlaylistTime() {
    const playlistTime = createElement("input", { type: "hidden", value: "(All Time)", id: "time-for-playlist-creation" });
    document.body.appendChild(playlistTime);
}

async function timeQuery() {
    this.classList.add("active-time");
    const playlistTime = document.querySelector("#time-for-playlist-creation");
    
    switch (this.id) {
        case "long_term":
            createHeading("(All Time)");
            deactivateTimeFilters(["medium_term", "short_term"]);
            playlistTime.value = "(All Time)";
            break;
        case "medium_term":
            createHeading("(Last 6 Months)");
            deactivateTimeFilters(["long_term", "short_term"]);
            playlistTime.value = "(Last 6 Months)";
            break;
        case "short_term":
            createHeading("(Last Month)");
            deactivateTimeFilters(["medium_term", "long_term"]);
            playlistTime.value = "(Last Month)";
            break;
    }

    //* https://metrify-me.herokuapp.com
    const rawRes = await fetch(`http://localhost:3000/get-metric?target=tracks&timeRange=${this.id}`, { method: 'GET' });
    const res = await rawRes.json();   
    reCreateTable(res);
}

function deactivateTimeFilters(timeFilters) {
    for (const timeFilter of timeFilters) {
        document.querySelector(`#${timeFilter}`)
        .classList.remove("active", "active-time")
    }
}

async function createSpotifyPlaylist() {
    const timeRange = document.querySelector("#time-for-playlist-creation").value;
    const spotifyTrackIDs = [...document.querySelectorAll(".track-title")].map(track => track.id);

    //*  https://metrify-me.herokuapp.com
    const rawRes = await fetch("http://localhost:3000/create-top-tracks-playlist", {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ spotifyTrackIDs, timeRange })
    });
    const res = await rawRes.json();   
    
    document.querySelector("#create-playlist-result").innerText = res;
    document.querySelector("#show-modal-button").click();
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

function createHeading(timeFilterText) {
    const prevHeading = document.querySelector("h4");
    const prevHeadingParent = prevHeading.parentNode;
    prevHeadingParent.removeChild(prevHeading);

    const headingText = `${name} Top Spotify Tracks ${timeFilterText}`
    const newHeading = createElement("h4", { class: "page-heading metric-heading animated bounceIn" }, headingText);
    prevHeadingParent.insertBefore(newHeading, document.querySelector("#top-tracks-row"));
}

function removeTable() {
    const table = document.querySelector("table");
    const parent = table.parentNode;
    parent.removeChild(table);
}

function createTable(tableData) {
    const table = createElement("table", { class: "table table-striped animated fadeInUpBig fast", id: "tracks-table" });
    const thead = createElement("thead");
    const tr = createElement("tr");
    const thRank = createElement("th", {scope: "col"}, "Rank");
    const thTitle = createElement("th", {scope: "col"}, "Title");
    const thArtists = createElement("th", {scope: "col"}, "Artists");
    tr.appendChild(thRank);
    tr.appendChild(thTitle);
    tr.appendChild(thArtists);
    thead.appendChild(tr);
    table.appendChild(thead);

    const tableBody = createElement("tbody");
    for (const track of tableData) {
        const trackRow = createElement("tr");
        const trackRank = createElement("td", { class: "track-rank", scope:"row" });
        const trackName = createElement("td", { class: "track-title", id: track.spotifyID }, track.title);
        const trackArtists = createElement("td", { class: "track-artist" }, track.artists);
        trackRow.appendChild(trackRank);
        trackRow.appendChild(trackName);
        trackRow.appendChild(trackArtists);
        tableBody.appendChild(trackRow);
    }

    table.appendChild(tableBody);
    document.querySelector("#table-container").appendChild(table);
    normalizeArtistNames();
    addRankNumbersToTable();
}

function reCreateTable(tableData) {
    removeTable();
    createTable(tableData);
}
