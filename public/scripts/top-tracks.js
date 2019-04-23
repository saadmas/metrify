document.addEventListener("DOMContentLoaded", main);

function main() {
    addRankNumbersToTable();
    init_timeQueryBtns();
    init_CreatePlayListBtn();
}

function addRankNumbersToTable() {
    const arr = document.querySelectorAll(".track-rank");
    for (let i = 0; i < arr.length; i++) {
        arr[i].innerText = i+1;
    }

}

function init_timeQueryBtns() {

    // all time
    const longTermQuery = document.querySelector("#long_term");
    longTermQuery.addEventListener("click",timeQuery);

    // last 6 months
    const mediumTermQuery = document.querySelector("#medium_term");
    mediumTermQuery.addEventListener("click",timeQuery);

    // last month
    const shortTermQuery = document.querySelector("#short_term");
    shortTermQuery.addEventListener("click",timeQuery);

    // page is loaded with all time tracks - so set create playlist btn input to that
    const timeForPlaylistCreation = createElement("input", {type: "hidden", value: "(All Time)", id: "time-for-playlist-creation"});
    document.body.appendChild(timeForPlaylistCreation);

}

async function timeQuery() {

    // set create playlist button functionality
    const timeForPlaylistCreation = document.querySelector("#time-for-playlist-creation");
    switch (this.id) {
        case "long_term":
            reCreateHeading("My Top Spotify Tracks (All Time)");
            deActivateBtns(["medium_term", "short_term"]);
            timeForPlaylistCreation.value = "(All Time)";
            break;
        case "medium_term":
            reCreateHeading("My Top Spotify Tracks (Last 6 Months)");
            deActivateBtns(["long_term", "short_term"]);
            timeForPlaylistCreation.value = "(Last 6 Months)";
            break;
        case "short_term":
            reCreateHeading("My Top Spotify Tracks (Last Month)");
            deActivateBtns(["medium_term", "long_term"]);
            timeForPlaylistCreation.value = "(Last Month)";
            break;
    }

    //* https://metrify-me.herokuapp.com/get-metric?target=tracks&timeRange=${this.id}
    const rawRes = await fetch(`http://localhost:3000/get-metric?target=tracks&timeRange=${this.id}`, {method: 'GET'});
    const res = await rawRes.json();   

    // update table body //
    reCreateTable(res);
}

function deActivateBtns(arr) {
    for (let i=0; i<arr.length; i++) {
        const btn = document.querySelector("#"+arr[i]);
        btn.classList.remove("active");
    }
}

function init_CreatePlayListBtn() {
    const createPlaylistBtn = document.querySelector("#create-playlist");
    createPlaylistBtn.addEventListener("click", createSpotifyPlaylist);
}

async function createSpotifyPlaylist() {

    const trackIDs = [];
    const trackElems = document.querySelectorAll(".track-title");

    for (track of trackElems) {
        trackIDs.push(track.id);
    }

    const timeRange = document.querySelector("#time-for-playlist-creation").value;


    //* change url b/w herokou and local  https://metrify-me.herokuapp.com/create-top-tracks-playlist
    const res = await fetch("http://localhost:3000/create-top-tracks-playlist", {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({spotifyTrackIDs: trackIDs, timeRange: timeRange})
        });
    const resText = await res.json();   
    
    // show result in modal
    const modalBody = document.querySelector("#create-playlist-result");
    modalBody.innerText = resText;

    const modalShowBtn = document.querySelector("#show-modal-button");
    modalShowBtn.click();
}

function createElement(elemName, attrs, txt) {
    const resultElem = document.createElement(elemName);
    
    for (const key in attrs) {
        resultElem.setAttribute(key, attrs[key]);
    }

    if (txt) {
        resultElem.innerText = txt;
    }

    return resultElem;
}

function reCreateHeading(txt) {
    // remove old heading
    const prevHeading = document.querySelector("h3");
    const parent = prevHeading.parentNode;
    parent.removeChild(prevHeading);

    // create new heading
    const newHeading = createElement("h3", {class: "page-heading metric-heading animated bounceIn"}, txt);
    parent.insertBefore(newHeading, document.querySelector("#top-tracks-row"));
}

function reCreateTable(data) {

    // remove old table
    const table = document.querySelector("table");
    const parent = table.parentNode;
    parent.removeChild(table);

    // create new table
    const newTable = createElement("table", {class: "table table-striped"});
    
    const thead = createElement("thead", {class: "page-heading metric-heading animated fadeInUpBig fast"});
    const tr = createElement("tr");
    const th1 = createElement("th", {scope: "col"}, "Rank");
    const th2 = createElement("th", {scope: "col"}, "Title");
    const th3 = createElement("th", {scope: "col"}, "Artists");
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    thead.appendChild(tr);
    newTable.appendChild(thead);

    const newBody = createElement("tbody", {class: "page-heading metric-heading animated fadeInUpBig fast"});
    
    // fill in new body with new data
    for (let i=0; i<data.length; i++) {
        const currTrack = data[i];

        const tr = createElement("tr");

        const thRank = createElement("th", {class: "track-rank", scope:"row"});

        const tdTrack = createElement("td", {class: "track-title", id: currTrack.spotifyID}, currTrack.title);

        const tdArtists = createElement("td", {class: "track-artist"}, currTrack.artists);

        tr.appendChild(thRank);
        tr.appendChild(tdTrack);
        tr.appendChild(tdArtists);
        newBody.appendChild(tr);
    }

    newTable.appendChild(newBody);
    document.querySelector("#table-container").appendChild(newTable);
    addRankNumbersToTable();
}