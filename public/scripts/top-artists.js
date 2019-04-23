document.addEventListener("DOMContentLoaded", main);

function main() {
    addRankNumbersToTable();
    init_timeQueryBtns();
}

function addRankNumbersToTable() {
    const arr = document.querySelectorAll(".artist-rank");
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
}

async function timeQuery() {

    
    //* https://metrify-me.herokuapp.com/get-metric?target=tracks&timeRange=${this.id}
    const rawRes = await fetch(`http://localhost:3000/get-metric?target=artists&timeRange=${this.id}`, {method: 'GET'});
    const res = await rawRes.json();   

    switch (this.id) {
        case "long_term":
            // update heading 
            document.querySelector("h3").innerText = "My Top Spotify Artists (All Time)";
            deActivateBtns(["medium_term", "short_term"]);
            break;
        case "medium_term":
            // update heading 
            document.querySelector("h3").innerText = "My Top Spotify Artists (Last 6 Months)";
            deActivateBtns(["long_term", "short_term"]);
            break;
        case "short_term":
            // update heading 
            document.querySelector("h3").innerText = "My Top Spotify Artists (Last Month)";
            deActivateBtns(["medium_term", "long_term"]);
            break;
    }

    // update table body //
    
    // remove old body
    const tableBody = document.querySelector("tbody");
    tableBody.parentNode.removeChild(tableBody);

    // create new body
    const table = document.querySelector("table");
    const newBody = createElement("tbody");
    
    // fill in new body with new data
    for (let i=0; i<res.length; i++) {
        const currArtist = res[i];

        const tr = createElement("tr");

        const thRank = createElement("th", {class: "artist-rank", scope:"row"});

        const tdArtist = createElement("td", {class: "artist-name", id: currArtist.spotifyID});
        tdArtist.innerText = currArtist.name;


        tr.appendChild(thRank);
        tr.appendChild(tdArtist);
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

function createElement(elemName, attrs) {
    const resultElem = document.createElement(elemName);
    
    for (const key in attrs) {
        resultElem.setAttribute(key, attrs[key]);
    }

    return resultElem;
}