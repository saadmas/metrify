document.addEventListener("DOMContentLoaded", main);

function main() {
    
    init_CreatePlayListBtn();
}

function init_CreatePlayListBtn() {
    const createPlaylistBtn = document.querySelector("#create-playlist");
    createPlaylistBtn.addEventListener("click", function() {
        createSpotifyPlaylist();
    });
}

async function createSpotifyPlaylist() {
    const trackIDs = [];
    const trackElems = document.querySelectorAll("ol");

    for (track of trackElems) {
        trackIDs.push(track.id);
    }

    const timeRange = document.querySelector("h1").id;
    ///
    console.log(timeRange);
    console.log(trackIDs);
    console.log(trackIDs.length);

    /// change url
    const res = await fetch("http://localhost:3000/create-top-tracks-playlist", {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({spotifyTrackIDs: trackIDs, timeRange: timeRange})
        });
    const content = await res.json();   
}