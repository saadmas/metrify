document.addEventListener("DOMContentLoaded", main);
let name;

function main() {

    parseName(document.querySelector("#user-name").innerText);
    createHeading("(All Time)");
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
    this.classList.add("active-time");

    //* https://metrify-me.herokuapp.com/get-metric?target=tracks&timeRange=${this.id}
    const rawRes = await fetch(`http://localhost:3000/get-metric?target=artists&timeRange=${this.id}`, {method: 'GET'});
    const res = await rawRes.json();   
    /// 
    console.log("ID: "+this.id);
    switch (this.id) {
        case "long_term":
            createHeading("(All Time)");
            deActivateBtns(["medium_term", "short_term"]);
            break;
        case "medium_term":
            createHeading("(Last 6 Months)");
            deActivateBtns(["long_term", "short_term"]);
            break;
        case "short_term":
            createHeading("(Last Month)");
            deActivateBtns(["medium_term", "long_term"]);
            break;
    }


    reCreateTable(res);
}

function deActivateBtns(arr) {
    ///
    console.log(arr);
    for (let i=0; i<arr.length; i++) {
        const btn = document.querySelector("#"+arr[i]);
        btn.classList.remove("active");
        btn.classList.remove("active-time");
    }
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

function parseName (rawName) {
    if (rawName==="no-name") {
        name = "My";
    } else if (rawName[rawName.length-1]==="s") {
        name = rawName+"'"
    } else {
        name = rawName+"'s";
    }
}

function createHeading(txt) {
    // remove old heading
    const prevHeading = document.querySelector("h3");
    const parent = prevHeading.parentNode;
    parent.removeChild(prevHeading);

    // create new heading
    const newHeading = createElement("h3", {class: "page-heading metric-heading animated bounceIn"}, name+" Top Spotify Artists "+txt);
    parent.insertBefore(newHeading, document.querySelector("#top-artists-row"));
}

function reCreateTable(data) {

    // remove old table
    const table = document.querySelector("table");
    const parent = table.parentNode;
    parent.removeChild(table);

    // create new table
    const newTable = createElement("table", {class: "table table-striped animated fadeInUpBig fast"});
    
    const thead = createElement("thead");
    const tr = createElement("tr");
    const th1 = createElement("th", {scope: "col"}, "Rank");
    const th2 = createElement("th", {scope: "col"}, "Name");
    tr.appendChild(th1);
    tr.appendChild(th2);
    thead.appendChild(tr);
    newTable.appendChild(thead);

    const newBody = createElement("tbody");
    // fill in new body with new data
    for (let i=0; i<data.length; i++) {
        const currArtist = data[i];

        const tr = createElement("tr");
        const thRank = createElement("th", {class: "artist-rank", scope:"row"});
        const tdArtist = createElement("td", {id: currArtist.spotifyID}, currArtist.name);
        
        tr.appendChild(thRank);
        tr.appendChild(tdArtist);
        newBody.appendChild(tr);
    }

    newTable.appendChild(newBody);
    document.querySelector("#table-container").appendChild(newTable);
    addRankNumbersToTable();
}
