document.addEventListener('DOMContentLoaded', main);
let name;

function main() {
  parseName();
  addRankNumbersToTable();
  normalizeArtistNames();
  addEventListenersToButtons();
  addEventListenersToTrackRows();
  addHiddenInputForPlaylistTime();
}

function parseName() {
  const headingText = document.querySelector('h4').textContent;
  name = headingText.split(' Top Spotify')[0];
}

function addRankNumbersToTable() {
  const trackRanks = document.querySelectorAll('.track-rank');
  for (let i = 0; i < trackRanks.length; i++) {
    trackRanks[i].innerText = i + 1;
  }
}

function normalizeArtistNames() {
  const trackArtists = document.querySelectorAll('.track-artist');
  for (let i = 0; i < trackArtists.length; i++) {
    const artists = trackArtists[i];
    artists.textContent = artists.textContent.split(',').join(', ');
  }
}

function addEventListenersToButtons() {
  document.querySelector('#long_term').addEventListener('click', timeQuery);
  document.querySelector('#medium_term').addEventListener('click', timeQuery);
  document.querySelector('#short_term').addEventListener('click', timeQuery);
  document.querySelector('#create-playlist').addEventListener('click', createSpotifyPlaylist);
}

function addEventListenersToTrackRows() {
  const dataRows = [...document.querySelectorAll('tr')].splice(1);
  for (const dataRow of dataRows) {
    dataRow.addEventListener('click', goToTrackPage);
  }
}

function goToTrackPage() {
  document.location = `track/${this.id}`;
}

function addHiddenInputForPlaylistTime() {
  const playlistTime = createElement('input', {
    type: 'hidden',
    value: '(All Time)',
    id: 'time-for-playlist-creation',
  });
  document.body.appendChild(playlistTime);
}

async function timeQuery() {
  toggleLoader(true);
  this.classList.add('active-time');
  const playlistTime = document.querySelector('#time-for-playlist-creation');

  switch (this.id) {
    case 'long_term':
      deactivateTimeFilters(['medium_term', 'short_term']);
      playlistTime.value = '(All Time)';
      break;
    case 'medium_term':
      deactivateTimeFilters(['long_term', 'short_term']);
      playlistTime.value = '(Last 6 Months)';
      break;
    case 'short_term':
      deactivateTimeFilters(['medium_term', 'long_term']);
      playlistTime.value = '(Last Month)';
      break;
  }

  removeTable();
  const rawRes = await fetch(`/get-metric?target=tracks&timeRange=${this.id}`, { method: 'GET' });
  const res = await rawRes.json();
  setTimeout(() => createTable(res), 300);
}

function deactivateTimeFilters(timeFilters) {
  for (const timeFilter of timeFilters) {
    document.querySelector(`#${timeFilter}`).classList.remove('active', 'active-time');
  }
}

async function createSpotifyPlaylist() {
  const timeRange = document.querySelector('#time-for-playlist-creation').value;
  const dataRows = [...document.querySelectorAll('tr')].splice(1);
  const spotifyTrackIDs = dataRows.map(track => track.id);

  const rawRes = await fetch('/create-top-tracks-playlist', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ spotifyTrackIDs, timeRange }),
  });
  const res = await rawRes.json();

  document.querySelector('#create-playlist-result').innerText = res;
  document.querySelector('#show-modal-button').click();
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

function removeTable() {
  const table = document.querySelector('table');
  const parent = table.parentNode;
  parent.removeChild(table);
  if (window.innerWidth > 420) {
    document.body.style.overflowY = 'scroll';
  }
}

function createTable(tableData) {
  const table = createElement('table', { class: 'table table-striped', id: 'tracks-table' });
  const thead = createElement('thead');
  const tr = createElement('tr');
  const thRank = createElement('th', { scope: 'col', class: 'rank-col-track' }, 'Rank');
  const thTitle = createElement('th', { scope: 'col' }, 'Title');
  const thArtists = createElement('th', { scope: 'col' }, 'Artists');
  tr.appendChild(thRank);
  tr.appendChild(thTitle);
  tr.appendChild(thArtists);
  thead.appendChild(tr);
  table.appendChild(thead);

  const tableBody = createElement('tbody');
  for (const track of tableData) {
    const trackRow = createElement('tr', { id: track.spotifyID, class: 'data-row' });
    trackRow.addEventListener('click', goToTrackPage);
    const trackRank = createElement('td', { class: 'track-rank', scope: 'row' });
    const trackName = createElement('td', { class: 'track-title' }, track.title);
    const trackArtists = createElement('td', { class: 'track-artist' }, track.artists);
    trackRow.appendChild(trackRank);
    trackRow.appendChild(trackName);
    trackRow.appendChild(trackArtists);
    tableBody.appendChild(trackRow);
  }

  table.appendChild(tableBody);

  toggleLoader(false);
  if (window.innerWidth > 420) {
    document.body.style.overflowY = 'auto';
  }

  document.querySelector('#table-container').appendChild(table);
  normalizeArtistNames();
  addRankNumbersToTable();
}

function toggleLoader(shouldShow) {
  const loader = document.querySelector('.loader');
  loader.style.display = shouldShow ? 'block' : 'none';
}
