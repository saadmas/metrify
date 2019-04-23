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
            // update heading 
            document.querySelector("h3").innerText = "My Top Spotify Tracks (All Time)";
            deActivateBtns(["medium_term", "short_term"]);
            timeForPlaylistCreation.value = "(All Time)";
            break;
        case "medium_term":
            // update heading 
            document.querySelector("h3").innerText = "My Top Spotify Tracks (Last 6 Months)";
            deActivateBtns(["long_term", "short_term"]);
            timeForPlaylistCreation.value = "(Last 6 Months)";
            break;
        case "short_term":
            // update heading 
            document.querySelector("h3").innerText = "My Top Spotify Tracks (Last Month)";
            deActivateBtns(["medium_term", "long_term"]);
            timeForPlaylistCreation.value = "(Last Month)";
            break;
    }

    //* https://metrify-me.herokuapp.com/get-metric?target=tracks&timeRange=${this.id}
    const rawRes = await fetch(`http://localhost:3000/get-metric?target=tracks&timeRange=${this.id}`, {method: 'GET'});
    const res = await rawRes.json();   

    // update table body //
    
    // remove old body
    const tableBody = document.querySelector("tbody");
    tableBody.parentNode.removeChild(tableBody);

    // create new body
    const table = document.querySelector("table");
    const newBody = createElement("tbody");
    
    // fill in new body with new data
    for (let i=0; i<res.length; i++) {
        const currTrack = res[i];

        const tr = createElement("tr");

        const thRank = createElement("th", {class: "track-rank", scope:"row"});

        const tdTrack = createElement("td", {class: "track-title", id: currTrack.spotifyID});
        tdTrack.innerText = currTrack.title;

        const tdArtists = createElement("td", {class: "track-artist"});
        tdArtists.innerText = currTrack.artists;

        tr.appendChild(thRank);
        tr.appendChild(tdTrack);
        tr.appendChild(tdArtists);
        newBody.appendChild(tr);
    }

    table.appendChild(newBody);
    addRankNumbersToTable();
    
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
    const modalBody = document.querySelector(".modal-body");
    modalBody.innerText = resText;

    const modalShowBtn = document.querySelector("#show-modal-button");
    modalShowBtn.click();
}

function createElement(elemName, attrs) {
    const resultElem = document.createElement(elemName);
    
    for (const key in attrs) {
        resultElem.setAttribute(key, attrs[key]);
    }

    return resultElem;
}